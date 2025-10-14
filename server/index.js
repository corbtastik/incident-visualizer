// server/index.js (ESM, generic _id cursors)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'incidents';
const PORT = process.env.PORT || 4000;
const DEBUG = process.env.DEBUG_LIVE === '1';

// category -> collection
const collByCategory = {
  infrastructure: 'infrastructure_events',
};

/* ----------------------------- helpers ----------------------------- */

// Encode any _id into a string cursor.
// - ObjectId -> 24-hex
// - anything else -> JSON string (stable and reversible)
function encodeIdForCursor(id) {
  if (!id) return null;
  if (typeof id === 'object' && typeof id.toHexString === 'function') {
    return id.toHexString();
  }
  if (typeof id === 'object' && typeof id.$oid === 'string') {
    return id.$oid;
  }
  // Fallback: JSON string of the raw value (e.g., { "_data": "..." })
  try {
    return JSON.stringify(id);
  } catch {
    // Last resort: do NOT return String(id) (would become "[object Object]")
    return null;
  }
}

// Decode the cursor string back into a value usable in a MongoDB query.
function decodeCursorToId(cursor) {
  if (!cursor) throw new Error('Missing cursor');
  // Plain 24-hex ObjectId?
  if (typeof cursor === 'string' && /^[a-fA-F0-9]{24}$/.test(cursor)) {
    return new ObjectId(cursor);
  }
  // Otherwise expect JSON string for non-ObjectId _id
  try {
    const parsed = JSON.parse(cursor);
    return parsed; // raw value (e.g., { "_data": "..." })
  } catch {
    throw new Error('Invalid after cursor');
  }
}

function redact(uri) {
  return (uri || '').replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/i, '$1***:***@');
}

/* ------------------------------ server ----------------------------- */

async function main() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI in environment');
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  console.log('[BOOT] Connected', {
    uri: redact(MONGODB_URI),
    db: DB_NAME,
    collections: Object.entries(collByCategory).map(([k, v]) => `${k}:${v}`),
  });

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', async (_req, res) => {
    try {
      await db.command({ ping: 1 });
      res.json({ ok: 1 });
    } catch (e) {
      res.status(500).json({ ok: 0, error: e?.message });
    }
  });

  // Debug: show counts + min/max _id (as encoded cursors)
  app.get('/debug/:category', async (req, res) => {
    try {
      const { category } = req.params;
      const collName = collByCategory[category];
      if (!collName) return res.status(400).json({ error: 'Unsupported category' });

      const coll = db.collection(collName);
      const [estCount, exactCount, newestDoc, oldestDoc] = await Promise.all([
        coll.estimatedDocumentCount(),
        coll.countDocuments({}),
        coll.find({}, { projection: { _id: 1 } }).sort({ _id: -1 }).limit(1).toArray(),
        coll.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(1).toArray(),
      ]);

      const newestId = newestDoc[0]?._id ?? null;
      const oldestId = oldestDoc[0]?._id ?? null;

      res.json({
        namespace: `${DB_NAME}.${collName}`,
        estimatedDocumentCount: estCount,
        countDocuments: exactCount,
        newestId: encodeIdForCursor(newestId),
        oldestId: encodeIdForCursor(oldestId),
        serverTime: new Date().toISOString(),
      });
    } catch (e) {
      console.error('[DEBUG] error', e);
      res.status(500).json({ error: 'Debug failed', detail: e?.message });
    }
  });

  // Live tail endpoint using generic _id cursor
  app.get('/live/:category', async (req, res) => {
    const t0 = Date.now();
    try {
      const { category } = req.params;
      const { after, limit } = req.query;

      const collName = collByCategory[category];
      if (!collName) return res.status(400).json({ error: 'Unsupported category' });

      const coll = db.collection(collName);
      const max = Math.min(Number(limit) || 500, 5000);

      // Initialization: no 'after' -> start from newest existing doc
      if (!after) {
        const newestDoc = await coll
          .find({}, { projection: { _id: 1 } })
          .sort({ _id: -1 })
          .limit(1)
          .toArray();

        if (!newestDoc.length) {
          const payload = {
            items: [],
            nextCursor: null,
            empty: true,
            count: 0,
            serverTime: new Date().toISOString(),
          };
          if (DEBUG) console.log('[INIT empty]', payload);
          return res.json(payload);
        }

        const initCursor = encodeIdForCursor(newestDoc[0]._id);
        const payload = {
          items: [],
          nextCursor: initCursor, // start from "now"
          count: 0,
          serverTime: new Date().toISOString(),
        };
        if (DEBUG) console.log('[INIT ok]', payload);
        return res.json(payload);
      }

      // Parse 'after' back to a value suitable for {$gt: ...}
      let afterVal;
      try {
        afterVal = decodeCursorToId(after);
      } catch (e) {
        if (DEBUG) console.error('[ERROR] Invalid after', after);
        return res.status(400).json({ error: 'Invalid after cursor' });
      }

      // Strictly newer than 'after'
      const docs = await coll
        .find({ _id: { $gt: afterVal } }, { projection: { _id: 1, city: 1, lat: 1, lng: 1, weight: 1, sigmaKm: 1, serviceIssue: 1 } })
        .sort({ _id: 1 })
        .limit(max)
        .toArray();

      const items = docs.map(({ _id, ...rest }) => ({
        // we don't need to expose _id, but if you want it visible, encode it
        _id: encodeIdForCursor(_id),
        ...rest,
      }));

      const lastId = docs.length ? docs[docs.length - 1]._id : afterVal;
      const nextCursor = encodeIdForCursor(lastId);

      const payload = {
        items,
        nextCursor,
        count: items.length,
        serverTime: new Date().toISOString(),
      };
      if (DEBUG) {
        console.log(
          `[LIVE ${category}] after=${typeof afterVal?.toHexString === 'function' ? afterVal.toHexString() : JSON.stringify(afterVal)} ` +
          `count=${items.length} next=${nextCursor} in ${Date.now() - t0}ms`
        );
      }
      return res.json(payload);
    } catch (err) {
      console.error('GET /live error:', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.listen(PORT, () => console.log(`Live API on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
