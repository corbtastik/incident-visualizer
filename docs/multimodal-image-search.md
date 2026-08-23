# Multimodal Image Search with VoyageAI and MongoDB Atlas

This document outlines the data flow for adding image-based vector search to the incident visualizer using VoyageAI's multimodal embedding model and MongoDB Atlas Vector Search.

## Ingestion Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐      ┌─────────────────┐      ┌──────────────────────────────┐
  │   INCIDENT   │      │    VOYAGE AI    │      │       MONGODB ATLAS          │
  │   SIMULATOR  │      │   Multimodal    │      │                              │
  └──────┬───────┘      └────────┬────────┘      └──────────────┬───────────────┘
         │                       │                              │
         │  1. Generate incident │                              │
         │     + select image    │                              │
         │                       │                              │
         ▼                       │                              │
    ┌─────────┐                  │                              │
    │  Image  │                  │                              │
    │  (JPG)  │──────────────────┼─────────────────────────────►│
    └─────────┘                  │                              │
         │                       │                              │
         │  2. POST /embeddings  │                              │
         │     model: voyage-multimodal-3                       │
         │     input_type: "image"                              │
         │                       │                              │
         ▼                       ▼                              │
    ┌─────────┐           ┌─────────────┐                       │
    │ Base64  │──────────►│  Embedding  │                       │
    │ Encode  │           │  [1024-dim] │                       │
    └─────────┘           └──────┬──────┘                       │
                                 │                              │
                                 │  3. Store incident doc       │
                                 │     with image embedding     │
                                 ▼                              ▼
                          ┌─────────────────────────────────────────┐
                          │  incident_media collection              │
                          │  ┌───────────────────────────────────┐  │
                          │  │ {                                 │  │
                          │  │   incidentId: ObjectId(...),      │  │
                          │  │   mediaType: "image",             │  │
                          │  │   url: "s3://bucket/tower.jpg",   │  │
                          │  │   caption: "Tower damage...",     │  │
                          │  │   embedding: [0.12, -0.34, ...]   │◄─┼── Vector Index
                          │  │ }                                 │  │
                          │  └───────────────────────────────────┘  │
                          └─────────────────────────────────────────┘
```

### Ingestion Steps

1. **Generate Incident**: Simulator creates an incident and selects an associated image
2. **Create Embedding**: Base64 encode the image and call VoyageAI API
3. **Store Document**: Save to MongoDB with the embedding vector for indexing

## Search Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SEARCH FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────────┘

         TEXT QUERY                              IMAGE QUERY
              │                                       │
              │ "tower damage                         │  [Upload photo]
              │  after storm"                         │
              ▼                                       ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                        VOYAGE AI                              │
    │                   voyage-multimodal-3                         │
    │                                                               │
    │   ┌─────────────┐                      ┌─────────────┐        │
    │   │ input_type: │                      │ input_type: │        │
    │   │   "text"    │                      │   "image"   │        │
    │   └──────┬──────┘                      └──────┬──────┘        │
    │          │                                    │               │
    │          ▼                                    ▼               │
    │   ┌─────────────┐                      ┌─────────────┐        │
    │   │  Embedding  │                      │  Embedding  │        │
    │   │ [1024-dim]  │                      │ [1024-dim]  │        │
    │   └──────┬──────┘                      └──────┬──────┘        │
    └──────────┼──────────────────────────────────┼─────────────────┘
               │                                  │
               │    SAME VECTOR SPACE             │
               │    (text & images align)         │
               └───────────────┬──────────────────┘
                               │
                               ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                     MONGODB ATLAS                             │
    │                                                               │
    │   $vectorSearch: {                                            │
    │     index: "media_vector_index",                              │
    │     queryVector: [0.12, -0.34, ...],  ◄── from Voyage         │
    │     path: "embedding",                                        │
    │     numCandidates: 100,                                       │
    │     limit: 10                                                 │
    │   }                                                           │
    │                                                               │
    └───────────────────────────────────────────────────────────────┘
                               │
                               │  Ranked by vector similarity
                               ▼
    ┌───────────────────────────────────────────────────────────────┐
    │                      SEARCH RESULTS                           │
    │                                                               │
    │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
    │   │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │  │ ┌─────┐ │          │
    │   │ │ IMG │ │  │ │ IMG │ │  │ │ IMG │ │  │ │ IMG │ │          │
    │   │ └─────┘ │  │ └─────┘ │  │ └─────┘ │  │ └─────┘ │          │
    │   │ 0.94   │  │  0.87   │  │  0.82   │  │  0.79   │          │
    │   │ Dallas  │  │ Houston │  │ Austin  │  │ Phoenix │          │
    │   └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
    │                                                               │
    └───────────────────────────────────────────────────────────────┘
```

