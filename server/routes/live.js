import express from "express";
import { ObjectId } from "mongodb";

export default function makeLiveRouter({ getDb }) {
  const router = express.Router();

  function makeLiveEndpoint(path, collName, dbName = "incidents") {
    router.get(path, async (req, res) => {
      try {
        const db = getDb(dbName);
        const coll = db.collection(collName);

        const { after, limit } = req.query;
        const pageSize = Math.min(parseInt(limit, 10) || 200, 1000);

        const filter = {};
        if (after) {
          try {
            filter._id = { $gt: new ObjectId(after) };
          } catch {
            return res.status(400).json({ error: "Invalid 'after' ObjectId." });
          }
        }

        const docs = await coll.find(filter).sort({ _id: 1 }).limit(pageSize).toArray();
        const nextAfter = docs.length ? docs[docs.length - 1]._id : (after || null);
        res.json({ docs, nextAfter });
      } catch (err) {
        console.error(`[${path}] error:`, err);
        res.status(500).json({ error: "Internal error." });
      }
    });
  }

  // endpoints
  makeLiveEndpoint("/live/infrastructure", "infrastructure_events");
  makeLiveEndpoint("/live/business",       "business_events");
  makeLiveEndpoint("/live/consumer",       "consumer_events");
  makeLiveEndpoint("/live/federal",        "federal_events");
  makeLiveEndpoint("/live/emerging_tech",  "emerging_tech_events");

  return router;
}
