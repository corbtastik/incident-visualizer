import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';
import LiveFeeds from './components/LiveFeeds.jsx';
import { useCategoryFeed } from './hooks/useCategoryFeed';
import { makeCategoryScatterLayers } from './layers/index.js';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

// helper used in a couple spots
const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function App() {
  // Default filters to NONE selected
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 30,
    baseMap: 'dark',
    colorRamp: 'cool',
    types: new Set(), // none selected by default
    windowSec: 60,    // kept for UI (not used by streams)
    collapsed: false
  });

  // --- Reuse the SAME hook as Live Feeds for map data ---
  const businessFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'business',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const consumerFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'consumer',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const emergingTechFeed   = useCategoryFeed({ baseUrl: API_BASE, category: 'emerging_tech',  intervalMs: 2000, pageSize: 200, cap: 8000 });
  const federalFeed        = useCategoryFeed({ baseUrl: API_BASE, category: 'federal',        intervalMs: 2000, pageSize: 200, cap: 8000 });
  const infraFeed          = useCategoryFeed({ baseUrl: API_BASE, category: 'infrastructure', intervalMs: 2000, pageSize: 200, cap: 8000 });

  // Build layers (respect left-panel type filters; filter logic lives in layers/index.js)
  const layers = useMemo(() => {
    return makeCategoryScatterLayers(
      {
        business:       businessFeed.data,
        consumer:       consumerFeed.data,
        emerging_tech:  emergingTechFeed.data,
        federal:        federalFeed.data,
        infrastructure: infraFeed.data
      },
      { radius: state.radius, types: state.types }
    );
  }, [
    businessFeed.data,
    consumerFeed.data,
    emergingTechFeed.data,
    federalFeed.data,
    infraFeed.data,
    state.radius,
    state.types
  ]);

  // Derive “Incidents in View” from currently visible points (filtered by selected types)
  const visibleCount = useMemo(() => {
    if (state.types.size === 0) return 0;
    const wanted = new Set([...state.types].map(slugify));
    const all = [
      ...businessFeed.data,
      ...consumerFeed.data,
      ...emergingTechFeed.data,
      ...federalFeed.data,
      ...infraFeed.data
    ];
    return all.reduce((acc, d) => {
      const t = slugify(d?.serviceIssue?.type);
      return acc + (t && wanted.has(t) ? 1 : 0);
    }, 0);
  }, [
    businessFeed.data,
    consumerFeed.data,
    emergingTechFeed.data,
    federalFeed.data,
    infraFeed.data,
    state.types
  ]);

  const styleUrl = state.baseMap === 'dark' ? DARK : LIGHT;

  // -------------------------
  // QUICK CONSOLE PROBES
  // -------------------------
  useEffect(() => {
    const pick = (arr) => (arr && arr.length ? arr[arr.length - 1] : null);
    const sample = (d) =>
      d
        ? {
            _id: d._id,
            city: d.city,
            lat: d.lat,
            lng: d.lng,
            type: d?.serviceIssue?.type
          }
        : null;

    console.debug('[ASP] API_BASE:', API_BASE);
    console.debug('[ASP] stream sizes', {
      business: businessFeed.data.length,
      consumer: consumerFeed.data.length,
      emerging_tech: emergingTechFeed.data.length,
      federal: federalFeed.data.length,
      infrastructure: infraFeed.data.length
    });
    console.debug('[ASP] last samples', {
      business: sample(pick(businessFeed.data)),
      consumer: sample(pick(consumerFeed.data)),
      emerging_tech: sample(pick(emergingTechFeed.data)),
      federal: sample(pick(federalFeed.data)),
      infrastructure: sample(pick(infraFeed.data))
    });
    console.debug('[ASP] selected types (slugs):', [...state.types].map(slugify));
    console.debug('[ASP] layers count:', layers.length, 'visibleCount:', visibleCount);
  }, [
    businessFeed.data,
    consumerFeed.data,
    emergingTechFeed.data,
    federalFeed.data,
    infraFeed.data,
    state.types,
    layers.length,
    visibleCount
  ]);
  // -------------------------

  return (
    <div className="map-root">
      {/* Full-height left docked controls */}
      <ControlPanel state={state} setState={setState} />

      {/* Bottom-right pills */}
      <div className="bottom-pills">
        <span className="pill">
          Incidents in View: {visibleCount.toLocaleString()}
        </span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      {/* Multi-category Live Feeds panel */}
      <LiveFeeds apiBase={API_BASE} />

      {/* Map canvas */}
      <div className="map-canvas">
        <DeckGL
          initialViewState={{ longitude: -98, latitude: 39, zoom: 3 }}
          controller={true}
          layers={layers}
          getTooltip={({ object }) =>
            object && `${object.serviceIssue?.type || 'unknown'}`
          }
        >
          <Map reuseMaps mapLib={maplibregl} mapStyle={styleUrl} />
        </DeckGL>
      </div>
    </div>
  );
}
