import { Router } from 'express';
import { embedQuery } from '../voyageai.js';

const ATLAS_MODEL_API_KEY = process.env.ATLAS_MODEL_API_KEY;
const DB_NAME = process.env.DB_NAME || 'incidents';

// Index names
const LEXICAL_INDEX = 'incident_events_lexical';
const VECTOR_INDEX = 'narrative_autoembed_index';
const MEDIA_VECTOR_INDEX = 'incident_media_vector';

// Simple tokenizer for display purposes
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Build pipeline JSON for display in UI
function buildPipeline(searchType, query, queryVector = null) {
  if (searchType === 'lexical') {
    return [
      {
        $search: {
          index: LEXICAL_INDEX,
          text: {
            query: query,
            path: ['serviceIssue.narrative', 'serviceIssue.type', 'city']
          }
        }
      },
      { $limit: 20 },
      {
        $project: {
          _id: 1,
          city: 1,
          state: 1,
          category: 1,
          serviceIssue: 1,
          score: { $meta: 'searchScore' }
        }
      }
    ];
  }

  if (searchType === 'vector') {
    return {
      incidents: [
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            query: { text: query },
            path: 'serviceIssue.narrative',
            numCandidates: 100,
            limit: 20
          }
        },
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            category: 1,
            serviceIssue: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ],
      media: [
        {
          $vectorSearch: {
            index: MEDIA_VECTOR_INDEX,
            queryVector: queryVector ? '[1024-dim vector]' : null,
            path: 'embedding',
            numCandidates: 100,
            limit: 20
          }
        },
        {
          $project: {
            _id: 1,
            filename: 1,
            caption: 1,
            category: 1,
            incidentId: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ]
    };
  }

  // Hybrid using $rankFusion
  return {
    incidents: [
      {
        $rankFusion: {
          input: {
            pipelines: {
              lexical: [
                {
                  $search: {
                    index: LEXICAL_INDEX,
                    text: { query: query, path: ['serviceIssue.narrative', 'serviceIssue.type', 'city'] }
                  }
                },
                { $limit: 50 }
              ],
              vector: [
                {
                  $vectorSearch: {
                    index: VECTOR_INDEX,
                    query: { text: query },
                    path: 'serviceIssue.narrative',
                    numCandidates: 100,
                    limit: 50
                  }
                }
              ]
            }
          }
        }
      },
      { $limit: 20 },
      {
        $project: {
          _id: 1,
          city: 1,
          state: 1,
          category: 1,
          serviceIssue: 1,
          score: { $meta: 'score' }
        }
      }
    ],
    media: [
      {
        $vectorSearch: {
          index: MEDIA_VECTOR_INDEX,
          queryVector: '[1024-dim vector]',
          path: 'embedding',
          numCandidates: 100,
          limit: 20
        }
      }
    ]
  };
}

// Transform incident document for response
function transformIncident(doc, searchType) {
  return {
    _id: doc._id.toString(),
    narrative: doc.serviceIssue?.narrative || '',
    city: doc.city || '',
    state: doc.state || '',
    category: doc.category || '',
    serviceIssue: {
      type: doc.serviceIssue?.type || '',
      severity: doc.serviceIssue?.severity || '',
    },
    scores: {
      [searchType]: doc.score || 0
    },
    matchReason: searchType === 'lexical'
      ? 'Matched via text search on indexed fields'
      : searchType === 'vector'
        ? 'Matched via semantic similarity on narrative'
        : 'Combined lexical and vector ranking',
  };
}

// Transform media document for response
function transformMedia(doc, apiBase = '') {
  const mediaId = doc._id.toString();
  return {
    _id: mediaId,
    filename: doc.filename || '',
    caption: doc.caption || '',
    category: doc.category || '',
    incidentId: doc.incidentId?.toString() || '',
    // Use media proxy endpoint for images
    thumbnail: `/media/${mediaId}`,
    tags: doc.tags || [],
    scores: {
      vector: doc.score || 0
    },
  };
}

