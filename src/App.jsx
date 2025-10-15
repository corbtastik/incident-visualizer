import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';
import LiveFeeds from './components/LiveFeeds.jsx';

// Removed: useLiveStream (old infra-only feed)
import { fetchIncidents } from './api.js';
import { countsByType as computeCounts } from './utils/stats.js';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Default filters to NONE selected
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 30,
    baseMap: 'dark',
    colorRamp: 'cool',
    types: new Set(), // none selected by default
    windowSec: 60,
    collapsed: false
  });

  // Existing polling (based on your selected types) — leaving as-is for now.
  useEffect(() => {
    let mounted = true;

    async function loop() {
      // Optimization: if no types selected, clear and skip fetch
      if (state.types.size === 0) {
        if (mounted) setIncidents([]);
        return;
      }

      try {
        const res = await fetchIncidents({
          types: Array.from(state.types),
          windowSec: state.windowSec
        });
        if (mounted) setIncidents(res || []);
      } catch {
        if (mounted) setIncidents([]); // no mock fallback
      }
    }

    loop();
    const id = setInterval(loop, 5000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [state.types, state.windowSec]);

  const counts = useMemo(
    () => computeCounts(incidents, state.types),
    [incidents, state.types]
  );

  useEffect(() => {
    setTimeline(prev => [...prev.slice(-60), { t: Date.now(), ...counts }]);
  }, [counts]);

  // No deck.gl layers for now
  const layers = useMemo(() => [], []);

  const styleUrl = state.baseMap === 'dark' ? DARK : LIGHT;

  return (
    <div className="map-root">
      {/* Full-height left docked controls */}
      <ControlPanel state={state} setState={setState} />

      {/* Bottom-right pills */}
      <div className="bottom-pills">
        <span className="pill">
          Incidents in View: {incidents.length.toLocaleString()}
        </span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      {/* NEW: Multi-category Live Feeds panel (replaces old infra-only widget) */}
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
