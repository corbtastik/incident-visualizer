# Multimodal Integration Guide

Detailed implementation guide for integrating VoyageAI multimodal embeddings with the incident simulator and visualizer.

## VoyageAI Multimodal API

### Authentication

```javascript
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_BASE_URL = 'https://api.voyageai.com/v1';
```

### Model: voyage-multimodal-3

- **Dimensions**: 1024
- **Max tokens**: 32,000 (for text)
- **Max image size**: 20MB
- **Supported formats**: JPEG, PNG, GIF, WebP

---

## API Calls

### 1. Embed an Image (Base64)

```javascript
async function embedImage(imageBuffer) {
  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const mimeType = 'image/jpeg'; // or detect dynamically

  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input: [{
        content: [{
          type: 'image_base64',
          image_base64: base64Image,
          media_type: mimeType
        }]
      }],
      input_type: 'document'  // Use 'document' for content being indexed
    })
  });

  if (!response.ok) {
    throw new Error(`Voyage API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding; // Returns 1024-dim float array
}
```

### 2. Embed an Image (URL)

```javascript
async function embedImageFromUrl(imageUrl) {
  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input: [{
        content: [{
          type: 'image_url',
          image_url: imageUrl
        }]
      }],
      input_type: 'document'
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### 3. Embed Text Query (for searching images)

```javascript
async function embedTextQuery(text) {
  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input: [text],
      input_type: 'query'  // Use 'query' for search queries
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### 4. Embed Image + Text Together (for richer context)

```javascript
async function embedImageWithCaption(imageBuffer, caption) {
  const base64Image = imageBuffer.toString('base64');

  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input: [{
        content: [
          {
            type: 'image_base64',
            image_base64: base64Image,
            media_type: 'image/jpeg'
          },
          {
            type: 'text',
            text: caption
          }
        ]
      }],
      input_type: 'document'
    })
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

### 5. Batch Embedding (multiple images)

```javascript
async function embedImageBatch(images) {
  // images = [{ buffer, caption }, ...]
  const input = images.map(img => ({
    content: [
      {
        type: 'image_base64',
        image_base64: img.buffer.toString('base64'),
        media_type: 'image/jpeg'
      },
      ...(img.caption ? [{ type: 'text', text: img.caption }] : [])
    ]
  }));

  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input,
      input_type: 'document'
    })
  });

  const data = await response.json();
  return data.data.map(d => d.embedding);
}
```

---

## Simulator Integration

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SIMULATOR                                   │
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   Incident  │───►│   Image     │───►│   VoyageAI              │  │
│  │  Generator  │    │  Selector   │    │   Embedder              │  │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘  │
│         │                                          │                │
│         │                                          │                │
│         ▼                                          ▼                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     MongoDB Writer                          │    │
│  │                                                             │    │
│  │   incident_events ◄──── incident doc                        │    │
│  │   incident_media  ◄──── media doc with embedding            │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
simulator/
├── server/
│   ├── src/
│   │   ├── voyageai.js          # NEW: VoyageAI client
│   │   ├── mediaService.js      # NEW: Image selection & embedding
│   │   ├── simulator.js         # MODIFY: Add media attachment
│   │   └── db.js                # MODIFY: Add incident_media collection
│   └── assets/
│       └── images/              # NEW: Stock incident images
│           ├── tower-damage/
│           ├── fiber-cut/
│           ├── equipment-failure/
│           └── construction/
```

### Implementation Files

#### 1. `voyageai.js` - VoyageAI Client

```javascript
// simulator/server/src/voyageai.js
import { CONFIG } from './config.js';

const VOYAGE_API_KEY = CONFIG.VOYAGE_API_KEY;
const VOYAGE_BASE_URL = 'https://api.voyageai.com/v1';
const MODEL = 'voyage-multimodal-3';

/**
 * Embed an image with optional caption
 */
export async function embedImage(imageBuffer, caption = null) {
  const content = [
    {
      type: 'image_base64',
      image_base64: imageBuffer.toString('base64'),
      media_type: 'image/jpeg'
    }
  ];

  if (caption) {
    content.push({ type: 'text', text: caption });
  }

  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ content }],
      input_type: 'document'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VoyageAI error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Embed a text query for searching images
 */
