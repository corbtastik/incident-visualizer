/**
 * SearchShell - Main search interface (Screens 1 & 2)
 *
 * Layout matches mockup:
 * - Top header bar (full width) with search + results banner
 * - Results strip under header
 * - Left rail (300px) with filters
 * - Center (map + UMAP)
 * - Right rail (380px) with live feeds + donut
 *
 * Data wiring:
 * - All counts from searchResults.counts
 * - Results from searchResults.modes[mode].results
 * - Join key is ticketRef (not _id)
 * - Provenance values: lexicalOnly, semanticOnly, bothPipelines
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMockData } from '../hooks/useMockData';
import { useMapSettings } from '../context/MapSettingsContext';
import { CATEGORY_COLORS_RGBA, CATEGORY_COLORS, getCategoryColor, MODE_COLOR } from '../utils/colors';
import { MAP_CONFIG, CATEGORIES } from '../utils/constants';
import { ScatterplotLayer } from '@deck.gl/layers';

// Number of feed cards to render
const FEED_CARD_COUNT = 3;

// Live feed counter interval (ms)
const FEED_TICK_INTERVAL = 2500;

export default function SearchShell() {
  const navigate = useNavigate();
  const { incidents, clusters, searchResults, umapCoords, loading, resultsByTicketRef } = useMockData();
  const { dotSize } = useMapSettings();

  // Get detected cluster (if any)
  const detectedCluster = clusters?.[0] || null;

  // Search state
  const [searchMode, setSearchMode] = useState('hybrid');
  const [searchQuery] = useState(searchResults?.query || 'backhoe damage near SE-MCA-2211');
  const [relevanceBlend, setRelevanceBlend] = useState(0.62);
  const [compareMode, setCompareMode] = useState(false);

  // Filter state
  const [categories, setCategories] = useState({
    business: true,
    consumer: true,
    emerging_tech: true,
    federal: true,
    infrastructure: true,
  });
  const [severities, setSeverities] = useState(['p1', 'p2', 'p3', 'p4']);
  const [activePatterns] = useState(['hs', 'vs', 'mf']);

  // Map state
  const [hoverInfo, setHoverInfo] = useState(null);
  const [viewState, setViewState] = useState(MAP_CONFIG.initialViewState);

  // Rolling live feed counter - independent of search mode
  const [feedEventCount, setFeedEventCount] = useState(323);
  useEffect(() => {
    const interval = setInterval(() => {
      setFeedEventCount(prev => prev + 1);
    }, FEED_TICK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Counts from fixture (source of truth)
  const counts = searchResults?.counts || {};
  const corpusTotal = searchResults?.corpusTotal || 323;

  // Get mode results - each mode has its own results array
  const modeResults = useMemo(() => {
    const modes = searchResults?.modes || {};
    return {
      lexical: modes.lexical?.results || [],
      semantic: modes.semantic?.results || [],
      hybrid: modes.hybrid?.results || [],
    };
  }, [searchResults]);

  // Build provenance lookup from hybrid results (the superset)
  const provenanceByTicketRef = useMemo(() => {
    const map = {};
    modeResults.hybrid.forEach(r => {
      map[r.ticketRef] = r.provenance;
    });
    return map;
  }, [modeResults]);

  // Get current mode's results as incident objects
  const currentModeResults = useMemo(() => {
    const resultList = modeResults[searchMode] || [];
    return resultList.map(r => {
      const inc = incidents.find(i => i.serviceIssue?.ticketRef === r.ticketRef);
      return inc ? { ...inc, _result: r } : null;
    }).filter(Boolean);
  }, [modeResults, searchMode, incidents]);

  // Apply category/severity filters to current mode results
  const filteredResults = useMemo(() => {
    return currentModeResults.filter(inc => {
      if (!categories[inc.serviceIssue?.category]) return false;
      if (!severities.includes(inc.serviceIssue?.severity)) return false;
      return true;
    });
  }, [currentModeResults, categories, severities]);

  // All incidents for map (full corpus), with provenance info
  const allIncidentsWithProvenance = useMemo(() => {
    return incidents.map(inc => ({
      ...inc,
      provenance: provenanceByTicketRef[inc.serviceIssue?.ticketRef] || null,
    }));
  }, [incidents, provenanceByTicketRef]);

  // Filtered for map display (by category/severity, but show all corpus)
  const mapIncidents = useMemo(() => {
    return allIncidentsWithProvenance.filter(inc => {
      if (!categories[inc.serviceIssue?.category]) return false;
      if (!severities.includes(inc.serviceIssue?.severity)) return false;
      return true;
    });
  }, [allIncidentsWithProvenance, categories, severities]);

  // Create map layers with provenance-based rings
  const layers = useMemo(() => {
    const showRings = searchMode === 'hybrid' || compareMode;
    const layerList = [];

    // Scale factors relative to base dotSize
    const notMatchedSize = dotSize * 0.64;
    const innerRingRadius = dotSize * 1.45;
    const outerRingRadius = dotSize * 2.27;
    const innerRingWidth = Math.max(2, dotSize * 0.64);
    const outerRingWidth = Math.max(2, dotSize * 0.45);

    // Outer ring layer (for bothPipelines) - renders first (underneath)
    if (showRings) {
      layerList.push(new ScatterplotLayer({
        id: 'incident-rings-outer',
        data: mapIncidents.filter(d => d.provenance === 'bothPipelines'),
        pickable: false,
        opacity: 1,
        stroked: true,
        filled: false,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: d => [d.lng, d.lat],
        getRadius: outerRingRadius,
        getLineWidth: outerRingWidth,
        getLineColor: [165, 243, 252, 255], // #A5F3FC
      }));

      // Inner ring layer (for semanticOnly and bothPipelines)
      layerList.push(new ScatterplotLayer({
        id: 'incident-rings-inner',
        data: mapIncidents.filter(d =>
          d.provenance === 'semanticOnly' || d.provenance === 'bothPipelines'
        ),
        pickable: false,
        opacity: 1,
        stroked: true,
        filled: false,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: d => [d.lng, d.lat],
        getRadius: innerRingRadius,
        getLineWidth: innerRingWidth,
        getLineColor: [34, 211, 238, 255], // #22D3EE
      }));
    }

    // Main dot layer (category fill, provenance-based radius)
    layerList.push(new ScatterplotLayer({
      id: 'incidents',
      data: mapIncidents,
      pickable: true,
      stroked: false,
      filled: true,
      radiusUnits: 'pixels',
      getPosition: d => [d.lng, d.lat],
      getRadius: d => {
        if (!d.provenance) return notMatchedSize; // notMatched: smaller
        return dotSize; // all matched incidents
      },
      getFillColor: d => {
        const baseColor = CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200];
        if (!d.provenance) {
          // notMatched: 25% opacity
          return [baseColor[0], baseColor[1], baseColor[2], 64];
        }
        return baseColor;
      },
      updateTriggers: {
        getRadius: [provenanceByTicketRef, dotSize],
        getFillColor: [provenanceByTicketRef],
      },
    }));

    return layerList;
  }, [mapIncidents, provenanceByTicketRef, searchMode, compareMode, dotSize]);

  const handleIncidentClick = useCallback((info) => {
    if (info.object) {
      const ticketRef = info.object.serviceIssue?.ticketRef;
      if (ticketRef) navigate(`/incident/${ticketRef}`);
    }
  }, [navigate]);

  // Category counts from full corpus
  const categoryCounts = useMemo(() => {
    const result = {};
    CATEGORIES.forEach(cat => {
      result[cat] = incidents.filter(inc => inc.serviceIssue?.category === cat).length;
    });
    return result;
  }, [incidents]);

  // All UMAP points (full corpus, 323 points)
  // Sorted: unmatched first, then matched (so matched render on top in SVG)
  const allUmapPoints = useMemo(() => {
    const points = incidents
      .filter(inc => {
        const ticketRef = inc.serviceIssue?.ticketRef;
        return ticketRef && umapCoords?.[ticketRef];
      })
      .map(inc => {
        const ticketRef = inc.serviceIssue?.ticketRef;
        const coords = umapCoords[ticketRef];
        const provenance = provenanceByTicketRef[ticketRef] || null;
        return {
          ticketRef,
          x: coords.x || 0,
          y: coords.y || 0,
          category: inc.serviceIssue?.category,
          type: inc.serviceIssue?.type,
          provenance,
        };
      });
    // Sort: unmatched (null provenance) first, matched last (renders on top)
    return points.sort((a, b) => {
      if (!a.provenance && b.provenance) return -1;
      if (a.provenance && !b.provenance) return 1;
      return 0;
    });
  }, [incidents, umapCoords, provenanceByTicketRef]);

  // UMAP extent - compute actual x/y range for proper scaling
  const umapExtent = useMemo(() => {
    if (allUmapPoints.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const xs = allUmapPoints.map(p => p.x);
    const ys = allUmapPoints.map(p => p.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }, [allUmapPoints]);

  // Category type counts for UMAP legend
  const categoryTypeCounts = useMemo(() => {
    const result = { consumer: {}, infrastructure: {}, business: {}, federal: {}, emerging_tech: {} };
    incidents.forEach(inc => {
      const cat = inc.serviceIssue?.category;
      const type = inc.serviceIssue?.type;
      if (cat && type) {
        if (!result[cat]) result[cat] = {};
        result[cat][type] = (result[cat][type] || 0) + 1;
      }
    });
    return result;
  }, [incidents]);

  // Donut chart calculations from counts
  const donutData = useMemo(() => {
    const { lexicalOnly = 0, semanticOnly = 0, bothPipelines = 0, notMatched = 0, hybridTotal = 0 } = counts;
    const total = lexicalOnly + semanticOnly + bothPipelines + notMatched;
    if (total === 0) return { segments: [], hybridTotal: 0 };

    const circumference = 2 * Math.PI * 42; // r=42
    const toArc = (count) => (count / total) * circumference;

    return {
      hybridTotal,
      bothArc: toArc(bothPipelines),
      semanticArc: toArc(semanticOnly),
      lexicalArc: toArc(lexicalOnly),
      notMatchedArc: toArc(notMatched),
      bothOffset: 0,
      semanticOffset: -toArc(bothPipelines),
      lexicalOffset: -toArc(bothPipelines) - toArc(semanticOnly),
    };
  }, [counts]);

  // Get per-mode results for compare panes
  const lexicalResults = useMemo(() => {
    return modeResults.lexical.map(r => {
      const inc = incidents.find(i => i.serviceIssue?.ticketRef === r.ticketRef);
      return inc ? { ...inc, _result: r } : null;
    }).filter(Boolean);
  }, [modeResults.lexical, incidents]);

  // Semantic pane in compare mode: only semanticOnly results (not bothPipelines)
  const semanticResults = useMemo(() => {
    return modeResults.semantic
      .filter(r => r.provenance === 'semanticOnly')
      .map(r => {
        const inc = incidents.find(i => i.serviceIssue?.ticketRef === r.ticketRef);
        return inc ? { ...inc, _result: r } : null;
      }).filter(Boolean);
  }, [modeResults.semantic, incidents]);

  const hybridResults = useMemo(() => {
    return modeResults.hybrid.map(r => {
      const inc = incidents.find(i => i.serviceIssue?.ticketRef === r.ticketRef);
      return inc ? { ...inc, _result: r } : null;
    }).filter(Boolean);
  }, [modeResults.hybrid, incidents]);

  // Feed cards - always show first N from hybrid results
  const feedIncidents = hybridResults.slice(0, FEED_CARD_COUNT);

  return (
    <div className="search-shell">
      {/* ══════════════════════════════════════════════════════════════════
          RESULTS BANNER
          ══════════════════════════════════════════════════════════════════ */}
      <div className="results-banner">
        <div className="results-banner__stats">
          <span className="results-banner__stat">
            <span className="results-banner__label">FOUND BY KEYWORD</span>
            <span className="results-banner__value">{counts.lexicalTotal || 0}</span>
          </span>
          <span className="results-banner__stat results-banner__stat--highlight">
            <span className="results-banner__label">ADDED BY MEANING</span>
            <span className="results-banner__value">+{counts.semanticOnly || 0}</span>
          </span>
          <span className="results-banner__stat results-banner__stat--primary">
            <span className="results-banner__label">TOTAL</span>
            <span className="results-banner__value">{counts.hybridTotal || 0}</span>
          </span>
        </div>
        <div className="results-banner__recall">
          recall +{counts.recallLiftPct || 0}% vs lexical
        </div>

        {/* Ranked result cards - from current mode */}
        <div className="results-banner__cards">
          {filteredResults.slice(0, 6).map((inc, idx) => {
            const result = inc._result;
            const score = result?.fusedScore ?? result?.vectorScore ?? result?.lexicalScore ?? 0;
            const isTop = idx === 0;
            return (
              <div
                key={inc.serviceIssue?.ticketRef}
                className={`results-banner__card ${isTop ? 'results-banner__card--top' : ''}`}
                onClick={() => navigate(`/incident/${inc.serviceIssue?.ticketRef}`)}
              >
                <div className="results-banner__card-rank">
                  #{idx + 1}
                  <span
                    className="results-banner__card-dot"
                    style={{ backgroundColor: getCategoryColor(inc.serviceIssue?.category) }}
                  />
                </div>
                <div className="results-banner__card-score">{score.toFixed(3)}</div>
                <div className="results-banner__card-ticket">{inc.serviceIssue?.ticketRef}</div>
                <div className="results-banner__card-type">{inc.serviceIssue?.type}</div>
                <div className="results-banner__card-city">{inc.city}</div>
              </div>
            );
          })}
          <div className="results-banner__more">
            select a result to inspect →
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ══════════════════════════════════════════════════════════════════ */}
      <div className="search-main">
        {/* LEFT RAIL */}
        <aside className="search-rail">
          {/* Search Mode - 2x2 Grid */}
          <div className="search-rail__section">
            <div className="search-rail__label">SEARCH MODE</div>
            <div className="search-mode-grid">
              <button
                className={`search-mode-grid__btn ${searchMode === 'lexical' && !compareMode ? 'search-mode-grid__btn--active' : ''}`}
                onClick={() => { setSearchMode('lexical'); setCompareMode(false); }}
              >
                Lexical
              </button>
              <button
                className={`search-mode-grid__btn ${searchMode === 'semantic' && !compareMode ? 'search-mode-grid__btn--active' : ''}`}
                onClick={() => { setSearchMode('semantic'); setCompareMode(false); }}
              >
                Semantic
              </button>
              <button
                className={`search-mode-grid__btn ${searchMode === 'hybrid' && !compareMode ? 'search-mode-grid__btn--active' : ''}`}
                onClick={() => { setSearchMode('hybrid'); setCompareMode(false); }}
              >
                Hybrid
              </button>
              <button
                className={`search-mode-grid__btn ${compareMode ? 'search-mode-grid__btn--active' : ''}`}
                onClick={() => setCompareMode(!compareMode)}
              >
                Compare
              </button>
            </div>
          </div>

          {/* Relevance Blend */}
          <div className="search-rail__section">
            <div className="search-rail__label">RELEVANCE BLEND</div>
            <div className="relevance-blend">
              <div className="relevance-blend__track-labels">
                <span className="relevance-blend__label">Exact</span>
                <span className="relevance-blend__label">Conceptual</span>
              </div>
              <div className="relevance-blend__slider-container">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={relevanceBlend}
                  onChange={(e) => setRelevanceBlend(parseFloat(e.target.value))}
                  className="relevance-blend__slider"
                />
              </div>
              <div className="relevance-blend__values">
                <span className="relevance-blend__value">
                  lexical <span className="relevance-blend__num">{(1 - relevanceBlend).toFixed(2)}</span>
                </span>
                <span className="relevance-blend__dot">·</span>
                <span className="relevance-blend__value">
                  semantic <span className="relevance-blend__num">{relevanceBlend.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="search-rail__section">
            <div className="search-rail__label">CATEGORIES</div>
            <div className="category-filters">
              {CATEGORIES.map(cat => (
                <label key={cat} className="category-filters__item">
                  <input
                    type="checkbox"
                    checked={categories[cat]}
                    onChange={(e) => setCategories(prev => ({ ...prev, [cat]: e.target.checked }))}
                    className="category-filters__checkbox"
                  />
                  <span
                    className="category-filters__dot"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                  />
                  <span className="category-filters__name">
                    {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <span className="category-filters__count">{categoryCounts[cat] || 0}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="search-rail__section">
            <div className="search-rail__label">SEVERITY</div>
            <div className="severity-pills">
              {['p1', 'p2', 'p3', 'p4'].map(sev => (
                <button
                  key={sev}
                  className={`severity-pills__pill ${severities.includes(sev) ? 'severity-pills__pill--active' : ''}`}
                  onClick={() => {
                    setSeverities(prev =>
                      prev.includes(sev) ? prev.filter(s => s !== sev) : [...prev, sev]
                    );
                  }}
                >
                  {sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Active Patterns */}
          <div className="search-rail__section">
            <div className="search-rail__label">ACTIVE PATTERNS</div>
            <div className="active-patterns">
              {[
                { id: 'hs', code: '5A', label: 'Hybrid Search' },
                { id: 'vs', code: '6T', label: 'Vector Similarity' },
                { id: 'mf', code: '6T', label: 'Metadata-Filtered Retrieval' },
                { id: 'si', code: '1T', label: 'Streaming Ingestion' },
                { id: 'ir', code: '1T', label: 'Incremental Re-embedding' },
                { id: 'ce', code: '2E', label: 'CDC + Embedding Pipeline' },
              ].map(pattern => (
                <div
                  key={pattern.id}
                  className={`active-patterns__item ${activePatterns.includes(pattern.id) ? 'active-patterns__item--active' : ''}`}
                >
                  <span className="active-patterns__dot" />
                  <span className="active-patterns__code">{pattern.code}</span>
                  <span className="active-patterns__name">{pattern.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="search-rail__footer">
            <img
              src="https://webimages.mongodb.com/_com_assets/cms/kuyjf3vea2hg34taa-horizontal_default_slate_blue.svg"
              alt="MongoDB"
              className="search-rail__logo"
            />
            <span className="search-rail__footer-text">Atlas</span>
          </div>
        </aside>

        {/* CENTER - Map + UMAP OR Compare View */}
        <main className="search-center">
          {compareMode ? (
            /* ════════════════════════════════════════════════════════════
               COMPARE VIEW - Three Panes
               ════════════════════════════════════════════════════════════ */
            <div className="compare-view">
              {/* Three Pipeline Panes */}
              <div className="compare-panes">
                {/* LEXICAL Pane */}
                <div className="compare-pane compare-pane--lexical">
                  <div className="compare-pane__header" style={{ color: MODE_COLOR.lexical }}>LEXICAL</div>
                  <div className="compare-pane__code">
                    <div className="compare-pane__code-line">Search: <span className="code-key">text_operator</span></div>
                    <pre className="compare-pane__pre">{`{
  $search: {
    index: "inc_text",
    text: {
      query: "${searchQuery}",
      path: ["searchBlob"]
    }
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">latency:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.lexical?.latencyMs || 0}ms</span>
                    <span className="compare-pane__meta-label">indexes:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.lexical?.indexes || 1}</span>
                  </div>
                  <div className="compare-pane__count">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.lexical }}>{modeResults.lexical.length}</span>
                    <span className="compare-pane__count-label">of {corpusTotal}</span>
                  </div>
                  <div className="compare-pane__results">
                    {lexicalResults.slice(0, 4).map((inc, idx) => (
                      <div key={inc.serviceIssue?.ticketRef} className="compare-pane__result">
                        <span className="compare-pane__result-rank">#{idx + 1}</span>
                        <span
                          className="compare-pane__result-dot"
                          style={{ backgroundColor: getCategoryColor(inc.serviceIssue?.category) }}
                        />
                        <span className="compare-pane__result-ticket">{inc.serviceIssue?.ticketRef}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEMANTIC Pane */}
                <div className="compare-pane compare-pane--semantic">
                  <div className="compare-pane__header" style={{ color: MODE_COLOR.semantic }}>SEMANTIC</div>
                  <div className="compare-pane__code">
                    <div className="compare-pane__code-line">$vectorSearch: <span className="code-key">{searchResults?.embeddingModel || 'voyage-4'}</span></div>
                    <pre className="compare-pane__pre">{`{
  $vectorSearch: {
    index: "inc_vec",
    path: "embedding.vector",
    queryVector: [...]
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">latency:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.semantic?.latencyMs || 0}ms</span>
                    <span className="compare-pane__meta-label">indexes:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.semantic?.indexes || 1}</span>
                  </div>
                  <div className="compare-pane__count">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.semantic }}>{modeResults.semantic.length}</span>
                    <span className="compare-pane__count-label">of {corpusTotal}</span>
                  </div>
                  <div className="compare-pane__results">
                    {semanticResults.slice(0, 4).map((inc, idx) => (
                      <div key={inc.serviceIssue?.ticketRef} className="compare-pane__result">
                        <span className="compare-pane__result-rank">#{idx + 1}</span>
                        <span
                          className="compare-pane__result-dot"
                          style={{ backgroundColor: getCategoryColor(inc.serviceIssue?.category) }}
                        />
                        <span className="compare-pane__result-ticket">{inc.serviceIssue?.ticketRef}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* HYBRID Pane */}
                <div className="compare-pane compare-pane--highlight">
                  <div className="compare-pane__header" style={{ color: MODE_COLOR.hybrid }}>HYBRID</div>
                  <div className="compare-pane__code">
                    <div className="compare-pane__code-line">$rankFusion: <span className="code-key">weights</span></div>
                    <pre className="compare-pane__pre">{`{
  input: pipelines: [ lexical, semantic ],
  combination: {
    weights: { lexical: ${searchResults?.modes?.hybrid?.weights?.lexical || 0.38}, semantic: ${searchResults?.modes?.hybrid?.weights?.semantic || 0.62} }
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">latency:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.hybrid?.latencyMs || 0}ms</span>
                    <span className="compare-pane__meta-label">indexes:</span>
                    <span className="compare-pane__meta-value">{searchResults?.modes?.hybrid?.indexes || 2}</span>
                  </div>
                  <div className="compare-pane__count compare-pane__count--highlight">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.hybrid }}>{modeResults.hybrid.length}</span>
                    <span className="compare-pane__count-label">of {corpusTotal}</span>
                  </div>
                  <div className="compare-pane__subtitle">
                    {counts.lexicalOnly || 0} lexical-only + {counts.semanticOnly || 0} semantic-only + {counts.bothPipelines || 0} both
                  </div>
                  <div className="compare-pane__results">
                    {hybridResults.slice(0, 4).map((inc, idx) => (
                      <div key={inc.serviceIssue?.ticketRef} className="compare-pane__result">
                        <span className="compare-pane__result-rank">#{idx + 1}</span>
                        <span
                          className="compare-pane__result-dot"
                          style={{ backgroundColor: getCategoryColor(inc.serviceIssue?.category) }}
                        />
                        <span className="compare-pane__result-ticket">{inc.serviceIssue?.ticketRef}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result Overlap Section */}
              <div className="result-overlap">
                <div className="result-overlap__header">RESULT OVERLAP</div>
                <div className="result-overlap__content">
                  {/* Horizontal Bar Venn */}
                  <div className="result-overlap__bar-venn">
                    <div className="result-overlap__bar">
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--lexical" style={{ flex: counts.lexicalOnly || 1 }}>
                        <span className="result-overlap__bar-label">lexical only</span>
                        <span className="result-overlap__bar-value">{counts.lexicalOnly || 0}</span>
                      </div>
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--both" style={{ flex: counts.bothPipelines || 1 }}>
                        <span className="result-overlap__bar-value">{counts.bothPipelines || 0}</span>
                      </div>
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--semantic" style={{ flex: counts.semanticOnly || 1 }}>
                        <span className="result-overlap__bar-label">semantic only</span>
                        <span className="result-overlap__bar-value">{counts.semanticOnly || 0}</span>
                      </div>
                    </div>
                    <div className="result-overlap__bar-legend">
                      <span className="result-overlap__bar-legend-item">
                        <span className="result-overlap__dot result-overlap__dot--lexical" />
                        lexical only
                      </span>
                      <span className="result-overlap__bar-legend-item">
                        <span className="result-overlap__dot result-overlap__dot--semantic" />
                        semantic only
                      </span>
                      <span className="result-overlap__bar-legend-item">
                        <span className="result-overlap__dot result-overlap__dot--both" />
                        both
                      </span>
                    </div>
                  </div>
                  <div className="result-overlap__metrics">
                    <div className="result-overlap__metric">
                      <span className="result-overlap__metric-label">recall vs lexical</span>
                      <span className="result-overlap__metric-value result-overlap__metric-value--positive">+{counts.recallLiftPct || 0}%</span>
                    </div>
                    <div className="result-overlap__metric">
                      <span className="result-overlap__metric-label">exact ID retained</span>
                      <span className="result-overlap__metric-value">yes</span>
                    </div>
                    <div className="result-overlap__metric">
                      <span className="result-overlap__metric-label">added latency</span>
                      <span className="result-overlap__metric-value">+{(searchResults?.modes?.hybrid?.latencyMs || 0) - (searchResults?.modes?.lexical?.latencyMs || 0)}ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ════════════════════════════════════════════════════════════
               NORMAL VIEW - Map + UMAP
               ════════════════════════════════════════════════════════════ */
            <>
              <div className="search-center__map">
                <DeckGL
                  viewState={viewState}
                  onViewStateChange={({ viewState }) => setViewState(viewState)}
                  controller={true}
                  layers={layers}
                  onClick={handleIncidentClick}
                  onHover={(info) => {
                    if (info.object) {
                      setHoverInfo({ x: info.x, y: info.y, object: info.object });
                    } else {
                      setHoverInfo(null);
                    }
                  }}
                >
                  <Map
                    reuseMaps
                    mapLib={maplibregl}
                    mapStyle={MAP_CONFIG.darkStyle}
                  />
                </DeckGL>

                {hoverInfo && (
                  <div
                    className="map-tooltip"
                    style={{ left: hoverInfo.x + 16, top: hoverInfo.y + 16 }}
                  >
                    <div className="map-tooltip__ticket">
                      {hoverInfo.object.serviceIssue?.ticketRef}
                    </div>
                    <div className="map-tooltip__city">{hoverInfo.object.city}</div>
                    <div className="map-tooltip__type">
                      {hoverInfo.object.serviceIssue?.type}
                    </div>
                  </div>
                )}
              </div>

              {/* UMAP Panel - Bottom of center column - ALL 323 points */}
              <div className="umap-panel">
                <div className="umap-panel__header">
                  <span className="umap-panel__title">SEMANTIC SPACE — UMAP PROJECTION</span>
                  <span className="umap-panel__dims">1,024d → 2d · precomputed</span>
                </div>
                <div className="umap-panel__body">
                  <svg className="umap-panel__svg" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
                    {/* Background grid */}
                    <defs>
                      <pattern id="umap-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a1f24" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="400" height="100" fill="url(#umap-grid)" />

                    {/* All corpus points - matched ones highlighted, scaled to actual data range */}
                    {allUmapPoints.map((pt) => {
                      const rangeX = umapExtent.maxX - umapExtent.minX || 1;
                      const rangeY = umapExtent.maxY - umapExtent.minY || 1;
                      const normX = (pt.x - umapExtent.minX) / rangeX;
                      const normY = (pt.y - umapExtent.minY) / rangeY;
                      return (
                        <circle
                          key={pt.ticketRef}
                          cx={20 + normX * 360}
                          cy={10 + normY * 80}
                          r={pt.provenance ? 4 : 2}
                          fill={getCategoryColor(pt.category)}
                          opacity={pt.provenance ? 0.9 : 0.25}
                        />
                      );
                    })}
                  </svg>
                  <div className="umap-panel__legend">
                    <div className="umap-panel__legend-cat" style={{ color: CATEGORY_COLORS.consumer }}>Consumer</div>
                    <div className="umap-panel__legend-row">
                      Fiber <strong>{categoryTypeCounts.consumer?.fiber || 0}</strong> · broadband <strong>{categoryTypeCounts.consumer?.broadband || 0}</strong>
                    </div>
                    <div className="umap-panel__legend-row">
                      5g <strong>{categoryTypeCounts.consumer?.['5g'] || 0}</strong> · wireless <strong>{categoryTypeCounts.consumer?.wireless || 0}</strong>
                    </div>
                  </div>
                </div>
                <div className="umap-panel__footer">
                  Scattered across many states geographically. One cluster semantically.
                </div>
              </div>
            </>
          )}
        </main>

        {/* RIGHT RAIL */}
        <aside className="feeds-rail">
          <div className="feeds-rail__header">
            <span className="feeds-rail__title">LIVE FEEDS</span>
            <span className="feeds-rail__count">{feedEventCount} events</span>
          </div>

          {/* Systemic Event */}
          {detectedCluster && (
            <div className="systemic-alert">
              <div className="systemic-alert__header">
                <span className="systemic-alert__dot" />
                <span className="systemic-alert__title">SYSTEMIC EVENT DETECTED</span>
              </div>
              <div className="systemic-alert__stats">
                <div>
                  <span>{detectedCluster.stats?.memberCount || 6} incidents</span> ·
                  <span>{detectedCluster.stats?.distinctTypes || 6} types</span> ·
                  <span>{detectedCluster.stats?.distinctCategories || 3} categories</span> ·
                  <span>{detectedCluster.stats?.maxPairwiseKm || 8.2}km</span> ·
                  <span>{detectedCluster.stats?.spanMinutes || 11} min</span>
                </div>
                <div className="systemic-alert__location">{detectedCluster.city}, {detectedCluster.state}</div>
              </div>
              <button
                className="systemic-alert__link"
                onClick={() => navigate(`/cluster/${detectedCluster.clusterId}`)}
              >
                View cluster →
              </button>
            </div>
          )}

          {/* Incident Cards */}
          <div className="feeds-rail__cards">
            {feedIncidents.map(inc => (
              <div
                key={inc.serviceIssue?.ticketRef}
                className="incident-preview"
                onClick={() => navigate(`/incident/${inc.serviceIssue?.ticketRef}`)}
              >
                <div className="incident-preview__header">
                  <span
                    className="incident-preview__dot"
                    style={{ backgroundColor: getCategoryColor(inc.serviceIssue?.category) }}
                  />
                  <span className="incident-preview__category">
                    {inc.serviceIssue?.category?.toUpperCase()} — {inc.serviceIssue?.type?.toUpperCase()}
                  </span>
                </div>
                <div className="incident-preview__ticket">{inc.serviceIssue?.ticketRef} · {inc.city}</div>
                <pre className="incident-preview__json">
{`"ticketRef": "${inc.serviceIssue?.ticketRef}",
"type": "${inc.serviceIssue?.type}",
"severity": "${inc.serviceIssue?.severity}",
"impact": "${inc.serviceIssue?.impact?.count} ${inc.serviceIssue?.impact?.unit}",
"count": ${inc.serviceIssue?.impact?.count}`}
                </pre>
              </div>
            ))}
          </div>

          {/* Bottom section - Donut or Bar Chart */}
          {compareMode ? (
            /* MATCHES BY SERVICE TYPE - Bar Chart */
            <div className="matches-chart">
              <div className="matches-chart__header">
                <span className="matches-chart__title">MATCHES BY SERVICE TYPE</span>
              </div>
              <div className="matches-chart__content">
                <div className="matches-chart__bars">
                  {(() => {
                    // Compute type counts from hybrid results
                    const typeCounts = {};
                    hybridResults.forEach(inc => {
                      const type = inc.serviceIssue?.type;
                      if (type) typeCounts[type] = (typeCounts[type] || 0) + 1;
                    });
                    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                    const max = sorted[0]?.[1] || 1;
                    return sorted.map(([type, count]) => {
                      const inc = hybridResults.find(i => i.serviceIssue?.type === type);
                      const category = inc?.serviceIssue?.category || 'infrastructure';
                      return (
                        <div key={type} className="matches-chart__bar-row">
                          <span className="matches-chart__bar-label">{type}</span>
                          <div className="matches-chart__bar-track">
                            <div
                              className="matches-chart__bar-fill"
                              style={{
                                width: `${(count / max) * 100}%`,
                                backgroundColor: CATEGORY_COLORS[category]
                              }}
                            />
                          </div>
                          <span className="matches-chart__bar-value">{count}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="matches-chart__total">
                  Total: <strong>{counts.hybridTotal || 0}</strong>
                </div>
              </div>
              <div className="matches-chart__footer">
                click a bar to filter
              </div>
            </div>
          ) : (
            /* Result Composition Donut */
            <div className="result-composition">
              <div className="result-composition__title">RESULT COMPOSITION</div>
              <div className="result-composition__content">
                <div className="result-composition__donut">
                  <svg viewBox="0 0 100 100">
                    {/* Outer ring segments - computed from counts */}
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1f24" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.hybrid}
                      strokeWidth="8"
                      strokeDasharray={`${donutData.bothArc} ${2 * Math.PI * 42 - donutData.bothArc}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.semantic}
                      strokeWidth="8"
                      strokeDasharray={`${donutData.semanticArc} ${2 * Math.PI * 42 - donutData.semanticArc}`}
                      strokeDashoffset={donutData.semanticOffset}
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.lexical}
                      strokeWidth="8"
                      strokeDasharray={`${donutData.lexicalArc} ${2 * Math.PI * 42 - donutData.lexicalArc}`}
                      strokeDashoffset={donutData.lexicalOffset}
                      transform="rotate(-90 50 50)"
                    />
                    {/* Center text */}
                    <text x="50" y="46" textAnchor="middle" fill="#E8EDF2" fontSize="18" fontWeight="600">
                      {counts.hybridTotal || 0}
                    </text>
                    <text x="50" y="60" textAnchor="middle" fill={MODE_COLOR.semantic} fontSize="10">
                      +{counts.semanticOnly || 0}
                    </text>
                  </svg>
                </div>
                <div className="result-composition__legend">
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.hybrid }} />
                    <span>both pipelines</span>
                    <span className="result-composition__value">{counts.bothPipelines || 0}</span>
                  </div>
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.semantic }} />
                    <span>semantic only</span>
                    <span className="result-composition__value">{counts.semanticOnly || 0}</span>
                  </div>
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.lexical }} />
                    <span>lexical only</span>
                    <span className="result-composition__value">{counts.lexicalOnly || 0}</span>
                  </div>
                  <div className="result-composition__item result-composition__item--muted">
                    <span className="result-composition__dot" style={{ background: '#3a3f44' }} />
                    <span>not matched</span>
                    <span className="result-composition__value">{counts.notMatched || 0}</span>
                  </div>
                </div>
              </div>
              <div className="result-composition__action">
                click a segment to filter
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
