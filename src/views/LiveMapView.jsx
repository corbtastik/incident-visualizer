import React, { useEffect, useMemo, useState, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

import ControlPanel from '../components/ControlPanel.jsx';
import LiveFeeds from '../components/LiveFeeds.jsx';
import SearchBar from '../components/SearchBar.jsx';
import SearchResults from '../components/SearchResults.jsx';
import { useCategoryFeed } from '../hooks/useCategoryFeed';
import { makeCategoryScatterLayers, makeSearchResultLayers } from '../layers/index.js';
import TooltipIncident from '../components/TooltipIncident.jsx';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

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

export default function LiveMapView({ apiBase }) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentRunOnly, setCurrentRunOnly] = useState(true);
  const [searchMode, setSearchMode] = useState('semantic');
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
  const [viewState, setViewState] = useState({
    longitude: -98,
    latitude: 33,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  });

  const zoomToLocation = useCallback((lat, lng) => {
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: 12,
      transitionDuration: 1000,
    }));
  }, []);

  const resetView = useCallback(() => {
    setViewState({
      longitude: -98,
      latitude: 33,
      zoom: 4,
      pitch: 0,
      bearing: 0,
      transitionDuration: 1000,
    });
  }, []);

  // Feeds (one hook per category) - defined before currentSimRunId computation
  const businessFeed       = useCategoryFeed({ baseUrl: apiBase, category: 'business',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const consumerFeed       = useCategoryFeed({ baseUrl: apiBase, category: 'consumer',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const emergingTechFeed   = useCategoryFeed({ baseUrl: apiBase, category: 'emerging_tech',  intervalMs: 2000, pageSize: 200, cap: 8000 });
  const federalFeed        = useCategoryFeed({ baseUrl: apiBase, category: 'federal',        intervalMs: 2000, pageSize: 200, cap: 8000 });
  const infraFeed          = useCategoryFeed({ baseUrl: apiBase, category: 'infrastructure', intervalMs: 2000, pageSize: 200, cap: 8000 });

  // Get current simRunId from any active feed
  const currentSimRunId = useMemo(() => {
    return businessFeed?.currentSimRunId ||
           consumerFeed?.currentSimRunId ||
           emergingTechFeed?.currentSimRunId ||
           federalFeed?.currentSimRunId ||
           infraFeed?.currentSimRunId ||
           null;
  }, [
    businessFeed?.currentSimRunId,
    consumerFeed?.currentSimRunId,
    emergingTechFeed?.currentSimRunId,
    federalFeed?.currentSimRunId,
    infraFeed?.currentSimRunId
  ]);

  // Search handlers
  const handleSearch = useCallback(async (query) => {
    if (!query || query.trim().length === 0) return;

    setSearchQuery(query);
    setSearchResults([]);
    setSearchLoading(true);

    try {
      const body = { query: query.trim(), limit: 20 };
      if (currentRunOnly && currentSimRunId) {
        body.simRunId = currentSimRunId;
      }

      const response = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiBase, currentRunOnly, currentSimRunId]);

  const handleCloseResults = useCallback(() => {
    setSearchResults(null);
  }, []);

  const radiusPx = useMemo(() => uiToRadiusPx(state.radius), [state.radius]);

  // Animation tick for blink/grow (lightweight ~4 FPS)
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Choose render data per category
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
    business: businessFeed?.demo?.enabled ? {
      enabled: true,
      createdAtRef: businessFeed.demo.createdAtRef,
      expiryAtRef: businessFeed.demo.expiryAtRef,
      resolutionMapRef: businessFeed.demo.resolutionMapRef,
      repairStartedAtRef: businessFeed.demo.repairStartedAtRef
    } : { enabled: false },
    consumer: consumerFeed?.demo?.enabled ? {
      enabled: true,
      createdAtRef: consumerFeed.demo.createdAtRef,
      expiryAtRef: consumerFeed.demo.expiryAtRef,
      resolutionMapRef: consumerFeed.demo.resolutionMapRef,
      repairStartedAtRef: consumerFeed.demo.repairStartedAtRef
    } : { enabled: false },
    emerging_tech: emergingTechFeed?.demo?.enabled ? {
      enabled: true,
      createdAtRef: emergingTechFeed.demo.createdAtRef,
      expiryAtRef: emergingTechFeed.demo.expiryAtRef,
      resolutionMapRef: emergingTechFeed.demo.resolutionMapRef,
      repairStartedAtRef: emergingTechFeed.demo.repairStartedAtRef
    } : { enabled: false },
    federal: federalFeed?.demo?.enabled ? {
      enabled: true,
      createdAtRef: federalFeed.demo.createdAtRef,
      expiryAtRef: federalFeed.demo.expiryAtRef,
      resolutionMapRef: federalFeed.demo.resolutionMapRef,
      repairStartedAtRef: federalFeed.demo.repairStartedAtRef
    } : { enabled: false },
    infrastructure: infraFeed?.demo?.enabled ? {
      enabled: true,
      createdAtRef: infraFeed.demo.createdAtRef,
      expiryAtRef: infraFeed.demo.expiryAtRef,
      resolutionMapRef: infraFeed.demo.resolutionMapRef,
      repairStartedAtRef: infraFeed.demo.repairStartedAtRef
    } : { enabled: false }
  }), [
    businessFeed?.demo, consumerFeed?.demo, emergingTechFeed?.demo, federalFeed?.demo, infraFeed?.demo
  ]);

  // Build layers with per-category render data and meta
  const liveLayers = useMemo(() => {
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

  // Build search result pin layers
  const searchLayers = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return [];
    return makeSearchResultLayers(searchResults, { radiusPx, nowTick });
  }, [searchResults, radiusPx, nowTick]);

  // Combine all layers
  const layers = useMemo(() => {
    return [...liveLayers, ...searchLayers];
  }, [liveLayers, searchLayers]);

  // Visible count
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

  return (
    <div className="live-map-view">
      <SearchBar
        onSearch={handleSearch}
        currentRunOnly={currentRunOnly}
        onToggleCurrentRun={setCurrentRunOnly}
        hasSimRunId={!!currentSimRunId}
      />

      <ControlPanel
        state={state}
        setState={setState}
        onResetView={resetView}
        searchMode={searchMode}
        onSearchModeChange={setSearchMode}
      />

      <div className="bottom-pills">
        <span className="pill">
          Incidents in View: {visibleCount.toLocaleString()}
        </span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      <LiveFeeds apiBase={apiBase} />

      {searchResults !== null && (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          onClose={handleCloseResults}
          onZoom={zoomToLocation}
        />
      )}

      <div className="map-canvas">
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
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
