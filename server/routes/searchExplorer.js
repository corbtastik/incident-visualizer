import { Router } from 'express';

/**
 * Mock data for Search Explorer
 * This will be replaced with real Atlas queries later
 */

const MOCK_INCIDENTS = [
  {
    _id: '507f1f77bcf86cd799439011',
    narrative: 'Payment gateway experiencing network timeouts during peak hours. Multiple customers reporting failed transactions.',
    city: 'Austin',
    state: 'TX',
    category: 'infrastructure',
    serviceIssue: {
      type: 'Network Timeout',
      severity: 'high',
    },
    media: [
      { filename: 'error_log.txt', type: 'text' },
      { filename: 'dashboard_screenshot.png', type: 'image' },
    ],
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=120&h=80&fit=crop',
  },
  {
    _id: '507f1f77bcf86cd799439019',
    narrative: 'Major network outage affecting downtown data center. Fiber cut detected on primary backbone connection.',
    city: 'Dallas',
    state: 'TX',
    category: 'infrastructure',
    serviceIssue: {
      type: 'Network Outage',
      severity: 'critical',
    },
    media: [
      { filename: 'outage_map.png', type: 'image' },
      { filename: 'fiber_damage.jpg', type: 'image' },
    ],
    thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=120&h=80&fit=crop',
  },
  {
    _id: '507f1f77bcf86cd799439020',
    narrative: 'Network outage reported across multiple zones. BGP routing issues causing intermittent connectivity loss.',
    city: 'Atlanta',
    state: 'GA',
    category: 'infrastructure',
    serviceIssue: {
      type: 'Network Outage',
      severity: 'critical',
    },
    media: [
      { filename: 'bgp_analysis.png', type: 'image' },
    ],
    thumbnail: 'https://images.unsplash.com/photo-1551703599-6b3e8379aa8c?w=120&h=80&fit=crop',
  },
  {
    _id: '507f1f77bcf86cd799439021',
    narrative: 'Widespread network outage due to DNS server failure. Customers unable to resolve internal services.',
    city: 'Miami',
    state: 'FL',
    category: 'business',
    serviceIssue: {
      type: 'DNS Failure',
      severity: 'high',
    },
    media: [
      { filename: 'dns_logs.txt', type: 'text' },
    ],
    thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=120&h=80&fit=crop',
  },
  {
    _id: '507f1f77bcf86cd799439012',
    narrative: 'User authentication service returning 503 errors. SSO integration failing for enterprise customers.',
    city: 'Seattle',
    state: 'WA',
    category: 'business',
    serviceIssue: {
      type: 'Authentication Failure',
      severity: 'critical',
    },
    media: [],
  },
  {
    _id: '507f1f77bcf86cd799439013',
    narrative: 'Database connection pool exhausted causing widespread service degradation. Response times increased 10x.',
    city: 'Denver',
    state: 'CO',
    category: 'infrastructure',
    serviceIssue: {
      type: 'Database Overload',
      severity: 'critical',
    },
    media: [
      { filename: 'metrics_graph.png', type: 'image' },
    ],
  },
  {
    _id: '507f1f77bcf86cd799439014',
    narrative: 'Mobile app crashing on startup for iOS users after latest update. App store reviews dropping rapidly.',
    city: 'San Francisco',
    state: 'CA',
    category: 'consumer',
    serviceIssue: {
      type: 'App Crash',
      severity: 'high',
    },
    media: [
      { filename: 'crash_report.txt', type: 'text' },
    ],
  },
  {
    _id: '507f1f77bcf86cd799439015',
    narrative: 'AI model producing unexpected classification results. Accuracy dropped from 95% to 72% overnight.',
    city: 'Boston',
    state: 'MA',
    category: 'emerging_tech',
    serviceIssue: {
      type: 'ML Model Drift',
      severity: 'medium',
    },
    media: [],
  },
  {
    _id: '507f1f77bcf86cd799439016',
    narrative: 'Government compliance audit failing due to missing encryption on data at rest. Deadline in 48 hours.',
    city: 'Washington',
    state: 'DC',
    category: 'federal',
    serviceIssue: {
      type: 'Compliance Violation',
      severity: 'critical',
    },
    media: [
      { filename: 'audit_report.pdf', type: 'document' },
    ],
  },
  {
    _id: '507f1f77bcf86cd799439017',
    narrative: 'Customer billing discrepancies reported. Duplicate charges appearing on monthly statements.',
    city: 'Phoenix',
    state: 'AZ',
    category: 'consumer',
    serviceIssue: {
      type: 'Billing Error',
      severity: 'high',
    },
    media: [],
  },
  {
    _id: '507f1f77bcf86cd799439018',
    narrative: 'Load balancer routing traffic incorrectly. Some users seeing other users data intermittently.',
    city: 'Chicago',
    state: 'IL',
    category: 'infrastructure',
    serviceIssue: {
      type: 'Routing Error',
      severity: 'critical',
    },
    media: [
      { filename: 'lb_config.json', type: 'text' },
    ],
  },
];

