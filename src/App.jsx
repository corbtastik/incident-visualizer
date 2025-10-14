import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';

// Removed: makeHeatmap/makeScatter and mockIncidents
import { fetchIncidents } from './api.js';
import { countsByType as computeCounts } from './utils/stats.js';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [timeline, setTimeline] = useState([]);

  // Keep state shape mostly the same for ControlPanel compatibility,
  // but remove cityQuery and any zoom handlers.
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 30,
    baseMap: 'dark',
    colorRamp: 'cool',
    types: new Set([
      'wireless',
      'fiber',
      'enterprise',
      'broadband',
      'wifi-hotspot',
      'iot',
      'satellite',
      'smart-city',
      'public-safety',
      'backhaul',
      'edge',
      'datacenter',
      'cloud-network'
    ]),
    windowSec: 60,
    collapsed: false
  });

  // Poll backend (no mocks on failure)
  useEffect(() => {
    let mounted = true;
    async function loop() {
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
    const id = setInterval(loop, 1000);
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
