import express from "express";
import { ObjectId } from "mongodb";
import { embedQuery } from "../voyageai.js";

const ATLAS_MODEL_API_KEY = process.env.ATLAS_MODEL_API_KEY;

export default function makeSearchRouter({ getDb }) {
  const router = express.Router();

  /**
   * Search incident_media collection using vector search
   * Returns media documents with their incidentIds
   */
  async function searchMedia(db, queryVector, { simRunId, limit = 20 }) {
    const mediaColl = db.collection("incident_media");

    const filter = {};
    if (simRunId) filter.simRunId = simRunId;

    const pipeline = [
      {
        $vectorSearch: {
          index: "incident_media_vector",
          path: "embedding",
          queryVector,
          numCandidates: Math.max(limit * 10, 100),
          limit,
          ...(Object.keys(filter).length > 0 ? { filter } : {})
        }
      },
      {
        $project: {
          _id: 1,
          incidentId: 1,
          filename: 1,
          caption: 1,
          category: 1,
          type: 1,
          source: 1,
          mediaScore: { $meta: "vectorSearchScore" }
        }
      }
    ];

    return mediaColl.aggregate(pipeline).toArray();
  }

  /**
   * Fetch media documents for a set of incident IDs
   * Returns Map<incidentIdString, mediaDoc[]>
   */
  async function fetchMediaByIncidentIds(db, incidentIds) {
    if (!incidentIds || incidentIds.length === 0) {
      return new Map();
    }

    const mediaColl = db.collection("incident_media");
    const objectIds = incidentIds.map(id =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    const mediaDocs = await mediaColl.find({
      incidentId: { $in: objectIds }
    }).project({
      _id: 1,
      incidentId: 1,
      filename: 1,
      caption: 1,
      category: 1,
      type: 1,
      source: 1
    }).toArray();

    // Group by incidentId
    const mediaMap = new Map();
    for (const doc of mediaDocs) {
      const key = doc.incidentId.toString();
      if (!mediaMap.has(key)) {
        mediaMap.set(key, []);
      }
      mediaMap.get(key).push(doc);
    }

    return mediaMap;
  }

  /**
   * Fetch full incident documents by IDs
   */
  async function fetchIncidentsByIds(db, incidentIds) {
    if (!incidentIds || incidentIds.length === 0) {
      return [];
    }

    const coll = db.collection("incident_events");
    const objectIds = incidentIds.map(id =>
      typeof id === "string" ? new ObjectId(id) : id
    );

    return coll.find({
      _id: { $in: objectIds }
    }).project({
      _id: 1,
      city: 1,
      state: 1,
      lat: 1,
      lng: 1,
      ts: 1,
      simRunId: 1,
      serviceIssue: 1
    }).toArray();
  }

  /**
   * POST /search - Unified multimodal search
   * Searches both incident narratives and media embeddings,
   * merges results by incidentId
   */
  router.post("/search", async (req, res) => {
    try {
      const { query, limit = 20, simRunId } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({ error: "Query is required" });
      }

      const db = getDb();
      const incidentColl = db.collection("incident_events");
      const trimmedQuery = query.trim();
      const effectiveLimit = Math.min(limit, 50);

      // Build narrative search pipeline
      const narrativeSearchStage = {
        $vectorSearch: {
          index: "narrative_autoembed_index",
          query: { text: trimmedQuery },
          path: "serviceIssue.narrative",
          numCandidates: Math.max(effectiveLimit * 10, 100),
          limit: effectiveLimit,
        },
      };

      if (simRunId && typeof simRunId === "string") {
        narrativeSearchStage.$vectorSearch.filter = { simRunId };
      }

      const narrativePipeline = [
        narrativeSearchStage,
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            lat: 1,
            lng: 1,
            ts: 1,
            simRunId: 1,
            serviceIssue: 1,
            narrativeScore: { $meta: "vectorSearchScore" },
          },
        },
      ];

      // Run narrative search
      const narrativeResults = await incidentColl.aggregate(narrativePipeline).toArray();

      // Track incidents found via narrative with their scores
      const incidentScores = new Map(); // Map<incidentId, { narrativeScore, mediaScore }>
      const incidentDocs = new Map();   // Map<incidentId, incidentDoc>

      for (const doc of narrativeResults) {
        const id = doc._id.toString();
        incidentScores.set(id, { narrativeScore: doc.narrativeScore, mediaScore: null });
        incidentDocs.set(id, doc);
      }

      // Run media search if API key is configured
      let mediaResults = [];
      const mediaScoresByIncident = new Map(); // Map<incidentId, mediaScore>

      if (ATLAS_MODEL_API_KEY) {
        try {
          const queryVector = await embedQuery(trimmedQuery, ATLAS_MODEL_API_KEY);
          mediaResults = await searchMedia(db, queryVector, { simRunId, limit: effectiveLimit });

          // Track media matches and their scores
          for (const media of mediaResults) {
            const incidentId = media.incidentId?.toString();
            if (incidentId) {
              // Keep highest media score per incident
              const existing = mediaScoresByIncident.get(incidentId);
              if (!existing || media.mediaScore > existing) {
                mediaScoresByIncident.set(incidentId, media.mediaScore);
              }
            }
          }

          // Fetch incidents that matched via media but not narrative
          const mediaOnlyIncidentIds = [];
          for (const incidentId of mediaScoresByIncident.keys()) {
            if (!incidentDocs.has(incidentId)) {
              mediaOnlyIncidentIds.push(incidentId);
            }
          }

          if (mediaOnlyIncidentIds.length > 0) {
            const mediaOnlyIncidents = await fetchIncidentsByIds(db, mediaOnlyIncidentIds);
            for (const doc of mediaOnlyIncidents) {
              const id = doc._id.toString();
              incidentDocs.set(id, doc);
              incidentScores.set(id, { narrativeScore: null, mediaScore: mediaScoresByIncident.get(id) });
            }
          }

          // Update scores for incidents that matched both
          for (const [incidentId, mediaScore] of mediaScoresByIncident) {
            if (incidentScores.has(incidentId)) {
              incidentScores.get(incidentId).mediaScore = mediaScore;
            }
          }

        } catch (err) {
          console.warn("[/search] Media search failed (continuing with narrative only):", err?.message);
        }
      }

      // Fetch media for all result incidents (permanent attachment lookup)
      const allIncidentIds = Array.from(incidentDocs.keys());
      const mediaByIncident = await fetchMediaByIncidentIds(db, allIncidentIds);

      // Build unified results
      const results = [];
      for (const [incidentId, doc] of incidentDocs) {
        const scores = incidentScores.get(incidentId) || {};
        const media = mediaByIncident.get(incidentId) || null;

        // Determine what matched
        const matchedOn = [];
        if (scores.narrativeScore != null) matchedOn.push("narrative");
        if (scores.mediaScore != null) matchedOn.push("media");

        // Calculate combined score (max of available scores)
        const combinedScore = Math.max(
          scores.narrativeScore || 0,
          scores.mediaScore || 0
        );

        results.push({
          _id: doc._id,
          city: doc.city,
          state: doc.state,
          lat: doc.lat,
          lng: doc.lng,
          ts: doc.ts,
          simRunId: doc.simRunId,
          serviceIssue: doc.serviceIssue,
          score: combinedScore,
          narrativeScore: scores.narrativeScore || null,
          mediaScore: scores.mediaScore || null,
          matchedOn,
          media: media && media.length > 0 ? media : null
        });
      }

      // Sort by combined score descending
      results.sort((a, b) => b.score - a.score);

      res.json({
        query: trimmedQuery,
        simRunId: simRunId || null,
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
