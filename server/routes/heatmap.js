import express from "express";

const collByCategory = {
  infrastructure: "infrastructure_events",
  business: "business_events",
  consumer: "consumer_events",
  federal: "federal_events",
  emerging_tech: "emerging_tech_events",
};

export default function makeHeatmapRouter({ getDb }) {
  const router = express.Router();

  /**
   * GET /heatmap/:category
   * Returns all historical incidents for heatmap visualization.
   * No simRunId filtering - returns data across all simulation runs.
   */
  router.get("/heatmap/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const collName = collByCategory[category];

      if (!collName) {
        return res.status(400).json({ error: `Unsupported category: ${category}` });
      }

      const limit = Math.min(parseInt(req.query.limit) || 10000, 50000);

      const db = getDb();
      const coll = db.collection(collName);

      // Fetch incidents with position data, sorted by most recent
      // Only get documents that are incidents (not resolutions)
      const cursor = coll.find(
        {
          type: { $ne: "resolution" },
          lat: { $exists: true },
          lng: { $exists: true }
        },
        {
          projection: {
            _id: 1,
            lat: 1,
            lng: 1,
            city: 1,
            state: 1,
            "serviceIssue.category": 1,
            "serviceIssue.type": 1,
            simRunId: 1
          }
        }
      )
        .sort({ _id: -1 })
        .limit(limit);

      const data = await cursor.toArray();

      res.json({
        category,
        count: data.length,
        limit,
        data
      });

    } catch (err) {
      console.error("[/heatmap] error:", err);
      res.status(500).json({ error: "Failed to fetch heatmap data", detail: err?.message });
    }
  });

  return router;
}
