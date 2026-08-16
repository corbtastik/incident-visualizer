/**
 * DetailShell - Incident Detail View (Screen 3)
 *
 * Layout: 320px left rail | flexible center (map + tabs) | 380px right rail
 * Matches mockup screen-3-incident-detail.jpg exactly
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useMockData } from '../hooks/useMockData';
import { CATEGORY_COLORS_RGBA, CATEGORY_COLORS, getCategoryColor } from '../utils/colors';
import { MAP_CONFIG } from '../utils/constants';
import { formatDate, formatScore, formatCurrency, formatDuration } from '../utils/formatters';

export default function DetailShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { incidents, clusters, neighbours } = useMockData();

  // Determine if this is an incident or cluster view
  const isCluster = id?.startsWith('CLUSTER-');

  // Find the current item
  const incident = useMemo(() => {
    return incidents.find(inc => inc._id === id || inc.serviceIssue?.ticketRef === id);
  }, [incidents, id]);

  const cluster = useMemo(() => {
    return clusters.find(c => c.clusterId === id);
  }, [clusters, id]);

  // Get neighbours for incident view
  const incidentNeighbours = useMemo(() => {
    if (!incident) return [];
    return neighbours[incident._id] || [];
  }, [incident, neighbours]);

  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('map');

  // Map view state
  const [viewState, setViewState] = useState(() => {
    const item = incident || (cluster && incidents.find(i => i.serviceIssue?.ticketRef === cluster.seedId));
    return {
      longitude: item?.lng || -82.491,
      latitude: item?.lat || 39.135,
      zoom: 9,
    };
  });

  // Create map layers
  const layers = useMemo(() => {
    if (!incident) return [];
    const layerList = [];

    const neighbourIncidents = incidentNeighbours
      .map(n => incidents.find(i => i.serviceIssue?.ticketRef === n.incidentId))
      .filter(Boolean);

    // Add arcs from incident to neighbours
    layerList.push(new ArcLayer({
      id: 'neighbour-arcs',
      data: neighbourIncidents.map(n => ({
        source: incident,
        target: n,
        similarity: incidentNeighbours.find(nb => nb.incidentId === n.serviceIssue?.ticketRef)?.similarity || 0.5,
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
      radiusMinPixels: 6,
      radiusMaxPixels: 10,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200],
      getRadius: 8,
    }));

    // Add main incident point (on top)
    layerList.push(new ScatterplotLayer({
      id: 'main-incident',
      data: [incident],
      pickable: true,
      opacity: 1,
      stroked: true,
      filled: true,
      radiusMinPixels: 14,
      radiusMaxPixels: 20,
      lineWidthMinPixels: 3,
      getPosition: d => [d.lng, d.lat],
      getFillColor: d => CATEGORY_COLORS_RGBA[d.serviceIssue?.category] || [90, 102, 114, 200],
      getLineColor: [34, 211, 238, 255],
      getRadius: 14,
    }));

    return layerList;
  }, [incident, incidents, incidentNeighbours]);

  // If no item found
  if (!incident && !cluster) {
    return (
      <div className="detail-shell">
        <aside className="detail-rail">
          <div className="detail-rail__back">
            <Link to="/" className="detail-rail__back-link">← back to search</Link>
          </div>
          <div className="detail-rail__empty">Item not found</div>
        </aside>
        <main className="detail-center" />
        <aside className="detail-context" />
      </div>
    );
  }

  // For cluster view, redirect to cluster shell (Screen 4)
  if (isCluster) {
    // Handle cluster view separately - for now show basic info
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

  return (
    <div className="detail-shell">
      {/* ════════════════════════════════════════════════════════════════════════
          LEFT RAIL - Document Details
          ════════════════════════════════════════════════════════════════════════ */}
      <aside className="detail-rail">
        {/* Back Link */}
        <div className="detail-rail__back">
          <Link to="/" className="detail-rail__back-link">← back to 21 results</Link>
        </div>

        {/* Incident Header */}
        <div className="detail-rail__header">
          <div className="detail-rail__title-row">
            <span
              className="detail-rail__cat-dot"
              style={{ backgroundColor: getCategoryColor(incident.serviceIssue?.category) }}
            />
            <span className="detail-rail__title">
              {incident.serviceIssue?.category === 'consumer' ? 'Fiber' : incident.serviceIssue?.type} — {incident.serviceIssue?.symptoms?.[0]?.replace(/-/g, ' ') || 'light level low'}
            </span>
          </div>
          <div className="detail-rail__meta">
            {incident.serviceIssue?.ticketRef} · {incident.city}, {incident.state || 'OH'} · {formatDate(incident.ts)}
          </div>

          {/* Severity Pills */}
          <div className="detail-rail__severity">
            {['p1', 'p2', 'p3', 'p4'].map(sev => (
              <span
                key={sev}
                className={`detail-rail__sev-pill ${incident.serviceIssue?.severity === sev ? 'detail-rail__sev-pill--active' : ''}`}
              >
                {sev.toUpperCase()}
              </span>
            ))}
          </div>

          {/* Result Position */}
          <div className="detail-rail__position">
            result #1 of 21 · hybrid
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
            <span className="detail-rail__cluster-label">Not part of any active cluster</span>
            <span className="detail-rail__cluster-nearest">
              · nearest <span className="detail-rail__cluster-link">CLUSTER-2026-0812-004</span> (Warrior, AL · 0.79)
            </span>
          </div>

          {/* Narrative Section */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">NARRATIVE</div>
            <p className="detail-rail__narrative">
              {incident.serviceIssue?.narrative || `Optical power collapsed on PON 1/3/4 off OLT-MCA-07. Reading -31.4dBm against -19.0 nominal. OTDR places the event at 1840m, just past the SE-MCA-2211 enclosure. 340 subscribers dark. Contractor bore work active in the area since Monday.`}
            </p>
          </div>

          {/* Why This Matched */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">WHY THIS MATCHED</div>

            {/* Match Query */}
            <div className="detail-rail__match-row">
              <span className="detail-rail__match-label">matched against:</span>
              <span className="detail-rail__match-query">"backhoe damage near SE-MCA-2211"</span>
            </div>

            {/* Score Table */}
            <div className="detail-rail__scores">
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Lexical rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--multi">MULTI</span>
                <span className="detail-rail__score-rank">#1</span>
                <span className="detail-rail__score-value">0.94</span>
              </div>
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Vector rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--match">MATCH</span>
                <span className="detail-rail__score-rank">#4</span>
                <span className="detail-rail__score-value">0.891</span>
              </div>
              <div className="detail-rail__score-row">
                <span className="detail-rail__score-type">Fused rank</span>
                <span className="detail-rail__score-badge detail-rail__score-badge--rrf">RRF</span>
                <span className="detail-rail__score-rank">#1</span>
                <span className="detail-rail__score-value">0.947</span>
              </div>
            </div>

            <div className="detail-rail__score-note">
              three different scales — compare ranks, not scores
            </div>

            {/* Highlighted Match - Lexical */}
            <div className="detail-rail__highlight-block">
              <div className="detail-rail__highlight-text">
                ... since Monday, <span className="detail-rail__hl detail-rail__hl--lexical">Contractor bore work</span> active in the area
              </div>
              <div className="detail-rail__highlight-source">
                highlight from Search · lexical pipeline
              </div>
            </div>

            {/* Highlighted Match - Rerank */}
            <div className="detail-rail__highlight-block">
              <div className="detail-rail__highlight-text">
                <span className="detail-rail__hl detail-rail__hl--rerank">Optical power collapsed on PON 1/3/4 off OLT-MCA-07</span>
              </div>
              <div className="detail-rail__highlight-source">
                top scoring chunk · rerank-2.5
              </div>
            </div>

            <div className="detail-rail__match-footer">
              Dense vector scores are document-level. Span attribution comes from lexical pipeline or the reranker.
            </div>
          </div>

          {/* Service Issue */}
          <div className="detail-rail__section">
            <div className="detail-rail__section-title">SERVICE ISSUE</div>
            <div className="detail-rail__fields">
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">type</span>
                <span className="detail-rail__field-value">{incident.serviceIssue?.type || 'fiber'}</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">issue</span>
                <span className="detail-rail__field-value">light-level-low</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">symptoms</span>
                <span className="detail-rail__field-value detail-rail__field-value--wrap">
                  light-level-low, fiber-cut, third-party-dig
                </span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">wfid</span>
                <span className="detail-rail__field-value">OLT-MCA-07</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">popPort</span>
                <span className="detail-rail__field-value">1/3/4</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">opticalPowerDbm</span>
                <span className="detail-rail__field-value">
                  -31.4 <span className="detail-rail__field-expected">(expected)</span>
                </span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">siteDistanceKm</span>
                <span className="detail-rail__field-value">SE-MCA-2211</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">atSiteDistanceKm</span>
                <span className="detail-rail__field-value">1840</span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">impact</span>
                <span className="detail-rail__field-value">
                  {incident.serviceIssue?.impact?.count || 340} subscribers × segment
                </span>
              </div>
              <div className="detail-rail__field">
                <span className="detail-rail__field-label">reportedBy</span>
                <span className="detail-rail__field-value">alarm</span>
              </div>
            </div>
            <div className="detail-rail__fields-note">
              structured fields are prelifiers, not embedded
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
              8 nearest neighbours · arc weight = similarity
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
            Media · 3 artifacts
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
            <span className="detail-context__count">· 8</span>
          </div>

          {/* Neighbours List */}
          <div className="detail-context__neighbours">
          {[
            { id: 'INC-2026-8712', type: 'fiber', location: 'Leesville, GA', score: 0.91 },
            { id: 'INC-2026-8455', type: 'construction', location: 'Loco Hills, NM', score: 0.88 },
            { id: 'INC-2026-8303', type: 'fiber', location: 'Terry, MS', score: 0.86 },
            { id: 'INC-2026-7991', type: 'backhaul', location: 'Swifton, AR', score: 0.84 },
            { id: 'INC-2026-7744', type: 'fiber', location: 'Perham, MN', score: 0.83 },
          ].map((n, idx) => (
            <div key={n.id} className="detail-context__neighbour">
              <span
                className="detail-context__neighbour-dot"
                style={{ backgroundColor: n.type === 'construction' || n.type === 'backhaul' ? '#FBBF24' : '#00ED64' }}
              />
              <span className="detail-context__neighbour-id">{n.id}</span>
              <span className="detail-context__neighbour-type">{n.type}</span>
              <span className="detail-context__neighbour-location">{n.location}</span>
              <span className="detail-context__neighbour-score">{n.score.toFixed(2)}</span>
            </div>
          ))}
          <div className="detail-context__more">
            + 3 more
          </div>
        </div>

        {/* Neighbour Footer */}
        <div className="detail-context__neighbour-footer">
          <span>Based on 8 nearest historical incidents</span>
          <button className="detail-context__show-map">Show on map</button>
        </div>

        {/* Predicted Dispatch */}
        <div className="detail-context__section">
          <div className="detail-context__section-title">PREDICTED DISPATCH</div>
          <div className="detail-context__dispatch">
            <div className="detail-context__dispatch-main">
              splice crew · 2 techs · 4.2h (2.8–5.1) · 1 truck roll
            </div>
            <div className="detail-context__dispatch-params">
              Params: 48ct-ribbon, splice-enclosure-SE-12
            </div>
            <div className="detail-context__dispatch-cost">
              Est. cost <span className="detail-context__dispatch-amount">$3,840</span>
              <span className="detail-context__dispatch-range"> (±$1,120)</span>
            </div>
            <div className="detail-context__dispatch-note">
              k=8 agreement 0.79 · retrieval, not a trained model
            </div>
          </div>
        </div>
        </div>{/* End scroll area */}

        {/* Media Section */}
        <div className="detail-context__media-section">
          <div className="detail-context__section-title">MEDIA</div>

          <div className="detail-context__media-grid">
            {/* Image */}
            <div className="detail-context__media-item">
              <div className="detail-context__media-title">IMAGE</div>
              <div className="detail-context__media-preview">
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop"
                  alt="Open pedestal"
                  className="detail-context__media-img"
                />
              </div>
              <div className="detail-context__media-info">
                <span className="detail-context__media-caption">open pedestal, severed cable visible</span>
                <span className="detail-context__media-score">0.88</span>
              </div>
            </div>

            {/* Document */}
            <div className="detail-context__media-item">
              <div className="detail-context__media-title">DOCUMENT</div>
              <div className="detail-context__media-preview detail-context__media-preview--doc">
                <svg viewBox="0 0 200 100" className="detail-context__media-doc-svg">
                  <rect x="10" y="10" width="180" height="80" fill="#1B2127" stroke="#232A31" strokeWidth="1" />
                  <line x1="25" y1="25" x2="175" y2="25" stroke="#3a4049" strokeWidth="2" />
                  <line x1="25" y1="40" x2="155" y2="40" stroke="#3a4049" strokeWidth="2" />
                  <line x1="25" y1="55" x2="165" y2="55" stroke="#3a4049" strokeWidth="2" />
                  <line x1="25" y1="70" x2="120" y2="70" stroke="#3a4049" strokeWidth="2" />
                  <rect x="130" y="60" width="50" height="22" fill="#232A31" stroke="#00ED64" strokeWidth="1" />
                  <text x="155" y="75" fill="#00ED64" fontSize="10" textAnchor="middle">MAP</text>
                </svg>
              </div>
              <div className="detail-context__media-info">
                <span className="detail-context__media-caption">splice map a5-bull, page 14</span>
                <span className="detail-context__media-score">0.83</span>
              </div>
            </div>

            {/* Video */}
            <div className="detail-context__media-item">
              <div className="detail-context__media-title">VIDEO</div>
              <div className="detail-context__media-preview">
                <img
                  src="https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=200&fit=crop"
                  alt="Drone view"
                  className="detail-context__media-img"
                />
                <div className="detail-context__media-play">▶</div>
              </div>
              <div className="detail-context__media-info">
                <span className="detail-context__media-caption">drone pass</span>
                <span className="detail-context__media-score">0.76</span>
              </div>
            </div>
          </div>

          <div className="detail-context__media-footer">
            select to open in Media tab
          </div>
        </div>
      </aside>
    </div>
  );
}
