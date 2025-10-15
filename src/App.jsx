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

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Map UI slider (0..100) to pixel radius:
//  - 50  -> 2px   (default / your preferred smallest)
//  - 0   -> ~1px
//  - 100 -> ~14px
function uiToRadiusPx(u) {
  const v = Math.max(0, Math.min(100, Number(u) || 0));
  if (v <= 50) {
    // 0..50 -> 1..2
    return 1 + (2 - 1) * (v / 50);
  }
  // 50..100 -> 2..14
  return 2 + (14 - 2) * ((v - 50) / 50);
}

export default function App() {
  // Default: slider at middle (50) which maps to 2px points; all categories visible
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 50, // UI slider value (0..100); 50 => 2px
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

  // Use SAME feed hook as Live Feeds so plotting == panel data
  const businessFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'business',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const consumerFeed       = useCategoryFeed({ baseUrl: API_BASE, category: 'consumer',       intervalMs: 2000, pageSize: 200, cap: 8000 });
  const emergingTechFeed   = useCategoryFeed({ baseUrl: API_BASE, category: 'emerging_tech',  intervalMs: 2000, pageSize: 200, cap: 8000 });
  const federalFeed        = useCategoryFeed({ baseUrl: API_BASE, category: 'federal',        intervalMs: 2000, pageSize: 200, cap: 8000 });
  const infraFeed          = useCategoryFeed({ baseUrl: API_BASE, category: 'infrastructure', intervalMs: 2000, pageSize: 200, cap: 8000 });

  const radiusPx = useMemo(() => uiToRadiusPx(state.radius), [state.radius]);

  // Build layers (now with category visibility + type filtering + new radius scale)
  const layers = useMemo(() => {
    return makeCategoryScatterLayers(
      {
        business:       businessFeed.data,
        consumer:       consumerFeed.data,
        emerging_tech:  emergingTechFeed.data,
        federal:        federalFeed.data,
        infrastructure: infraFeed.data
      },
      { radiusPx, types: state.types, categories: state.categories }
    );
  }, [
    businessFeed.data,
    consumerFeed.data,
    emergingTechFeed.data,
    federalFeed.data,
    infraFeed.data,
    radiusPx,
    state.types,
    state.categories
  ]);

  // Visible count respects both category toggles and type filters
  const visibleCount = useMemo(() => {
    if (state.types.size === 0) return 0;
    const wanted = new Set([...state.types].map(slugify));
    const pools = [];
    if (state.categories.business)       pools.push(...businessFeed.data);
    if (state.categories.consumer)       pools.push(...consumerFeed.data);
    if (state.categories.emerging_tech)  pools.push(...emergingTechFeed.data);
    if (state.categories.federal)        pools.push(...federalFeed.data);
    if (state.categories.infrastructure) pools.push(...infraFeed.data);
    return pools.reduce((acc, d) => {
      const t = slugify(d?.serviceIssue?.type);
      return acc + (t && wanted.has(t) ? 1 : 0);
    }, 0);
  }, [
    businessFeed.data,
    consumerFeed.data,
    emergingTechFeed.data,
    federalFeed.data,
    infraFeed.data,
    state.types,
    state.categories
  ]);

  const styleUrl = state.baseMap === 'dark' ? DARK : LIGHT;

  return (
    <div className="map-root">
      <ControlPanel state={state} setState={setState} />

      <div className="bottom-pills">
        <span className="pill">
          Incidents in View: {visibleCount.toLocaleString()}
        </span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      <LiveFeeds apiBase={API_BASE} />

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