/**
 * Mock media data - independent image search results
 * These represent images with their own embeddings, searchable via vector similarity
 */
const MOCK_MEDIA = [
  {
    _id: 'media_001',
    filename: 'network_outage_dashboard.png',
    caption: 'Network monitoring dashboard showing widespread outage across eastern region',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439019',
    thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=140&fit=crop',
    tags: ['dashboard', 'network', 'monitoring', 'outage'],
  },
  {
    _id: 'media_002',
    filename: 'fiber_cut_site.jpg',
    caption: 'Construction site where fiber optic cable was severed',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439019',
    thumbnail: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=200&h=140&fit=crop',
    tags: ['fiber', 'damage', 'construction', 'cable'],
  },
  {
    _id: 'media_003',
    filename: 'server_room_alert.jpg',
    caption: 'Data center server room with warning lights indicating network failure',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439020',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&h=140&fit=crop',
    tags: ['server', 'datacenter', 'alert', 'network'],
  },
  {
    _id: 'media_004',
    filename: 'traffic_graph_spike.png',
    caption: 'Network traffic analysis showing abnormal patterns before outage',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439011',
    thumbnail: 'https://images.unsplash.com/photo-1551703599-6b3e8379aa8c?w=200&h=140&fit=crop',
    tags: ['traffic', 'analysis', 'graph', 'network'],
  },
  {
    _id: 'media_005',
    filename: 'noc_team_response.jpg',
    caption: 'Network operations center team responding to critical outage',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439020',
    thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=200&h=140&fit=crop',
    tags: ['noc', 'team', 'response', 'operations'],
  },
  {
    _id: 'media_006',
    filename: 'error_logs_screenshot.png',
    caption: 'System logs showing cascade of network timeout errors',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439011',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&h=140&fit=crop',
    tags: ['logs', 'errors', 'timeout', 'system'],
  },
  {
    _id: 'media_007',
    filename: 'router_config.png',
    caption: 'Router configuration showing misconfigured BGP settings',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439018',
    thumbnail: 'https://images.unsplash.com/photo-1606765962248-7ff407b51667?w=200&h=140&fit=crop',
    tags: ['router', 'config', 'bgp', 'settings'],
  },
  {
    _id: 'media_008',
    filename: 'outage_map_regional.png',
    caption: 'Geographic map showing affected regions during network outage',
    category: 'infrastructure',
    incidentId: '507f1f77bcf86cd799439019',
    thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200&h=140&fit=crop',
    tags: ['map', 'outage', 'regional', 'geographic'],
  },
];

// Mock vector score for media (based on tags and caption)
function mediaVectorScore(query, media) {
  const queryLower = query.toLowerCase();
  const queryTokens = new Set(tokenize(query));
  let score = 0.25; // base score

  // Check tags
  for (const tag of media.tags) {
    if (queryTokens.has(tag) || queryLower.includes(tag)) {
      score += 0.15;
    }
  }

  // Check caption
  const captionTokens = tokenize(media.caption);
  const captionMatches = captionTokens.filter(t => queryTokens.has(t));
  score += captionMatches.length * 0.1;

  // Category boost
  if (queryLower.includes('network') && media.category === 'infrastructure') score += 0.15;
  if (queryLower.includes('outage') && media.caption.toLowerCase().includes('outage')) score += 0.2;

  return Math.min(score, 0.99);
}

// Simple tokenizer
function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Mock embedding (just return random-ish numbers based on query)
function mockEmbed(text) {
  const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: 8 }, (_, i) =>
    Math.sin(hash * (i + 1) * 0.1) * 0.5 + Math.cos(hash * (i + 2) * 0.05) * 0.5
  );
}

