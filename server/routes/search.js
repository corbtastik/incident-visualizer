import express from "express";

export default function makeSearchRouter({ getDb }) {
  const router = express.Router();

  router.post("/search", async (req, res) => {
    try {
      const { query, limit = 10 } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      const db = getDb();
      const coll = db.collection("incident_events");

      const pipeline = [
        {
          $vectorSearch: {
            index: "narrative_autoembed_index",
            query: { text: query.trim() },
            path: "serviceIssue.narrative",
            numCandidates: Math.max(limit * 10, 100),
            limit: Math.min(limit, 50),
          },
        },
        {
          $addFields: {
            score: { $meta: "vectorSearchScore" },
          },
        },
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            lat: 1,
            lng: 1,
            ts: 1,
            serviceIssue: 1,
            score: 1,
          },
        },
      ];

      const results = await coll.aggregate(pipeline).toArray();

      res.json({
        query: query.trim(),
        count: results.length,
        results,
      });
    } catch (err) {
      console.error("[/search] error:", err);
      res.status(500).json({ error: "Search failed", detail: err?.message });
    }
  });

  return router;
}