export async function embedQuery(text) {
  const response = await fetch(`${VOYAGE_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      input: [text],
      input_type: 'query'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`VoyageAI error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
```

#### 2. `mediaService.js` - Image Selection & Embedding

```javascript
// simulator/server/src/mediaService.js
import fs from 'fs/promises';
import path from 'path';
import { embedImage } from './voyageai.js';

const ASSETS_DIR = path.join(process.cwd(), 'assets/images');

// Map incident types to image categories
const TYPE_TO_IMAGE_CATEGORY = {
  'backhaul': 'tower-damage',
  'smartcell': 'tower-damage',
  'fiber': 'fiber-cut',
  'broadband': 'fiber-cut',
  'datacenter': 'equipment-failure',
  'cloud-network': 'equipment-failure',
  'construction': 'construction',
  'edge': 'equipment-failure',
  // ... add more mappings
};

// Cache of available images per category
let imageCache = null;

/**
 * Load available images from assets directory
 */
async function loadImageCache() {
  if (imageCache) return imageCache;

  imageCache = {};
  const categories = await fs.readdir(ASSETS_DIR);

  for (const cat of categories) {
    const catPath = path.join(ASSETS_DIR, cat);
    const stat = await fs.stat(catPath);
    if (stat.isDirectory()) {
      const files = await fs.readdir(catPath);
      imageCache[cat] = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    }
  }

  return imageCache;
}

/**
 * Select a random image for an incident type
 */
export async function selectImageForIncident(incidentType) {
  const cache = await loadImageCache();
  const category = TYPE_TO_IMAGE_CATEGORY[incidentType] || 'equipment-failure';
  const images = cache[category] || [];

  if (images.length === 0) return null;

  const selected = images[Math.floor(Math.random() * images.length)];
  return {
    category,
    filename: selected,
    path: path.join(ASSETS_DIR, category, selected)
  };
}

/**
 * Generate caption based on incident data
 */
export function generateCaption(incident, imageCategory) {
  const captions = {
    'tower-damage': `Cell tower damage in ${incident.city}, ${incident.state}. ${incident.serviceIssue?.type} service affected.`,
    'fiber-cut': `Fiber optic cable damage near ${incident.city}. Service disruption reported.`,
    'equipment-failure': `Network equipment failure at ${incident.city} facility. Maintenance required.`,
    'construction': `Construction site incident in ${incident.city}. Infrastructure work in progress.`
  };
  return captions[imageCategory] || `Incident photo from ${incident.city}, ${incident.state}.`;
}

/**
 * Process an incident and create media document with embedding
 */
export async function createMediaDocument(incident, simRunId) {
  const imageInfo = await selectImageForIncident(incident.serviceIssue?.type);
  if (!imageInfo) return null;

  try {
    const imageBuffer = await fs.readFile(imageInfo.path);
    const caption = generateCaption(incident, imageInfo.category);
    const embedding = await embedImage(imageBuffer, caption);

    return {
      incidentId: incident._id,
      simRunId,
      mediaType: 'image',
      category: imageInfo.category,
      filename: imageInfo.filename,
      caption,
      embedding,
      ts: new Date()
    };
  } catch (err) {
    console.error('[mediaService] Failed to create media doc:', err.message);
    return null;
  }
}
```

#### 3. `db.js` - Add Media Collection & Index

```javascript
// Add to simulator/server/src/db.js

/**
 * Ensure indexes for incident_media collection (multimodal search)
 */
export async function ensureMediaIndexes(passedDb) {
  const _db = passedDb || getDb();
  const mediaColl = _db.collection('incident_media');

  // Reference to parent incident
  await mediaColl.createIndex({ incidentId: 1 });

  // Query by sim run
  await mediaColl.createIndex({ simRunId: 1, ts: -1 });

  // Query by media type
  await mediaColl.createIndex({ mediaType: 1 });

  console.log('[db] incident_media indexes ensured');
}

/**
 * Insert a media document
 */
export async function insertMediaDoc(passedDb, doc) {
  const _db = passedDb || getDb();
  return _db.collection('incident_media').insertOne(doc);
}
```

> **Note**: The vector index for `embedding` field must be created in Atlas UI, not via driver.

#### 4. `simulator.js` - Integrate Media Attachment

```javascript
// Modify simulator/server/src/simulator.js

import { createMediaDocument } from './mediaService.js';
import { insertMediaDoc } from './db.js';

// Add configuration
const MEDIA_ATTACHMENT_RATE = 0.3; // 30% of incidents get images

// Inside the incident generation loop:
async function generateIncident(simRunId, params) {
  // ... existing incident generation code ...

  const incident = {
    _id: new ObjectId(),
    city,
    state,
    lat,
    lng,
    serviceIssue,
    simRunId,
    ts: new Date()
  };

  // Insert incident
  await coll.insertOne(incident);

  // Optionally attach media
  if (Math.random() < MEDIA_ATTACHMENT_RATE) {
    const mediaDoc = await createMediaDocument(incident, simRunId);
    if (mediaDoc) {
      await insertMediaDoc(undefined, mediaDoc);
      console.log(`[sim] Attached image to incident ${incident._id}`);
    }
  }

  return incident;
}
```

---

## Atlas Vector Index for Media

Create this index in Atlas UI on `incident_media` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "simRunId"
    },
    {
      "type": "filter",
      "path": "mediaType"
    }
  ]
}
```

---

## Search API Integration

### Update `search.js` to Query Media

```javascript
// incident-visualizer/server/routes/search.js

import { embedQuery } from '../voyageai.js'; // Need to add this

router.post("/search", async (req, res) => {
  const { query, limit = 10, simRunId, searchMode = 'semantic' } = req.body;

  const db = getDb();

  // Results containers
  let incidentResults = [];
  let mediaResults = [];

  // 1. Search incidents (existing logic)
  if (searchMode === 'semantic' || searchMode === 'hybrid') {
    // ... existing $vectorSearch on incident_events ...
    incidentResults = await db.collection('incident_events')
      .aggregate(incidentPipeline)
      .toArray();
  }

  // 2. Search media (NEW)
  if (searchMode === 'semantic' || searchMode === 'hybrid') {
    // Get query embedding from VoyageAI multimodal model
    const queryEmbedding = await embedQuery(query);

    const mediaPipeline = [
      {
        $vectorSearch: {
          index: "media_vector_index",
          queryVector: queryEmbedding,
          path: "embedding",
          numCandidates: limit * 5,
          limit: limit,
          filter: simRunId ? { simRunId } : undefined
        }
      },
      {
        $addFields: { score: { $meta: "vectorSearchScore" } }
      },
      {
        $lookup: {
          from: "incident_events",
          localField: "incidentId",
          foreignField: "_id",
          as: "incident"
        }
      },
      {
        $unwind: "$incident"
      },
      {
        $project: {
          _id: 1,
          mediaType: 1,
          filename: 1,
          caption: 1,
          score: 1,
          incidentId: 1,
          "incident.city": 1,
          "incident.state": 1,
          "incident.lat": 1,
          "incident.lng": 1,
          "incident.serviceIssue": 1
        }
      }
    ];

    mediaResults = await db.collection('incident_media')
      .aggregate(mediaPipeline)
      .toArray();
  }

  res.json({
    query,
    incidents: {
      count: incidentResults.length,
      results: incidentResults
    },
    media: {
      count: mediaResults.length,
      results: mediaResults
    }
  });
});
```

---

## Visualizer UI Updates

### Search Results with Images

```jsx
// incident-visualizer/src/components/SearchResults.jsx

function MediaResultCard({ media, onZoom }) {
  const imageUrl = `/api/media/${media.filename}`; // Serve from assets

  return (
    <div className="sr-row sr-row--media">
      <div className="sr-row__image">
        <img src={imageUrl} alt={media.caption} />
      </div>
      <div className="sr-row__content">
        <div className="sr-row__title">{media.incident.city}, {media.incident.state}</div>
        <div className="sr-row__caption">{media.caption}</div>
        <div className="sr-row__details">
          <span className="sr-row__field">
            <span className="sr-row__label">Type:</span> {media.incident.serviceIssue?.type}
          </span>
          <span className="sr-row__field">
            <span className="sr-row__label">Score:</span>
            <span className="sr-row__score">{(media.score * 100).toFixed(1)}%</span>
          </span>
        </div>
      </div>
      <button
        className="sr-row__zoom"
        onClick={() => onZoom(media.incident.lat, media.incident.lng)}
      >
        <ZoomIcon />
      </button>
    </div>
  );
}
```

### Tabs for Result Types

```jsx
function SearchResults({ query, incidents, media, onClose, onZoom }) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="bottom-dock">
      <div className="bottom-dock__panel">
        <div className="sr-header">
          <div className="sr-tabs">
            <button
              className={activeTab === 'all' ? 'active' : ''}
              onClick={() => setActiveTab('all')}
            >
              All ({incidents.length + media.length})
            </button>
            <button
              className={activeTab === 'incidents' ? 'active' : ''}
              onClick={() => setActiveTab('incidents')}
            >
              Incidents ({incidents.length})
            </button>
            <button
              className={activeTab === 'media' ? 'active' : ''}
              onClick={() => setActiveTab('media')}
            >
              Images ({media.length})
            </button>
          </div>
          <button className="sr-close" onClick={onClose}>×</button>
        </div>

        <div className="sr-body">
          {(activeTab === 'all' || activeTab === 'incidents') &&
            incidents.map(inc => <IncidentResultCard key={inc._id} incident={inc} onZoom={onZoom} />)
          }
          {(activeTab === 'all' || activeTab === 'media') &&
            media.map(m => <MediaResultCard key={m._id} media={m} onZoom={onZoom} />)
          }
        </div>
      </div>
    </div>
  );
}
```

---

## Sample Stock Images Needed

Create/source images for these categories:

| Category | Example Images |
|----------|----------------|
| `tower-damage` | Bent antennas, storm damage, ice accumulation, fallen tower |
| `fiber-cut` | Exposed cables, construction dig damage, rodent damage |
| `equipment-failure` | Smoking equipment, corroded hardware, flooded cabinets |
| `construction` | Trenching, cable laying, tower construction, equipment installation |
| `datacenter` | Server racks, cooling failures, power issues |

---

## Environment Variables

Add to `.env`:

```
VOYAGE_API_KEY=your-voyage-api-key
MEDIA_ATTACHMENT_RATE=0.3
```

---

## Implementation Checklist

- [ ] Add VoyageAI API key to environment
- [ ] Create `voyageai.js` client module
- [ ] Create `mediaService.js` for image handling
- [ ] Add stock images to `assets/images/` directories
- [ ] Update `db.js` with media collection helpers
- [ ] Modify `simulator.js` to attach media to incidents
- [ ] Create vector index on `incident_media.embedding` in Atlas
- [ ] Update search API to query both collections
- [ ] Add image results to visualizer UI
- [ ] Add tabs for filtering result types
- [ ] Serve images via Express static route or S3