// Score based on keyword overlap
function lexicalScore(query, narrative) {
  const queryTokens = new Set(tokenize(query));
  const narrativeTokens = tokenize(narrative);
  const matches = narrativeTokens.filter(t => queryTokens.has(t));
  return Math.min(matches.length / queryTokens.size, 1);
}

// Mock semantic similarity (based on category/type matching)
function vectorScore(query, incident) {
  const queryLower = query.toLowerCase();
  let score = 0.3; // base score

  // Boost for category-related terms
  if (queryLower.includes('network') && incident.category === 'infrastructure') score += 0.3;
  if (queryLower.includes('payment') && incident.narrative.toLowerCase().includes('payment')) score += 0.25;
  if (queryLower.includes('auth') && incident.narrative.toLowerCase().includes('auth')) score += 0.25;
  if (queryLower.includes('database') && incident.narrative.toLowerCase().includes('database')) score += 0.25;
  if (queryLower.includes('customer') && ['consumer', 'business'].includes(incident.category)) score += 0.2;
  if (queryLower.includes('user') && incident.narrative.toLowerCase().includes('user')) score += 0.2;
  if (queryLower.includes('error') || queryLower.includes('fail')) score += 0.15;
  if (queryLower.includes('slow') && incident.narrative.toLowerCase().includes('timeout')) score += 0.2;
  if (queryLower.includes('login') && incident.narrative.toLowerCase().includes('auth')) score += 0.3;
  if (queryLower.includes('access') && incident.narrative.toLowerCase().includes('auth')) score += 0.25;

  return Math.min(score, 0.99);
}

// RRF (Reciprocal Rank Fusion) score
function hybridScore(lexical, vector) {
  const k = 60; // RRF constant
  // Simulate rank-based fusion
  return (1 / (k + (1 - lexical) * 100) + 1 / (k + (1 - vector) * 100)) * 30;
}

// Find matched terms
function findMatchedTerms(query, narrative) {
  const queryTokens = tokenize(query);
  const narrativeTokens = new Set(tokenize(narrative));
  return queryTokens.filter(t => narrativeTokens.has(t));
}

// Generate match reason
function generateMatchReason(query, incident, searchType, scores) {
  if (searchType === 'lexical') {
    const terms = findMatchedTerms(query, incident.narrative);
    if (terms.length > 0) {
      return `Matched keywords: "${terms.join('", "')}"`;
    }
    return 'Partial keyword match via fuzzy matching';
  }

  if (searchType === 'vector') {
    return `Semantically similar to "${query}" - the narrative discusses related concepts even without exact keyword matches`;
  }

  // Hybrid
  if (scores.lexical > 0.3 && scores.vector > 0.5) {
    return `Strong match on both keywords and semantic meaning`;
  } else if (scores.vector > scores.lexical) {
    return `Primarily matched via semantic similarity - understands "${query}" relates to this incident's context`;
  } else {
    return `Primarily matched via keyword overlap with semantic boost`;
  }
}

