import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';
import LiveFeeds from './components/LiveFeeds.jsx';
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
