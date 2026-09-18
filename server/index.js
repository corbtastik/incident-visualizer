// server/index.js (ESM)
import "dotenv/config";
import { EventEmitter } from "events";
import express from "express";

// Increase listener limit for concurrent GCS streams
EventEmitter.defaultMaxListeners = 50;
import cors from "cors";
import { MongoClient } from "mongodb";
import makeLiveRouter from "./routes/live.js";
import makeSearchRouter from "./routes/search.js";
import makeMediaRouter from "./routes/media.js";
import makeHeatmapRouter from "./routes/heatmap.js";
import makeSearchExplorerRouter from "./routes/searchExplorer.js";
import makeChatRouter from "./routes/chat.js";
import makeChatStreamRouter from "./routes/chatStream.js";
import { orbitLog } from "./lib/orbitLog.js";

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

  // Temporary: every request, to orbit.log. Diagnosing this from the server
  // side alone has been guesswork -- this shows exactly what the browser does
  // and does not attempt.
  // /live is polled twice a second per category and buries everything else.
  app.use((req, res, next) => {
    if (req.path.startsWith("/live")) return next();
    const started = Date.now();
    res.on("finish", () =>
      orbitLog(`HTTP ${req.method} ${req.originalUrl} -> ${res.statusCode} in ${Date.now() - started}ms`)
    );
    next();
  });

  // Client-side errors land here so they reach the same log file. A stack
  // trace trapped in a browser console is invisible to anyone not sitting at
  // that machine.
  // Unauthenticated write to a log file: acceptable on a developer machine,
  // not somewhere it could be reached from outside.
  app.post("/chat/client-error", (req, res) => {
    if (process.env.NODE_ENV === "production") return res.status(404).end();
    orbitLog(`CLIENT ERROR ${req.body?.message ?? "(none)"}\n${req.body?.stack ?? ""}`);
    res.json({ ok: 1 });
  });

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

  // ---- Search endpoint (/search) ----
  app.use(makeSearchRouter({ getDb }));

  // ---- Media proxy endpoint (/media/:mediaId) ----
  app.use(makeMediaRouter({ getDb }));

  // ---- Heatmap endpoint (/heatmap/:category) ----
  app.use(makeHeatmapRouter({ getDb }));

  // ---- Search Explorer endpoints (/search/lexical, /search/vector, /search/hybrid) ----
  app.use(makeSearchExplorerRouter({ getDb }));

  // ---- Chat history (/chat/projects, /chat/conversations) ----
  app.use(makeChatRouter({ getDb }));

  // ---- Chat streaming (/chat/stream, /chat/providers) ----
  app.use(makeChatStreamRouter());

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
