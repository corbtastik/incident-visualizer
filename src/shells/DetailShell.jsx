/**
 * DetailShell - Incident Detail View (Screen 3)
 *
 * Layout: 320px left rail | flexible center (map + tabs) | 380px right rail
 *
 * Data wiring:
 * - Join key is ticketRef (not _id)
 * - Neighbours from mock-neighbours.json keyed by ticketRef
 * - SERVICE ISSUE panel dynamically renders available fields
 * - Score rows from result data, null lexicalRank shown as empty
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMockData } from '../hooks/useMockData';
import { useMapSettings } from '../context/MapSettingsContext';
import { CATEGORY_COLORS_RGBA, CATEGORY_COLORS, getCategoryColor, getCategoryFromType } from '../utils/colors';
import { MAP_CONFIG } from '../utils/constants';
import { formatDate, formatCurrency } from '../utils/formatters';
import VideoPreview from '../components/media/VideoPreview';
import VideoPlayer from '../components/media/VideoPlayer';
import ImagePreview from '../components/media/ImagePreview';
import ImageViewer from '../components/media/ImageViewer';
import DocumentPreview from '../components/media/DocumentPreview';
import DocumentViewer from '../components/media/DocumentViewer';

// Sample documents for testing (public domain PDFs)
const SAMPLE_DOCUMENTS = [
  {
    id: 'splice-map',
    documentSrc: 'https://www.africau.edu/images/default/sample.pdf',
    caption: 'splice map a5-bull, page 14',
    score: '0.83'
  }
];

// Sample images for testing
const SAMPLE_IMAGES = [
  {
    id: 'pedestal',
    imageSrc: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
    caption: 'open pedestal, severed cable visible',
    score: '0.88'
  },
  {
    id: 'damage-site',
    imageSrc: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
    caption: 'excavation damage near conduit',
    score: '0.82'
  }
];

// Sample videos for testing (public domain)
const SAMPLE_VIDEOS = [
  {
    id: 'drone-pass',
    videoSrc: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
    thumbnailSrc: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop',
    caption: 'drone pass',
    score: '0.76'
  },
  {
    id: 'site-survey',
    videoSrc: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
    thumbnailSrc: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=200&fit=crop',
    caption: 'site survey footage',
    score: '0.71'
  }
];

// Fields to skip in SERVICE ISSUE panel (rendered elsewhere or internal)
const SKIP_FIELDS = ['ticketRef', 'category', 'narrative', 'resolution'];

// Fields to render first in SERVICE ISSUE panel
const PRIORITY_FIELDS = ['type', 'issue', 'symptoms', 'severity', 'reportedBy', 'impact'];

export default function DetailShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, clusters, neighbours, searchResults, getIncidentByTicketRef } = useMockData();
  const { dotSize } = useMapSettings();

  // Determine if this is an incident or cluster view
  const isCluster = id?.startsWith('CLUSTER-');

  // Find the current incident by ticketRef
  const incident = useMemo(() => {
    return incidents.find(inc => inc.serviceIssue?.ticketRef === id);
  }, [incidents, id]);

  const cluster = useMemo(() => {
    return clusters.find(c => c.clusterId === id);
  }, [clusters, id]);

  // Get result info for this incident from search results
  const resultInfo = useMemo(() => {
    if (!incident || !searchResults?.modes?.hybrid?.results) return null;
    const ticketRef = incident.serviceIssue?.ticketRef;
    return searchResults.modes.hybrid.results.find(r => r.ticketRef === ticketRef) || null;
  }, [incident, searchResults]);

  // Get neighbours for incident view - keyed by ticketRef
  const incidentNeighbours = useMemo(() => {
    if (!incident) return [];
    const ticketRef = incident.serviceIssue?.ticketRef;
    return neighbours[ticketRef] || [];
  }, [incident, neighbours]);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('map');

  // Media viewer state
  const [activeVideo, setActiveVideo] = useState(null);
  const [activeImage, setActiveImage] = useState(null);
  const [activeDocument, setActiveDocument] = useState(null);

  // Map view state
  const [viewState, setViewState] = useState(() => {
    const item = incident || (cluster && incidents.find(i => i.serviceIssue?.ticketRef === cluster.seedTicketRef));
    return {
      longitude: item?.lng || -86.8,
      latitude: item?.lat || 33.8,
      zoom: 9,
    };
  });

  // Create map layers
  const layers = useMemo(() => {
    if (!incident) return [];
    const layerList = [];

    // Scale factors for different dot types
    const neighbourSize = dotSize * 0.73;
    const mainSize = dotSize * 1.27;
    const ringWidth = Math.max(2, dotSize * 0.27);

    // Find neighbour incidents
    const neighbourIncidents = incidentNeighbours
      .map(n => incidents.find(i => i.serviceIssue?.ticketRef === n.ticketRef))
      .filter(Boolean);

    // Add arcs from incident to neighbours
    layerList.push(new ArcLayer({
      id: 'neighbour-arcs',
      data: neighbourIncidents.map(n => ({
        source: incident,
        target: n,
        similarity: incidentNeighbours.find(nb => nb.ticketRef === n.serviceIssue?.ticketRef)?.similarity || 0.5,
      })),
      pickable: false,
      getSourcePosition: d => [d.source.lng, d.source.lat],
      getTargetPosition: d => [d.target.lng, d.target.lat],
      getSourceColor: [34, 211, 238, 180],
      getTargetColor: d => CATEGORY_COLORS_RGBA[d.target.serviceIssue?.category] || [90, 102, 114, 200],
      getWidth: d => d.similarity * 3,
      getHeight: 0.15,
    }));

    // Add neighbour points
    layerList.push(new ScatterplotLayer({
      id: 'neighbours',
      data: neighbourIncidents,
      pickable: true,
      opacity: 0.85,
      stroked: false,
      filled: true,
      radiusUnits: 'pixels',
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200],
      getRadius: neighbourSize,
    }));

    // Add main incident point (on top)
    layerList.push(new ScatterplotLayer({
      id: 'main-incident',
      data: [incident],
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200],
      getLineColor: [34, 211, 238, 255],
      getRadius: mainSize,
      getLineWidth: ringWidth,
    }));

    return layerList;
  }, [incident, incidents, incidentNeighbours, dotSize]);

  // If no item found
  if (!incident && !cluster) {
    return (
      <div className="detail-shell">
        <aside className="detail-rail">
          <div className="detail-rail__back">
            <Link to="/" className="detail-rail__back-link">← back to search</Link>
          </div>
          <div className="detail-rail__empty">Item not found: {id}</div>
        </aside>
        <main className="detail-center" />
        <aside className="detail-context" />
      </div>
    );
  }

  // For cluster view, redirect to cluster shell (Screen 4)
  if (isCluster) {
    return (
      <div className="detail-shell">
        <aside className="detail-rail">
          <div className="detail-rail__back">
            <Link to="/" className="detail-rail__back-link">← back to results</Link>
          </div>
          <div className="detail-rail__header">
            <div className="detail-rail__alert">
              <span className="detail-rail__alert-dot" />
              <span className="detail-rail__alert-text">Systemic Event</span>
            </div>
            <div className="detail-rail__cluster-id">{cluster?.clusterId}</div>
          </div>
        </aside>
        <main className="detail-center" />
        <aside className="detail-context" />
      </div>
    );
  }

  // Get counts from search results
  const hybridTotal = searchResults?.counts?.hybridTotal || 22;

  // Derive highlight spans from narrative - VERBATIM substrings only
  const narrative = incident.serviceIssue?.narrative || '';
  const query = searchResults?.query || 'backhoe damage near SE-MCA-2211';

  // Try to find query terms in narrative for lexical highlight
  const lexicalHighlight = useMemo(() => {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    for (const term of queryTerms) {
      const idx = narrative.toLowerCase().indexOf(term);
      if (idx !== -1) {
        // Find word boundaries
        const start = narrative.lastIndexOf(' ', idx) + 1;
        let end = narrative.indexOf(' ', idx + term.length);
        if (end === -1) end = narrative.length;
        // Expand to include surrounding context (up to 60 chars)
        const contextStart = Math.max(0, start - 30);
        const contextEnd = Math.min(narrative.length, end + 30);
        const prefix = contextStart > 0 ? '...' : '';
        const suffix = contextEnd < narrative.length ? '...' : '';
        const beforeMatch = narrative.slice(contextStart, idx);
        const match = narrative.slice(idx, idx + term.length);
        const afterMatch = narrative.slice(idx + term.length, contextEnd);
        return { prefix, beforeMatch, match, afterMatch, suffix };
      }
    }
    return null;
  }, [narrative, query]);

  // For rerank highlight - find first sentence or clause that seems semantically relevant
  const rerankHighlight = useMemo(() => {
    // Look for technical phrases that would score high in reranking
    const patterns = [
      /Optical power collapsed[^.]+/i,
      /Reading -?\d+\.?\d*dBm[^.]+/i,
      /OTDR places[^.]+/i,
      /errored seconds[^.]+/i,
      /bore contacted[^.]+/i,
      /fiber cut[^.]+/i,
    ];
    for (const pattern of patterns) {
      const match = narrative.match(pattern);
      if (match) {
        return match[0];
      }
    }
    // Fallback: first sentence if it's technical
    const firstSentence = narrative.split('.')[0];
    if (firstSentence && firstSentence.length > 20) {
      return firstSentence;
    }
    return null;
  }, [narrative]);

  // Render SERVICE ISSUE fields dynamically
  const renderServiceIssueFields = () => {
    const si = incident.serviceIssue;
    if (!si) return null;

    const fields = [];

    // Render priority fields first
    PRIORITY_FIELDS.forEach(key => {
      if (si[key] !== undefined && !SKIP_FIELDS.includes(key)) {
        fields.push(renderField(key, si[key], si));
      }
    });

    // Then render remaining fields
    Object.keys(si).forEach(key => {
      if (!PRIORITY_FIELDS.includes(key) && !SKIP_FIELDS.includes(key) && si[key] !== undefined) {
        fields.push(renderField(key, si[key], si));
      }
    });

    return fields;
  };

  const renderField = (key, value, si) => {
    // Special formatting for specific fields
    if (key === 'impact' && typeof value === 'object') {
      return (
        <div key={key} className="detail-rail__field">
          <span className="detail-rail__field-label">{key}</span>
          <span className="detail-rail__field-value">
            {value.count} {value.unit} · {value.scope}
          </span>
        </div>
      );
    }

    if (key === 'symptoms' && Array.isArray(value)) {
      return (
        <div key={key} className="detail-rail__field">
          <span className="detail-rail__field-label">{key}</span>
          <span className="detail-rail__field-value detail-rail__field-value--wrap">
            {value.join(', ')}
          </span>
        </div>
      );
    }

    if (key === 'opticalPowerDbm' && si.expectedPowerDbm !== undefined) {
      return (
        <div key={key} className="detail-rail__field">
          <span className="detail-rail__field-label">{key}</span>
          <span className="detail-rail__field-value">
            {value} <span className="detail-rail__field-expected">(expected {si.expectedPowerDbm})</span>
          </span>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={key} className="detail-rail__field">
          <span className="detail-rail__field-label">{key}</span>
          <span className="detail-rail__field-value detail-rail__field-value--wrap">
            {value.join(', ')}
          </span>
        </div>
      );
    }

    if (typeof value === 'object') {
      return null; // Skip complex objects not handled above
    }

    return (
      <div key={key} className="detail-rail__field">
        <span className="detail-rail__field-label">{key}</span>
        <span className="detail-rail__field-value">{String(value)}</span>
      </div>
    );
  };

  return (
    <div className="detail-shell">
      {/* ════════════════════════════════════════════════════════════════════════
          LEFT RAIL - Document Details
          ════════════════════════════════════════════════════════════════════════ */}
      <aside className="detail-rail">
        {/* Back Link */}
        <div className="detail-rail__back">
          <Link to="/" className="detail-rail__back-link">← back to {hybridTotal} results</Link>
        </div>

        {/* Incident Header */}
        <div className="detail-rail__header">
          <div className="detail-rail__title-row">
            <span
              className="detail-rail__cat-dot"
              style={{ backgroundColor: getCategoryColor(incident.serviceIssue?.category) }}
            />
            <span className="detail-rail__title">
              {incident.serviceIssue?.type} — {incident.serviceIssue?.issue || incident.serviceIssue?.symptoms?.[0]?.replace(/-/g, ' ')}
            </span>
          </div>
          <div className="detail-rail__meta">
            {incident.serviceIssue?.ticketRef} · {incident.city}, {incident.state} · {formatDate(incident.ts)}
          </div>

          {/* Severity Badge - read-only, shows this incident's severity */}
          <div className="detail-rail__severity">
            <span className="detail-rail__sev-badge">
              {(incident.serviceIssue?.severity || 'p2').toUpperCase()}
            </span>
          </div>

          {/* Result Position */}
          <div className="detail-rail__position">
            result #{resultInfo?.fusedRank || '—'} of {hybridTotal} · hybrid
          </div>
        </div>

        {/* Tabs */}
        <div className="detail-rail__tabs">
          <button
            className={`detail-rail__tab ${activeTab === 'overview' ? 'detail-rail__tab--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`detail-rail__tab ${activeTab === 'raw' ? 'detail-rail__tab--active' : ''}`}
            onClick={() => setActiveTab('raw')}
          >
            Raw
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="detail-rail__content">
          {/* Cluster Status */}
          <div className="detail-rail__cluster-status">
            {incident.correlation?.clusterId ? (
              <>
                <span className="detail-rail__cluster-label">Part of cluster</span>
                <Link to={`/cluster/${incident.correlation.clusterId}`} className="detail-rail__cluster-link">
                  {incident.correlation.clusterId}
                </Link>
              </>
            ) : (
              <span className="detail-rail__cluster-label">Not part of any active cluster</span>
            )}
          </div>

          {/* Narrative Section */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">NARRATIVE</div>
            <p className="detail-rail__narrative">
              {narrative}
            </p>
          </div>

          {/* Why This Matched */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">WHY THIS MATCHED</div>

            {/* Match Query */}
            <div className="detail-rail__match-row">
              <span className="detail-rail__match-label">matched against:</span>
              <span className="detail-rail__match-query">"{query}"</span>
            </div>

            {/* Score Table */}
            <div className="detail-rail__scores">
              {/* Lexical rank - show empty if null */}
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Lexical rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--bm25">BM25</span>
                {resultInfo?.lexicalRank != null ? (
                  <>
                    <span className="detail-rail__score-rank">#{resultInfo.lexicalRank}</span>
                    <span className="detail-rail__score-value">{resultInfo.lexicalScore?.toFixed(2)}</span>
                  </>
                ) : (
                  <>
                    <span className="detail-rail__score-rank detail-rail__score-rank--empty">—</span>
                    <span className="detail-rail__score-value detail-rail__score-value--empty">
                      not retrieved by lexical pipeline
                    </span>
                  </>
                )}
              </div>
              {/* Vector rank */}
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Vector rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--cosine">cosine</span>
                {resultInfo?.vectorRank != null ? (
                  <>
                    <span className="detail-rail__score-rank">#{resultInfo.vectorRank}</span>
                    <span className="detail-rail__score-value">{resultInfo.vectorScore?.toFixed(3)}</span>
                  </>
                ) : (
                  <>
                    <span className="detail-rail__score-rank detail-rail__score-rank--empty">—</span>
                    <span className="detail-rail__score-value detail-rail__score-value--empty">
                      not retrieved by vector pipeline
                    </span>
                  </>
                )}
              </div>
              {/* Fused rank */}
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Fused rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--rrf">RRF</span>
                <span className="detail-rail__score-rank">#{resultInfo?.fusedRank || '—'}</span>
                <span className="detail-rail__score-value">{resultInfo?.fusedScore?.toFixed(3) || '—'}</span>
              </div>
            </div>

            <div className="detail-rail__score-note">
              three different scales — compare ranks, not scores
            </div>

            {/* Highlighted Match - Lexical (only if we found a verbatim match) */}
            {lexicalHighlight && (
              <div className="detail-rail__highlight-block">
                <div className="detail-rail__highlight-text">
                  {lexicalHighlight.prefix}{lexicalHighlight.beforeMatch}
                  <span className="detail-rail__hl detail-rail__hl--lexical">{lexicalHighlight.match}</span>
                  {lexicalHighlight.afterMatch}{lexicalHighlight.suffix}
                </div>
                <div className="detail-rail__highlight-source">
                  highlight from Search · lexical pipeline
                </div>
              </div>
            )}

            {/* Highlighted Match - Rerank (only if we found a match) */}
            {rerankHighlight && (
              <div className="detail-rail__highlight-block">
                <div className="detail-rail__highlight-text">
                  <span className="detail-rail__hl detail-rail__hl--rerank">{rerankHighlight}</span>
                </div>
                <div className="detail-rail__highlight-source">
                  top scoring chunk · rerank-2.5
                </div>
              </div>
            )}

            <div className="detail-rail__match-footer">
              Dense vector scores are document-level. Span attribution comes from lexical pipeline or the reranker.
            </div>
          </div>

          {/* Service Issue - Dynamic fields */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">SERVICE ISSUE</div>
            <div className="detail-rail__fields">
              {renderServiceIssueFields()}
            </div>
            <div className="detail-rail__fields-note">
              structured fields are prefilters, not embedded
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════════
          CENTER - Map + Evidence Tabs
          ════════════════════════════════════════════════════════════════════════ */}
      <main className="detail-center">
        {/* Map */}
        <div className="detail-center__map">
          <DeckGL
            viewState={viewState}
            onViewStateChange={({ viewState }) => setViewState(viewState)}
            controller={true}
            layers={layers}
          >
            <Map
              reuseMaps
              mapLib={maplibregl}
              mapStyle={MAP_CONFIG.darkStyle}
            />
          </DeckGL>

          {/* Map Legend */}
          <div className="detail-center__legend">
            <span className="detail-center__legend-arrow">→</span>
            <span className="detail-center__legend-text">
              {incidentNeighbours.length} nearest neighbours · arc weight = similarity
            </span>
          </div>
        </div>

        {/* Evidence Tabs */}
        <div className="detail-center__tabs">
          <button
            className={`detail-center__tab ${activeEvidenceTab === 'map' ? 'detail-center__tab--active' : ''}`}
            onClick={() => setActiveEvidenceTab('map')}
          >
            Map · geographic space
          </button>
          <button
            className={`detail-center__tab ${activeEvidenceTab === 'semantic' ? 'detail-center__tab--active' : ''}`}
            onClick={() => setActiveEvidenceTab('semantic')}
          >
            Semantic · embedding space
          </button>
          <button
            className={`detail-center__tab ${activeEvidenceTab === 'media' ? 'detail-center__tab--active' : ''}`}
            onClick={() => setActiveEvidenceTab('media')}
          >
            Media · {(incident.media?.length || 0) + SAMPLE_IMAGES.length + SAMPLE_VIDEOS.length + SAMPLE_DOCUMENTS.length} artifacts
          </button>
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════════════════════
          RIGHT RAIL - Neighbours + Predicted Dispatch + Media
          ════════════════════════════════════════════════════════════════════════ */}
      <aside className="detail-context">
        {/* Scrollable area for neighbours and dispatch */}
        <div className="detail-context__scroll">
          {/* Nearest Neighbours Header */}
          <div className="detail-context__header">
            <span className="detail-context__title">NEAREST NEIGHBOURS</span>
            <span className="detail-context__count">· {incidentNeighbours.length}</span>
          </div>

          {/* Neighbours List - from data */}
          <div className="detail-context__neighbours">
            {incidentNeighbours.slice(0, 5).map((n) => (
              <div
                key={n.ticketRef}
                className="detail-context__neighbour"
                onClick={() => navigate(`/incident/${n.ticketRef}`)}
                style={{ cursor: 'pointer' }}
              >
                <span
                  className="detail-context__neighbour-dot"
                  style={{ backgroundColor: CATEGORY_COLORS[n.category] }}
                />
                <span className="detail-context__neighbour-id">{n.ticketRef}</span>
                <span className="detail-context__neighbour-type">{n.type}</span>
                <span className="detail-context__neighbour-location">{n.city}</span>
                <span className="detail-context__neighbour-score">{n.similarity?.toFixed(2)}</span>
              </div>
            ))}
            {incidentNeighbours.length > 5 && (
              <div className="detail-context__more">
                + {incidentNeighbours.length - 5} more
              </div>
            )}
          </div>

          {/* Neighbour Footer */}
          <div className="detail-context__neighbour-footer">
            <span>Based on {incidentNeighbours.length} nearest historical incidents</span>
            <button className="detail-context__show-map">Show on map</button>
          </div>

          {/* Predicted Dispatch - computed from neighbours[ticketRef] */}
          <div className="detail-context__section">
            <div className="detail-context__section-title">PREDICTED DISPATCH</div>
            <div className="detail-context__dispatch">
              {(() => {
                const k = incidentNeighbours.length;
                if (k === 0) return <div className="detail-context__dispatch-note">No neighbours found</div>;

                // Modal crew (most common)
                const crewCounts = {};
                incidentNeighbours.forEach(n => {
                  const crew = n.resolution?.crew;
                  if (crew) crewCounts[crew] = (crewCounts[crew] || 0) + 1;
                });
                const modalCrew = Object.entries(crewCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
                const modalCrewCount = crewCounts[modalCrew] || 0;
                const agreement = (modalCrewCount / k).toFixed(2);

                // Techs: rounded mean of all neighbours
                const techs = incidentNeighbours.map(n => n.resolution?.techs).filter(t => t != null);
                const avgTechs = techs.length ? Math.round(techs.reduce((a, b) => a + b, 0) / techs.length) : null;

                // Hours: mean with min-max range (exclude nulls)
                const hours = incidentNeighbours.map(n => n.resolution?.hours).filter(h => h != null);
                const avgHours = hours.length ? (hours.reduce((a, b) => a + b, 0) / hours.length).toFixed(1) : null;
                const minHours = hours.length ? Math.min(...hours).toFixed(1) : null;
                const maxHours = hours.length ? Math.max(...hours).toFixed(1) : null;

                // Parts: union from neighbours whose crew === modal crew
                const partsFromModalCrew = incidentNeighbours
                  .filter(n => n.resolution?.crew === modalCrew)
                  .flatMap(n => n.resolution?.parts || []);
                const uniqueParts = [...new Set(partsFromModalCrew)];

                // Cost: mean ± half the spread (exclude nulls)
                const costs = incidentNeighbours.map(n => n.resolution?.costUsd).filter(c => c != null);
                const avgCost = costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null;
                const minCost = costs.length ? Math.min(...costs) : null;
                const maxCost = costs.length ? Math.max(...costs) : null;
                const costSpread = (minCost != null && maxCost != null) ? Math.round((maxCost - minCost) / 2) : null;

                return (
                  <>
                    <div className="detail-context__dispatch-main">
                      {modalCrew} crew{avgTechs ? ` · ${avgTechs} techs` : ''}
                      {avgHours ? ` · ${avgHours}h (${minHours}–${maxHours})` : ''} · 1 truck roll
                    </div>
                    {uniqueParts.length > 0 && (
                      <div className="detail-context__dispatch-params">
                        Parts: {uniqueParts.join(', ')}
                      </div>
                    )}
                    {avgCost && (
                      <div className="detail-context__dispatch-cost">
                        Est. cost <span className="detail-context__dispatch-amount">${avgCost.toLocaleString()}</span>
                        {costSpread ? <span className="detail-context__dispatch-range"> (±${costSpread.toLocaleString()})</span> : null}
                      </div>
                    )}
                    <div className="detail-context__dispatch-note">
                      k={k} · agreement {agreement} · retrieval, not a trained model
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>{/* End scroll area */}

        {/* Media Section */}
        <div className="detail-context__media-section">
          <div className="detail-context__section-title">MEDIA</div>

          <div className="detail-context__media-grid">
            {/* Images - with click to expand */}
            {SAMPLE_IMAGES.map((image) => (
              <ImagePreview
                key={image.id}
                imageSrc={image.imageSrc}
                caption={image.caption}
                score={image.score}
                onExpand={() => setActiveImage(image)}
              />
            ))}

            {/* Documents - with click to expand */}
            {SAMPLE_DOCUMENTS.map((doc) => (
              <DocumentPreview
                key={doc.id}
                caption={doc.caption}
                score={doc.score}
                onExpand={() => setActiveDocument(doc)}
              />
            ))}

            {/* Videos - with hover preview and click to expand */}
            {SAMPLE_VIDEOS.map((video) => (
              <VideoPreview
                key={video.id}
                videoSrc={video.videoSrc}
                thumbnailSrc={video.thumbnailSrc}
                caption={video.caption}
                score={video.score}
                onExpand={() => setActiveVideo(video)}
              />
            ))}
          </div>

          <div className="detail-context__media-footer">
            select to open in Media tab
          </div>
        </div>
      </aside>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayer
          videoSrc={activeVideo.videoSrc}
          caption={activeVideo.caption}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {/* Image Viewer Modal */}
      {activeImage && (
        <ImageViewer
          imageSrc={activeImage.imageSrc}
          caption={activeImage.caption}
          score={activeImage.score}
          onClose={() => setActiveImage(null)}
        />
      )}

      {/* Document Viewer Modal */}
      {activeDocument && (
        <DocumentViewer
          documentSrc={activeDocument.documentSrc}
          caption={activeDocument.caption}
          score={activeDocument.score}
          onClose={() => setActiveDocument(null)}
        />
      )}
    </div>
  );
}