## Visualizer UI

```
    ┌───────────────────────────────────────────────────────────────┐
    │                     VISUALIZER UI                             │
    │  ┌─────────────────────────────────────────────────────────┐  │
    │  │  Search: "tower damage"                    [Current run] │  │
    │  └─────────────────────────────────────────────────────────┘  │
    │                                                               │
    │  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
    │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │    + Zoom to map     │
    │  │ │      │ │ │ │      │ │ │ │      │ │    + View incident   │
    │  │ │ IMG  │ │ │ │ IMG  │ │ │ │ IMG  │ │    + Full-size image │
    │  │ │      │ │ │ │      │ │ │ │      │ │                       │
    │  │ └──────┘ │ │ └──────┘ │ │ └──────┘ │                       │
    │  │ Dallas   │ │ Houston  │ │ Austin   │                       │
    │  │ Score:94 │ │ Score:87 │ │ Score:82 │                       │
    │  └──────────┘ └──────────┘ └──────────┘                       │
    └───────────────────────────────────────────────────────────────┘
```

## Key Points

1. **Same Vector Space**: VoyageAI's `voyage-multimodal-3` embeds text and images into the same 1024-dimensional space, so text queries can find images and vice versa

2. **Embedding Generation**: Done at ingestion time (not at query time for images in the DB)

3. **Query Flexibility**:
   - Text → finds relevant images
   - Image upload → finds similar images
   - Both use the same `$vectorSearch` index

## Document Schema

### Option A: Incident Attachments

Extend incident documents with an `attachments` array:

```javascript
{
  _id: ObjectId(...),
  city: "Dallas",
  serviceIssue: { type: "backhaul", narrative: "..." },
  attachments: [
    {
      type: "image",
      url: "s3://bucket/incident-123/tower-damage.jpg",
      caption: "Cell tower antenna displacement after storm",
      embedding: [/* vector from multimodal model */]
    },
    {
      type: "document",
      url: "s3://bucket/incident-123/work-order.pdf",
      title: "Emergency Repair Work Order",
      embedding: [/* vector */]
    }
  ]
}
```

### Option B: Separate Media Collection

Keep media in a dedicated collection with incident references:

```javascript
// incident_media collection
{
  incidentId: ObjectId(...),
  mediaType: "image",
  url: "...",
  description: "Fiber cut at junction box",
  embedding: [/* multimodal vector */],
  ts: ISODate(...)
}
```

This allows independent scaling and indexing of media.

## VoyageAI API Reference

### Embedding an Image

```javascript
const response = await fetch('https://api.voyageai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'voyage-multimodal-3',
    input: [{ type: 'image', image: base64EncodedImage }],
    input_type: 'document'
  })
});

const { data } = await response.json();
const embedding = data[0].embedding; // 1024-dim vector
```

### Embedding a Text Query

```javascript
const response = await fetch('https://api.voyageai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'voyage-multimodal-3',
    input: ['tower damage after storm'],
    input_type: 'query'
  })
});

const { data } = await response.json();
const embedding = data[0].embedding; // 1024-dim vector
```

## Media Types

| Type | Example Content |
|------|-----------------|
| **Images** | Cell tower damage photos, equipment failures, construction site images, thermal scans |
| **Videos** | Drone inspection footage, surveillance clips, field technician recordings |
| **Documents** | PDF work orders, maintenance reports, network diagrams, compliance docs |
| **Audio** | Customer call recordings, field technician voice notes |

## Next Steps

1. Set up image storage (S3 or GridFS)
2. Create `incident_media` collection with vector index
3. Extend simulator to attach images to incidents
4. Add VoyageAI multimodal embedding calls to ingestion
5. Update search API to query media collection
6. Add image results to visualizer UI
