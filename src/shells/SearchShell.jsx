/**
 * SearchShell - Main search interface (Screens 1 & 2)
 *
 * Layout matches mockup:
 * - Top header bar (full width) with search + results banner
 * - Results strip under header
 * - Left rail (300px) with filters
 * - Center (map + UMAP)
 * - Right rail (380px) with live feeds + donut
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMockData } from '../hooks/useMockData';
import { useMapSettings } from '../context/MapSettingsContext';
import { CATEGORY_COLORS_RGBA, CATEGORY_COLORS, getCategoryColor, MODE_COLOR, PIN, getPinConfig } from '../utils/colors';
import { MAP_CONFIG, SEARCH_MODES, CATEGORIES } from '../utils/constants';
import { ScatterplotLayer } from '@deck.gl/layers';

export default function SearchShell() {
  const navigate = useNavigate();
  const { incidents, clusters, searchResults, umapCoords, loading } = useMockData();
  const { dotSize } = useMapSettings();

  // Get detected cluster (if any)
  const detectedCluster = clusters?.[0] || null;

  // Search state
  const [searchMode, setSearchMode] = useState('hybrid');
  const [searchQuery, setSearchQuery] = useState('backhoe damage near SE-MCA-2211');
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

  // Get filtered results
  const filteredIncidents = useMemo(() => {
    if (!searchResults) return incidents;
    const resultIds = new Set(searchResults[searchMode]?.results || []);
    return incidents.filter(inc => {
      if (resultIds.size > 0 && !resultIds.has(inc._id)) return false;
      if (!categories[inc.serviceIssue?.category]) return false;
      if (!severities.includes(inc.serviceIssue?.severity)) return false;
      return true;
    });
  }, [incidents, searchResults, searchMode, categories, severities]);

  // Create map layers with provenance-based rings
  const layers = useMemo(() => {
    const showRings = searchMode === 'hybrid' || compareMode;
    const layerList = [];

    // Helper to get provenance for an incident
    const getProvenance = (d) => searchResults?.provenance?.[d._id] || null;

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
        data: filteredIncidents.filter(d => getProvenance(d) === 'both'),
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
        data: filteredIncidents.filter(d => {
          const p = getProvenance(d);
          return p === 'semantic' || p === 'both';
        }),
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
      data: filteredIncidents,
      pickable: true,
      stroked: false,
      filled: true,
      radiusUnits: 'pixels',
      getPosition: d => [d.lng, d.lat],
      getRadius: d => {
        const provenance = getProvenance(d);
        if (!provenance) return notMatchedSize; // notMatched: smaller
        return dotSize; // all matched incidents
      },
      getFillColor: d => {
        const provenance = getProvenance(d);
        const baseColor = CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200];
        if (!provenance) {
          // notMatched: 25% opacity
          return [baseColor[0], baseColor[1], baseColor[2], 64];
        }
        return baseColor;
      },
      updateTriggers: {
        getRadius: [searchResults?.provenance, dotSize],
        getFillColor: [searchResults?.provenance],
      },
    }));

    return layerList;
  }, [filteredIncidents, searchResults, searchMode, compareMode, dotSize]);

  const handleIncidentClick = useCallback((info) => {
    if (info.object) navigate(`/incident/${info.object._id}`);
  }, [navigate]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach(cat => {
      counts[cat] = incidents.filter(inc => inc.serviceIssue?.category === cat).length;
    });
    return counts;
  }, [incidents]);

  // Results summary
  const resultsSummary = useMemo(() => {
    if (!searchResults) return { lexicalCount: 6, semanticCount: 15, hybridCount: 21, both: 4, lexical: 2, semantic: 15 };
    const lexicalCount = searchResults.lexical?.results?.length || 6;
    const semanticCount = searchResults.semantic?.results?.length || 15;
    const hybridCount = searchResults.hybrid?.results?.length || 21;
    const provenance = searchResults.provenance || {};
    const counts = { lexical: 0, semantic: 0, both: 0 };
    Object.values(provenance).forEach(p => {
      if (p === 'lexical') counts.lexical++;
      else if (p === 'semantic') counts.semantic++;
      else if (p === 'both') counts.both++;
    });
    return { lexicalCount, semanticCount, hybridCount, ...counts };
  }, [searchResults]);

  // UMAP points for scatter
  const umapPoints = useMemo(() => {
    return filteredIncidents
      .filter(inc => umapCoords?.[inc._id])
      .map(inc => {
        const coords = umapCoords[inc._id];
        return {
          id: inc._id,
          x: coords.x || coords[0] || 0,
          y: coords.y || coords[1] || 0,
          category: inc.serviceIssue?.category,
          type: inc.serviceIssue?.type,
        };
      });
  }, [filteredIncidents, umapCoords]);

  // Type counts for UMAP legend
  const typeCounts = useMemo(() => {
    const counts = {};
    filteredIncidents.forEach(inc => {
      const type = inc.serviceIssue?.type;
      if (type) counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [filteredIncidents]);

  // Category type counts for UMAP legend
  const categoryTypeCounts = useMemo(() => {
    const counts = { consumer: {}, infrastructure: {}, business: {}, federal: {}, emerging_tech: {} };
    filteredIncidents.forEach(inc => {
      const cat = inc.serviceIssue?.category;
      const type = inc.serviceIssue?.type;
      if (cat && type) {
        if (!counts[cat]) counts[cat] = {};
        counts[cat][type] = (counts[cat][type] || 0) + 1;
      }
    });
    return counts;
  }, [filteredIncidents]);

  return (
    <div className="search-shell">
      {/* ══════════════════════════════════════════════════════════════════
          RESULTS BANNER
          ══════════════════════════════════════════════════════════════════ */}
      <div className="results-banner">
        <div className="results-banner__stats">
          <span className="results-banner__stat">
            <span className="results-banner__label">LEXICAL</span>
            <span className="results-banner__value">{resultsSummary.lexicalCount}</span>
          </span>
          <span className="results-banner__stat results-banner__stat--highlight">
            <span className="results-banner__label">SEMANTIC</span>
            <span className="results-banner__value">+{resultsSummary.semanticCount}</span>
          </span>
          <span className="results-banner__stat results-banner__stat--primary">
            <span className="results-banner__label">HYBRID</span>
            <span className="results-banner__value">{resultsSummary.hybridCount}</span>
          </span>
        </div>
        <div className="results-banner__recall">
          recall 11pt +25% vs lexical)
        </div>

        {/* Ranked result cards */}
        <div className="results-banner__cards">
          {filteredIncidents.slice(0, 6).map((inc, idx) => {
            const score = searchResults?.scores?.[inc._id] || (0.95 - idx * 0.02);
            const isTop = idx === 0;
            return (
              <div
                key={inc._id}
                className={`results-banner__card ${isTop ? 'results-banner__card--top' : ''}`}
                onClick={() => navigate(`/incident/${inc._id}`)}
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
      query: "backhoe",
      path: ["serviceIssue.narrative"]
    }
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">numCandidates:</span>
                    <span className="compare-pane__meta-value">500</span>
                    <span className="compare-pane__meta-label">limit:</span>
                    <span className="compare-pane__meta-value">100</span>
                  </div>
                  <div className="compare-pane__count">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.lexical }}>19</span>
                    <span className="compare-pane__count-label">of 323</span>
                  </div>
                  <div className="compare-pane__results">
                    {filteredIncidents.slice(0, 4).map((inc, idx) => (
                      <div key={inc._id} className="compare-pane__result">
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
                    <div className="compare-pane__code-line">$vectorSearch: <span className="code-key">voyage-4</span></div>
                    <pre className="compare-pane__pre">{`{
  $vectorSearch: {
    index: "inc_vec",
    path: "embedding_vector",
    queryVector: [...]
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">numCandidates:</span>
                    <span className="compare-pane__meta-value">500</span>
                    <span className="compare-pane__meta-label">limit:</span>
                    <span className="compare-pane__meta-value">100</span>
                  </div>
                  <div className="compare-pane__count">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.semantic }}>19</span>
                    <span className="compare-pane__count-label">of 323</span>
                  </div>
                  <div className="compare-pane__results">
                    {filteredIncidents.slice(0, 4).map((inc, idx) => (
                      <div key={inc._id} className="compare-pane__result">
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
  input: pipelines: [ lexical, (...), semantic: (...) ],
  combination: {
    weights: { lexical: 0.38, semantic: 0.62 }
  }
}`}</pre>
                  </div>
                  <div className="compare-pane__meta">
                    <span className="compare-pane__meta-label">latency:</span>
                    <span className="compare-pane__meta-value">+4ms</span>
                    <span className="compare-pane__meta-label">indexes:</span>
                    <span className="compare-pane__meta-value">2</span>
                  </div>
                  <div className="compare-pane__count compare-pane__count--highlight">
                    <span className="compare-pane__count-num" style={{ color: MODE_COLOR.hybrid }}>21</span>
                    <span className="compare-pane__count-label">of 323</span>
                  </div>
                  <div className="compare-pane__subtitle">
                    + lexical only + 16 semantic-only + 4 both
                  </div>
                  <div className="compare-pane__results">
                    {filteredIncidents.slice(0, 4).map((inc, idx) => (
                      <div key={inc._id} className="compare-pane__result">
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
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--lexical" style={{ flex: 2 }}>
                        <span className="result-overlap__bar-label">lexical only</span>
                        <span className="result-overlap__bar-value">2</span>
                      </div>
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--both" style={{ flex: 4 }}>
                        <span className="result-overlap__bar-value">4</span>
                      </div>
                      <div className="result-overlap__bar-segment result-overlap__bar-segment--semantic" style={{ flex: 15 }}>
                        <span className="result-overlap__bar-label">semantic only</span>
                        <span className="result-overlap__bar-value">15</span>
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
                      <span className="result-overlap__metric-value result-overlap__metric-value--positive">+25%</span>
                    </div>
                    <div className="result-overlap__metric">
                      <span className="result-overlap__metric-label">exact ID retained</span>
                      <span className="result-overlap__metric-value">yes</span>
                    </div>
                    <div className="result-overlap__metric">
                      <span className="result-overlap__metric-label">added latency</span>
                      <span className="result-overlap__metric-value">+4ms</span>
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

              {/* UMAP Panel - Bottom of center column */}
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

                    {/* Scatter points */}
                    {umapPoints.map((pt) => (
                      <circle
                        key={pt.id}
                        cx={20 + pt.x * 360}
                        cy={10 + pt.y * 80}
                        r={4}
                        fill={getCategoryColor(pt.category)}
                        opacity={0.85}
                      />
                    ))}
                  </svg>
                  <div className="umap-panel__legend">
                    <div className="umap-panel__legend-cat" style={{ color: CATEGORY_COLORS.consumer }}>Consumer</div>
                    <div className="umap-panel__legend-row">
                      Fiber <strong>{categoryTypeCounts.consumer?.fiber || 7}</strong> · broadband <strong>{categoryTypeCounts.consumer?.broadband || 5}</strong>
                    </div>
                    <div className="umap-panel__legend-row">
                      5g <strong>{categoryTypeCounts.consumer?.['5g'] || 2}</strong> · wireless <strong>{categoryTypeCounts.consumer?.wireless || 1}</strong>
                    </div>
                  </div>
                </div>
                <div className="umap-panel__footer">
                  Scattered across 5 states geographically. One cluster semantically.
                </div>
              </div>
            </>
          )}
        </main>

        {/* RIGHT RAIL */}
        <aside className="feeds-rail">
          <div className="feeds-rail__header">
            <span className="feeds-rail__title">LIVE FEEDS</span>
            <span className="feeds-rail__count">{filteredIncidents.length} events</span>
          </div>

          {/* Systemic Event */}
          {detectedCluster && (
            <div className="systemic-alert">
              <div className="systemic-alert__header">
                <span className="systemic-alert__dot" />
                <span className="systemic-alert__title">SYSTEMIC EVENT DETECTED</span>
              </div>
              <div className="systemic-alert__stats">
                <div><span>6 incidents</span> · <span>6 types</span> · <span>3 categories</span> · <span>8.2km</span> · <span>11 min</span></div>
                <div className="systemic-alert__location">Warrior, AL</div>
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
            {filteredIncidents.slice(0, 3).map(inc => (
              <div
                key={inc._id}
                className="incident-preview"
                onClick={() => navigate(`/incident/${inc._id}`)}
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
"impact": "${inc.serviceIssue?.impact?.count} ${inc.serviceIssue?.impact?.unit || 'subscribers'}",
"count": ${inc.serviceIssue?.impact?.count || 340}`}
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
                  {[
                    { type: 'fiber', count: 7, max: 7, category: 'consumer' },
                    { type: 'backhaul', count: 5, max: 7, category: 'infrastructure' },
                    { type: 'smartcell', count: 4, max: 7, category: 'infrastructure' },
                    { type: 'construction', count: 3, max: 7, category: 'infrastructure' },
                    { type: 'broadband', count: 2, max: 7, category: 'consumer' },
                  ].map(bar => (
                    <div key={bar.type} className="matches-chart__bar-row">
                      <span className="matches-chart__bar-label">{bar.type}</span>
                      <div className="matches-chart__bar-track">
                        <div
                          className="matches-chart__bar-fill"
                          style={{
                            width: `${(bar.count / bar.max) * 100}%`,
                            backgroundColor: CATEGORY_COLORS[bar.category]
                          }}
                        />
                      </div>
                      <span className="matches-chart__bar-value">{bar.count}</span>
                    </div>
                  ))}
                </div>
                <div className="matches-chart__total">
                  Total: <strong>{resultsSummary.hybridCount}</strong>
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
                    {/* Outer ring segments */}
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1f24" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.hybrid}
                      strokeWidth="8"
                      strokeDasharray="52 212"
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.semantic}
                      strokeWidth="8"
                      strokeDasharray="98 166"
                      strokeDashoffset="-52"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={MODE_COLOR.lexical}
                      strokeWidth="8"
                      strokeDasharray="26 238"
                      strokeDashoffset="-150"
                      transform="rotate(-90 50 50)"
                    />
                    {/* Center text */}
                    <text x="50" y="46" textAnchor="middle" fill="#E8EDF2" fontSize="18" fontWeight="600">
                      {resultsSummary.hybridCount}
                    </text>
                    <text x="50" y="60" textAnchor="middle" fill={MODE_COLOR.semantic} fontSize="10">
                      +{resultsSummary.semanticCount}
                    </text>
                  </svg>
                </div>
                <div className="result-composition__legend">
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.hybrid }} />
                    <span>anchor</span>
                    <span className="result-composition__desc">counted in "both"</span>
                  </div>
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.semantic }} />
                    <span>semantic only</span>
                    <span className="result-composition__value">{resultsSummary.semanticCount}</span>
                  </div>
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.lexical }} />
                    <span>lexical only</span>
                    <span className="result-composition__value">{resultsSummary.lexical || 2}</span>
                  </div>
                  <div className="result-composition__item">
                    <span className="result-composition__dot" style={{ background: MODE_COLOR.hybrid }} />
                    <span>both</span>
                    <span className="result-composition__value">{resultsSummary.both || 4}</span>
                  </div>
                  <div className="result-composition__item result-composition__item--muted">
                    <span className="result-composition__dot" style={{ background: '#3a3f44' }} />
                    <span>not matched</span>
                    <span className="result-composition__value">302</span>
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
