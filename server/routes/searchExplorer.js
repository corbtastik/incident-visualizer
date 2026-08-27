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

    // Score and rank results
    const scored = MOCK_INCIDENTS.map(incident => {
      const lex = lexicalScore(query, incident.narrative);
      return {
        ...incident,
        scores: { lexical: lex },
        matchedTerms: findMatchedTerms(query, incident.narrative),
        matchReason: generateMatchReason(query, incident, 'lexical', { lexical: lex }),
      };
    });

    // Filter and sort
    const results = scored
      .filter(r => r.scores.lexical > 0.1)
      .sort((a, b) => b.scores.lexical - a.scores.lexical)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'lexical',
      tokenization: tokens,
      embedding: null,
      pipeline: buildPipeline('lexical', query, tokens),
      results,
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

    // Score and rank results
    const scored = MOCK_INCIDENTS.map(incident => {
      const vec = vectorScore(query, incident);
      return {
        ...incident,
        scores: { vector: vec },
        matchedTerms: [], // Vector search doesn't use term matching
        matchReason: generateMatchReason(query, incident, 'vector', { vector: vec }),
      };
    });

    // Sort by vector score
    const results = scored
      .sort((a, b) => b.scores.vector - a.scores.vector)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'vector',
      tokenization: tokens,
      embedding,
      pipeline: buildPipeline('vector', query, tokens),
      results,
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

    // Score and rank results
    const scored = MOCK_INCIDENTS.map(incident => {
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

    // Sort by hybrid score
    const results = scored
      .sort((a, b) => b.scores.hybrid - a.scores.hybrid)
      .slice(0, limit);

    res.json({
      query,
      searchType: 'hybrid',
      tokenization: tokens,
      embedding,
      pipeline: buildPipeline('hybrid', query, tokens),
      results,
    });
  });

  return router;
}
