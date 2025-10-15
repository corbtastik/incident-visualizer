// server/index.js (ESM)
import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import makeLiveRouter from "./routes/live.js";

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "incidents";
const PORT = process.env.PORT || 4000;

const collByCategory = {
  infrastructure: "infrastructure_events",
  business: "business_events",
  consumer: "consumer_events",
  federal: "federal_events",
  emerging_tech: "emerging_tech_events",
};

function redact(uri) {
  return (uri || "").replace(
    /(mongodb\+srv:\/\/)([^:]+):([^@]+)@/i,
    "$1***:***@"
  );
}

async function main() {
  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI in environment");
    process.exit(1);
  }

  // ---- Mongo boot ----
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  // tiny helper so routes don’t import the client directly
  function getDb(dbName = DB_NAME) {
    return client.db(dbName);
  }

  console.log("[BOOT] Connected", {
    uri: redact(MONGODB_URI),
    db: DB_NAME,
    collections: Object.entries(collByCategory).map(
      ([k, v]) => `${k}:${v}`
    ),
  });

  // ---- Express app ----
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get("/health", async (_req, res) => {
    try {
      await getDb().command({ ping: 1 });
      res.json({ ok: 1 });
    } catch (e) {
      res.status(500).json({ ok: 0, error: e?.message });
    }
  });

  // Debug: show namespace + min/max ObjectId + count
  app.get("/debug/:category", async (req, res) => {
    try {
      const db = getDb();
      const collName = collByCategory[req.params.category];
      if (!collName)
        return res.status(400).json({ error: "Unsupported category" });

      const coll = db.collection(collName);

      const [count, newest, oldest] = await Promise.all([
        coll.countDocuments({}),
        coll
          .find({}, { projection: { _id: 1 } })
          .sort({ _id: -1 })
          .limit(1)
          .toArray(),
        coll
          .find({}, { projection: { _id: 1 } })
          .sort({ _id: 1 })
          .limit(1)
          .toArray(),
      ]);

      res.json({
        namespace: `${DB_NAME}.${collName}`,
        countDocuments: count,
        newestId: newest[0]?._id?.toHexString() || null,
        oldestId: oldest[0]?._id?.toHexString() || null,
        serverTime: new Date().toISOString(),
      });
    } catch (e) {
      res.status(500).json({ error: "Debug failed", detail: e?.message });
    }
  });

  // ---- Live endpoints (/live/infrastructure, /live/business, ...) ----
  app.use(makeLiveRouter({ getDb }));

  // ---- Listen ----
  app.listen(PORT, () =>
    console.log(`Live API listening on http://localhost:${PORT}`)
  );

  // optional: graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await client.close().catch(() => {});
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
