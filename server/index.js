// server/index.js (ESM, ObjectId-only cursor)
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'incidents';
const PORT = process.env.PORT || 4000;
const DEBUG = process.env.DEBUG_LIVE === '1';

const collByCategory = {
  infrastructure: 'infrastructure_events',
};

function redact(uri) {
  return (uri || '').replace(/(mongodb\+srv:\/\/)([^:]+):([^@]+)@/i, '$1***:***@');
}

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

  // Optional debug: min/max _id
  app.get('/debug/:category', async (req, res) => {
    try {
      const collName = collByCategory[req.params.category];
      if (!collName) return res.status(400).json({ error: 'Unsupported category' });
      const coll = db.collection(collName);

      const [count, newest, oldest] = await Promise.all([
        coll.countDocuments({}),
        coll.find({}, { projection: { _id: 1 } }).sort({ _id: -1 }).limit(1).toArray(),
        coll.find({}, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(1).toArray(),
      ]);

      res.json({
        namespace: `${DB_NAME}.${collName}`,
        countDocuments: count,
        newestId: newest[0]?._id?.toHexString() || null,
        oldestId: oldest[0]?._id?.toHexString() || null,
        serverTime: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: 'Debug failed', detail: e?.message });
    }
  });

  // Live tail using ObjectId cursor
  app.get('/live/:category', async (req, res) => {
    try {
      const collName = collByCategory[req.params.category];
      if (!collName) return res.status(400).json({ error: 'Unsupported category' });

      const coll = db.collection(collName);
      const max = Math.min(Number(req.query.limit) || 500, 2000);
      const { after } = req.query;

      if (!after) {
        const newest = await coll.find({}, { projection: { _id: 1 } })
          .sort({ _id: -1 }).limit(1).toArray();

        if (!newest.length) {
          return res.json({ items: [], nextCursor: null, empty: true, count: 0, serverTime: new Date().toISOString() });
        }

        return res.json({
          items: [],
          nextCursor: newest[0]._id.toHexString(),
          count: 0,
          serverTime: new Date().toISOString(),
        });
      }

      let afterId;
      try {
        afterId = new ObjectId(after);
      } catch {
        return res.status(400).json({ error: 'Invalid after ObjectId' });
      }

      const docs = await coll.find(
        { _id: { $gt: afterId } },
        { projection: { _id: 1, city: 1, lat: 1, lng: 1, sigmaKm: 1, weight: 1, serviceIssue: 1, ts: 1 } }
      )
        .sort({ _id: 1 })
        .limit(max)
        .toArray();

      const items = docs.map(({ _id, ...rest }) => ({ _id: _id.toHexString(), ...rest }));
      const nextCursor = items.length ? items[items.length - 1]._id : afterId.toHexString();

      if (DEBUG) console.log(`[LIVE ${req.params.category}] sent=${items.length}`);

      res.json({ items, nextCursor, count: items.length, serverTime: new Date().toISOString() });
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