export default function makeSearchExplorerRouter({ getDb }) {
  const router = Router();

  // Lexical search endpoint
  router.post('/search/lexical', async (req, res) => {
    const { query, limit = 20 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const tokens = tokenize(query);

    try {
      const db = getDb(DB_NAME);
      const incidentsColl = db.collection('incident_events');

      // Run lexical search on incidents - search narrative and type fields
      const incidentPipeline = [
        {
          $search: {
            index: LEXICAL_INDEX,
            text: {
              query: query,
              path: ['serviceIssue.narrative', 'serviceIssue.type', 'city']
            }
          }
        },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            category: 1,
            serviceIssue: 1,
            score: { $meta: 'searchScore' }
          }
        }
      ];

      const incidentResults = await incidentsColl.aggregate(incidentPipeline).toArray();
      const incidents = incidentResults.map(doc => transformIncident(doc, 'lexical'));

      // No lexical search for media (no text index exists)
      const media = [];

      res.json({
        query,
        searchType: 'lexical',
        tokenization: tokens,
        embedding: null,
        pipeline: buildPipeline('lexical', query),
        incidents,
        media,
      });
    } catch (err) {
      console.error('Lexical search error:', err);
      res.status(500).json({ error: 'Search failed', detail: err.message });
    }
  });

  // Vector search endpoint
  router.post('/search/vector', async (req, res) => {
    const { query, limit = 20 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const tokens = tokenize(query);

    try {
      const db = getDb(DB_NAME);
      const incidentsColl = db.collection('incident_events');
      const mediaColl = db.collection('incident_media');

      // Vector search on incidents using autoEmbed (Atlas generates embedding)
      const incidentPipeline = [
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            query: { text: query },
            path: 'serviceIssue.narrative',
            numCandidates: 100,
            limit: limit
          }
        },
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            category: 1,
            serviceIssue: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];

      const incidentResults = await incidentsColl.aggregate(incidentPipeline).toArray();
      const incidents = incidentResults.map(doc => transformIncident(doc, 'vector'));

      // Vector search on media (requires manual embedding)
      let media = [];
      let queryVector = null;

      if (ATLAS_MODEL_API_KEY) {
        try {
          queryVector = await embedQuery(query, ATLAS_MODEL_API_KEY);

          const mediaPipeline = [
            {
              $vectorSearch: {
                index: MEDIA_VECTOR_INDEX,
                queryVector: queryVector,
                path: 'embedding',
                numCandidates: 100,
                limit: limit
              }
            },
            {
              $project: {
                _id: 1,
                filename: 1,
                caption: 1,
                category: 1,
                incidentId: 1,
                gcsUrl: 1,
                thumbnail: 1,
                tags: 1,
                score: { $meta: 'vectorSearchScore' }
              }
            }
          ];

          const mediaResults = await mediaColl.aggregate(mediaPipeline).toArray();
          media = mediaResults.map(transformMedia);
        } catch (embedErr) {
          console.error('Media embedding error:', embedErr);
          // Continue without media results
        }
      }

      res.json({
        query,
        searchType: 'vector',
        tokenization: tokens,
        embedding: queryVector ? `[${queryVector.length}-dim vector]` : null,
        pipeline: buildPipeline('vector', query, queryVector),
        incidents,
        media,
      });
    } catch (err) {
      console.error('Vector search error:', err);
      res.status(500).json({ error: 'Search failed', detail: err.message });
    }
  });

  // Hybrid search endpoint
  router.post('/search/hybrid', async (req, res) => {
    const { query, limit = 20 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const tokens = tokenize(query);

    try {
      const db = getDb(DB_NAME);
      const incidentsColl = db.collection('incident_events');
      const mediaColl = db.collection('incident_media');

      // Hybrid search on incidents using $rankFusion
      const incidentPipeline = [
        {
          $rankFusion: {
            input: {
              pipelines: {
                lexical: [
                  {
                    $search: {
                      index: LEXICAL_INDEX,
                      text: {
                        query: query,
                        path: ['serviceIssue.narrative', 'serviceIssue.type', 'city']
                      }
                    }
                  },
                  { $limit: 50 }
                ],
                vector: [
                  {
                    $vectorSearch: {
                      index: VECTOR_INDEX,
                      query: { text: query },
                      path: 'serviceIssue.narrative',
                      numCandidates: 100,
                      limit: 50
                    }
                  }
                ]
              }
            }
          }
        },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            city: 1,
            state: 1,
            category: 1,
            serviceIssue: 1,
            score: { $meta: 'score' }
          }
        }
      ];

      const incidentResults = await incidentsColl.aggregate(incidentPipeline).toArray();
      const incidents = incidentResults.map(doc => transformIncident(doc, 'hybrid'));

      // Vector search on media (no hybrid available - no text index)
      let media = [];
      let queryVector = null;

      if (ATLAS_MODEL_API_KEY) {
        try {
          queryVector = await embedQuery(query, ATLAS_MODEL_API_KEY);

          const mediaPipeline = [
            {
              $vectorSearch: {
                index: MEDIA_VECTOR_INDEX,
                queryVector: queryVector,
                path: 'embedding',
                numCandidates: 100,
                limit: limit
              }
            },
            {
              $project: {
                _id: 1,
                filename: 1,
                caption: 1,
                category: 1,
                incidentId: 1,
                gcsUrl: 1,
                thumbnail: 1,
                tags: 1,
                score: { $meta: 'vectorSearchScore' }
              }
            }
          ];

          const mediaResults = await mediaColl.aggregate(mediaPipeline).toArray();
          media = mediaResults.map(transformMedia);
        } catch (embedErr) {
          console.error('Media embedding error:', embedErr);
        }
      }

      res.json({
        query,
        searchType: 'hybrid',
        tokenization: tokens,
        embedding: queryVector ? `[${queryVector.length}-dim vector]` : null,
        pipeline: buildPipeline('hybrid', query, queryVector),
        incidents,
        media,
      });
    } catch (err) {
      console.error('Hybrid search error:', err);
      res.status(500).json({ error: 'Search failed', detail: err.message });
    }
  });

  return router;
}
