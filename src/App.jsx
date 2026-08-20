import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';
import LiveFeeds from './components/LiveFeeds.jsx';
import SearchBar from './components/SearchBar.jsx';
import SearchResults from './components/SearchResults.jsx';
import { useCategoryFeed } from './hooks/useCategoryFeed';
import { makeCategoryScatterLayers } from './layers/index.js';
import TooltipIncident from './components/TooltipIncident.jsx';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function uiToRadiusPx(u) {
  const v = Math.max(0, Math.min(100, Number(u) || 0));
  if (v <= 50) return 1 + (2 - 1) * (v / 50);
  return 2 + (14 - 2) * ((v - 50) / 50);
}

export default function App() {
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 50,
    baseMap: 'dark',
    colorRamp: 'cool',
    types: new Set(),
    categories: {
      business: true,
      consumer: true,
      emerging_tech: true,
      federal: true,
      infrastructure: true
    },
    windowSec: 60,
    collapsed: false
  });

  const [hoverInfo, setHoverInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null); // null = closed, [] = no results

  // Feeds (one hook per category)
  const businessFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'business',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const consumerFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'consumer',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const emergingTechFeed   = useCategoryFeed({ baseUrl: API_BASE, category: 'emerging_tech',  intervalMs: 2000, pageSize: 200, cap: 8000 });
  const federalFeed        = useCategoryFeed({ baseUrl: API_BASE, category: 'federal',        intervalMs: 2000, pageSize: 200, cap: 8000 });
  const infraFeed          = useCategoryFeed({ baseUrl: API_BASE, category: 'infrastructure', intervalMs: 2000, pageSize: 200, cap: 8000 });

  const radiusPx = useMemo(() => uiToRadiusPx(state.radius), [state.radius]);

  // Animation tick for blink/grow (lightweight ~4 FPS). No effect unless demo is enabled.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Choose render data per category: if demo.enabled, use expiring open set; else use rolling buffer.
  const dataForRender = useMemo(() => ({
    business:       businessFeed?.demo?.enabled ? Array.from(businessFeed.demo.openMapRef.current.values()) : businessFeed.data,
    consumer:       consumerFeed?.demo?.enabled ? Array.from(consumerFeed.demo.openMapRef.current.values()) : consumerFeed.data,
    emerging_tech:  emergingTechFeed?.demo?.enabled ? Array.from(emergingTechFeed.demo.openMapRef.current.values()) : emergingTechFeed.data,
    federal:        federalFeed?.demo?.enabled ? Array.from(federalFeed.demo.openMapRef.current.values()) : federalFeed.data,
    infrastructure: infraFeed?.demo?.enabled ? Array.from(infraFeed.demo.openMapRef.current.values()) : infraFeed.data
  }), [
    businessFeed.data, consumerFeed.data, emergingTechFeed.data, federalFeed.data, infraFeed.data,
    businessFeed?.demo?.enabled, consumerFeed?.demo?.enabled, emergingTechFeed?.demo?.enabled, federalFeed?.demo?.enabled, infraFeed?.demo?.enabled,
    businessFeed?.demo?.openCount, consumerFeed?.demo?.openCount, emergingTechFeed?.demo?.openCount, federalFeed?.demo?.openCount, infraFeed?.demo?.openCount
  ]);

  // Per-category demo metadata for blink/grow accessors
  const demoMetaByCat = useMemo(() => ({
    business:       businessFeed?.demo?.enabled ? { enabled: true,  createdAtRef: businessFeed.demo.createdAtRef,       expiryAtRef: businessFeed.demo.expiryAtRef } : { enabled: false },
    consumer:       consumerFeed?.demo?.enabled ? { enabled: true,  createdAtRef: consumerFeed.demo.createdAtRef,       expiryAtRef: consumerFeed.demo.expiryAtRef } : { enabled: false },
    emerging_tech:  emergingTechFeed?.demo?.enabled ? { enabled: true,  createdAtRef: emergingTechFeed.demo.createdAtRef, expiryAtRef: emergingTechFeed.demo.expiryAtRef } : { enabled: false },
    federal:        federalFeed?.demo?.enabled ? { enabled: true,  createdAtRef: federalFeed.demo.createdAtRef,        expiryAtRef: federalFeed.demo.expiryAtRef } : { enabled: false },
    infrastructure: infraFeed?.demo?.enabled ? { enabled: true,  createdAtRef: infraFeed.demo.createdAtRef,           expiryAtRef: infraFeed.demo.expiryAtRef } : { enabled: false }
  }), [
    businessFeed?.demo?.enabled, consumerFeed?.demo?.enabled, emergingTechFeed?.demo?.enabled, federalFeed?.demo?.enabled, infraFeed?.demo?.enabled,
    businessFeed?.demo?.createdAtRef, consumerFeed?.demo?.createdAtRef, emergingTechFeed?.demo?.createdAtRef, federalFeed?.demo?.createdAtRef, infraFeed?.demo?.createdAtRef,
    businessFeed?.demo?.expiryAtRef, consumerFeed?.demo?.expiryAtRef, emergingTechFeed?.demo?.expiryAtRef, federalFeed?.demo?.expiryAtRef, infraFeed?.demo?.expiryAtRef
  ]);

  // Build layers with per-category render data and meta
  const layers = useMemo(() => {
    return makeCategoryScatterLayers(
      {
        business:       dataForRender.business,
        consumer:       dataForRender.consumer,
        emerging_tech:  dataForRender.emerging_tech,
        federal:        dataForRender.federal,
        infrastructure: dataForRender.infrastructure
      },
      { radiusPx, types: state.types, categories: state.categories, nowTick, demoMetaByCat }
    );
  }, [dataForRender, radiusPx, state.types, state.categories, nowTick]);

  // Visible count: reflect whichever source each category uses
  const visibleCount = useMemo(() => {
    if (state.types.size === 0) return 0;
    const wanted = new Set([...state.types].map(slugify));
    const pools = [];
    if (state.categories.business)       pools.push(...dataForRender.business);
    if (state.categories.consumer)       pools.push(...dataForRender.consumer);
    if (state.categories.emerging_tech)  pools.push(...dataForRender.emerging_tech);
    if (state.categories.federal)        pools.push(...dataForRender.federal);
    if (state.categories.infrastructure) pools.push(...dataForRender.infrastructure);
    return pools.reduce((acc, d) => {
      const t = slugify(d?.serviceIssue?.type);
      return acc + (t && wanted.has(t) ? 1 : 0);
    }, 0);
  }, [dataForRender, state.types, state.categories]);

  const styleUrl = state.baseMap === 'dark' ? DARK : LIGHT;

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Mock results for now - replace with actual semantic search API call
    const mockResults = [
      { _id: '1', incidentId: 'INC-2024-001', city: 'Austin', serviceIssue: { category: 'business', type: 'enterprise' }, score: 0.923, narrative: 'Enterprise customer reporting significant bandwidth degradation. Contracted 10Gbps dedicated line measuring only 2.3Gbps during peak hours. SLA breach confirmed, escalation required.' },
      { _id: '2', incidentId: 'INC-2024-002', city: 'Denver', serviceIssue: { category: 'consumer', type: 'broadband' }, score: 0.891, narrative: 'Residential customer experiencing intermittent connectivity issues. Speed tests showing 40% of advertised speeds. Modem logs indicate frequent upstream channel bonding failures.' },
      { _id: '3', incidentId: 'INC-2024-003', city: 'Seattle', serviceIssue: { category: 'infrastructure', type: 'backhaul' }, score: 0.856, narrative: 'Fiber backhaul link between SE-SEA-4401 and SE-SEA-4402 showing elevated error rates. OTDR testing reveals potential splice degradation at 4.2km marker. Capacity reduced to 60%.' },
      { _id: '4', incidentId: 'INC-2024-004', city: 'Phoenix', serviceIssue: { category: 'emerging_tech', type: 'smart-city' }, score: 0.834, narrative: 'Smart traffic management system losing connectivity to 23 intersection controllers. Latency spikes exceeding 500ms causing signal synchronization failures during rush hour.' },
      { _id: '5', incidentId: 'INC-2024-005', city: 'Miami', serviceIssue: { category: 'federal', type: 'firstnet' }, score: 0.812, narrative: 'FirstNet priority users reporting degraded service quality during emergency response operation. Band 14 coverage gaps identified in coastal zones. Public safety impact assessment initiated.' },
      { _id: '6', incidentId: 'INC-2024-006', city: 'Chicago', serviceIssue: { category: 'business', type: 'voip' }, score: 0.798, narrative: 'VoIP service quality degradation affecting call center operations. Jitter exceeding 30ms and packet loss at 2.4%. MOS scores dropped below acceptable threshold of 3.5.' },
      { _id: '7', incidentId: 'INC-2024-007', city: 'Portland', serviceIssue: { category: 'consumer', type: 'fiber' }, score: 0.776, narrative: 'FTTH customer reporting complete service outage. ONT showing LOS alarm. Field tech dispatched, preliminary assessment indicates damaged drop cable from recent storm activity.' },
      { _id: '8', incidentId: 'INC-2024-008', city: 'Atlanta', serviceIssue: { category: 'infrastructure', type: 'datacenter' }, score: 0.754, narrative: 'Datacenter interconnect experiencing packet loss on primary path. BGP route flapping detected between peering routers. Failover to secondary path completed but capacity constrained.' },
    ];
    setSearchResults(mockResults);
  };

  const handleCloseResults = () => {
    setSearchResults(null);
  };

  return (
    <div className="map-root">
      <SearchBar onSearch={handleSearch} />
      <ControlPanel state={state} setState={setState} />

      <div className="bottom-pills">
        <span className="pill">
          Incidents in View: {visibleCount.toLocaleString()}
        </span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      <LiveFeeds apiBase={API_BASE} />

      {searchResults !== null && (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          onClose={handleCloseResults}
        />
      )}

      <div className="map-canvas">
        <DeckGL
          initialViewState={{ longitude: -98, latitude: 39, zoom: 3 }}
          controller={true}
          layers={layers}
          getTooltip={null}
          onHover={info => {
            const obj = info && info.object;
            if (obj && obj.serviceIssue) {
              setHoverInfo({ x: info.x, y: info.y, object: obj });
            } else {
              setHoverInfo(null);
            }
          }}
        >
          <Map reuseMaps mapLib={maplibregl} mapStyle={styleUrl} />

          {hoverInfo?.object && (
            <TooltipIncident
              x={hoverInfo.x}
              y={hoverInfo.y}
              incident={hoverInfo.object}
            />
          )}
        </DeckGL>
      </div>
    </div>
  );
}