// Build mock pipeline JSON
function buildPipeline(searchType, query, tokens) {
  if (searchType === 'lexical') {
    return [
      {
        $search: {
          index: 'incident_search_index',
          text: {
            query: query,
            path: 'narrative',
            fuzzy: { maxEdits: 1 }
          }
        }
      },
      {
        $project: {
          _id: 1,
          narrative: 1,
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
    return [
      {
        $vectorSearch: {
          index: 'narrative_vector_index',
          path: 'embedding',
          queryVector: mockEmbed(query),
          numCandidates: 100,
          limit: 20
        }
      },
      {
        $project: {
          _id: 1,
          narrative: 1,
          city: 1,
          state: 1,
          category: 1,
          serviceIssue: 1,
          score: { $meta: 'vectorSearchScore' }
        }
      }
    ];
  }

  // Hybrid
  return [
    {
      $search: {
        index: 'hybrid_search_index',
        compound: {
          should: [
            {
              text: {
                query: query,
                path: 'narrative',
                score: { boost: { value: 1 } }
              }
            }
          ],
          must: [
            {
              vectorSearch: {
                queryVector: mockEmbed(query),
                path: 'embedding',
                numCandidates: 100
              }
            }
          ]
        }
      }
    },
    {
      $project: {
        _id: 1,
        narrative: 1,
        city: 1,
        state: 1,
        category: 1,
        serviceIssue: 1,
        score: { $meta: 'searchScore' }
      }
    }
  ];
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

    // Score and rank incident results
    const scoredIncidents = MOCK_INCIDENTS.map(incident => {
      const lex = lexicalScore(query, incident.narrative);
      return {
        ...incident,
        scores: { lexical: lex },
        matchedTerms: findMatchedTerms(query, incident.narrative),
        matchReason: generateMatchReason(query, incident, 'lexical', { lexical: lex }),
      };
    });

    const incidents = scoredIncidents
      .filter(r => r.scores.lexical > 0.1)
      .sort((a, b) => b.scores.lexical - a.scores.lexical)
      .slice(0, limit);

    // Score and rank media results (lexical on caption/tags)
    const scoredMedia = MOCK_MEDIA.map(media => {
      const captionScore = lexicalScore(query, media.caption);
      const tagScore = media.tags.some(t => query.toLowerCase().includes(t)) ? 0.3 : 0;
      const lex = Math.min(captionScore + tagScore, 0.99);
      return {
        ...media,
        scores: { lexical: lex },
        matchedTerms: findMatchedTerms(query, media.caption),
      };
    });

    const mediaResults = scoredMedia
      .filter(r => r.scores.lexical > 0.1)
      .sort((a, b) => b.scores.lexical - a.scores.lexical)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'lexical',
      tokenization: tokens,
      embedding: null,
      pipeline: buildPipeline('lexical', query, tokens),
      incidents,
      media: mediaResults,
    });
  });

  // Vector search endpoint
  router.post('/search/vector', async (req, res) => {
    const { query, limit = 20 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const tokens = tokenize(query);
    const embedding = mockEmbed(query);

    // Score and rank incident results
    const scoredIncidents = MOCK_INCIDENTS.map(incident => {
      const vec = vectorScore(query, incident);
      return {
        ...incident,
        scores: { vector: vec },
        matchedTerms: [],
        matchReason: generateMatchReason(query, incident, 'vector', { vector: vec }),
      };
    });

    const incidents = scoredIncidents
      .sort((a, b) => b.scores.vector - a.scores.vector)
      .slice(0, limit);

    // Score and rank media results (vector similarity on image embeddings)
    const scoredMedia = MOCK_MEDIA.map(media => {
      const vec = mediaVectorScore(query, media);
      return {
        ...media,
        scores: { vector: vec },
        matchedTerms: [],
      };
    });

    const mediaResults = scoredMedia
      .sort((a, b) => b.scores.vector - a.scores.vector)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'vector',
      tokenization: tokens,
      embedding,
      pipeline: buildPipeline('vector', query, tokens),
      incidents,
      media: mediaResults,
    });
  });

  // Hybrid search endpoint
  router.post('/search/hybrid', async (req, res) => {
    const { query, limit = 20 } = req.body;

    if (!query?.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const tokens = tokenize(query);
    const embedding = mockEmbed(query);

    // Score and rank incident results
    const scoredIncidents = MOCK_INCIDENTS.map(incident => {
      const lex = lexicalScore(query, incident.narrative);
      const vec = vectorScore(query, incident);
      const hyb = hybridScore(lex, vec);

      return {
        ...incident,
        scores: {
          lexical: lex,
          vector: vec,
          hybrid: Math.min(hyb, 0.99)
        },
        matchedTerms: findMatchedTerms(query, incident.narrative),
        matchReason: generateMatchReason(query, incident, 'hybrid', { lexical: lex, vector: vec }),
      };
    });

    const incidents = scoredIncidents
      .sort((a, b) => b.scores.hybrid - a.scores.hybrid)
      .slice(0, limit);

    // Score and rank media results (hybrid on image embeddings + caption)
    const scoredMedia = MOCK_MEDIA.map(media => {
      const lex = lexicalScore(query, media.caption);
      const vec = mediaVectorScore(query, media);
      const hyb = hybridScore(lex, vec);

      return {
        ...media,
        scores: {
          lexical: lex,
          vector: vec,
          hybrid: Math.min(hyb, 0.99)
        },
        matchedTerms: findMatchedTerms(query, media.caption),
      };
    });

    const mediaResults = scoredMedia
      .sort((a, b) => b.scores.hybrid - a.scores.hybrid)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'hybrid',
      tokenization: tokens,
      embedding,
      pipeline: buildPipeline('hybrid', query, tokens),
      incidents,
      media: mediaResults,
    });
  });

  return router;
}
