import express from "express";
import { ObjectId } from "mongodb";
import { Storage } from "@google-cloud/storage";

// GCS client (lazy initialized)
let gcsStorage = null;

function getGcsStorage() {
  if (!gcsStorage) {
    gcsStorage = new Storage();
  }
  return gcsStorage;
}

// GCS bucket name (same as simulator)
const GCS_BUCKET = process.env.MEDIA_GCS_BUCKET || "incident-app";

export default function makeMediaRouter({ getDb }) {
  const router = express.Router();

  /**
   * GET /media/:mediaId
   * Proxy media content from GCS (or other storage) by media document ID
   */
  router.get("/media/:mediaId", async (req, res) => {
    try {
      const { mediaId } = req.params;

      // Validate ObjectId format
      if (!ObjectId.isValid(mediaId)) {
        return res.status(400).json({ error: "Invalid media ID" });
      }

      // Look up media document
      const db = getDb();
      const mediaColl = db.collection("incident_media");
      const mediaDoc = await mediaColl.findOne({ _id: new ObjectId(mediaId) });

      if (!mediaDoc) {
        return res.status(404).json({ error: "Media not found" });
      }

      const { source, filename, dataset } = mediaDoc;

      if (source === "gcs") {
        // Construct GCS path
        const gcsPath = `incident-media/datasets/${dataset || "demo-v1"}/images/${filename}`;

        try {
          const storage = getGcsStorage();
          const file = storage.bucket(GCS_BUCKET).file(gcsPath);

          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            return res.status(404).json({ error: "Media file not found in storage" });
          }

          // Get content type from filename
          const ext = filename.split(".").pop()?.toLowerCase();
          const contentTypes = {
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            pdf: "application/pdf",
            mp4: "video/mp4",
          };
          const contentType = contentTypes[ext] || "application/octet-stream";

          // Set headers
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 1 day

          // Stream the file
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("[/media] Stream error:", err?.message);
            if (!res.headersSent) {
              res.status(500).json({ error: "Failed to stream media" });
            }
          });
          stream.pipe(res);

        } catch (err) {
          console.error("[/media] GCS error:", err?.message);
          return res.status(500).json({ error: "Failed to fetch from storage" });
        }

      } else if (source === "local") {
        // Local files not supported on visualizer (they're on simulator machine)
        return res.status(400).json({
          error: "Local media not accessible from visualizer",
          hint: "Use GCS source for distributed access"
        });

      } else {
        return res.status(400).json({ error: `Unknown media source: ${source}` });
      }

    } catch (err) {
      console.error("[/media] error:", err);
      res.status(500).json({ error: "Failed to fetch media", detail: err?.message });
    }
  });

  return router;
}
