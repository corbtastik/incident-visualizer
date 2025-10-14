import React, { useEffect, useMemo, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { useLiveStream } from './hooks/useLiveStream';
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

  // ---- NEW: live feed from infrastructure_events (no rendering yet) ----
  const {
    items: infraEvents,
    status: infraStatus,
    cursor: infraCursor
  } = useLiveStream({ category: 'infrastructure', intervalMs: 5000, cap: 10000 });

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

  // Small helper to peek at the latest infra event (safe + trimmed)
  const latestInfra = infraEvents.length ? infraEvents[infraEvents.length - 1] : null;

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

      {/* NEW: Minimal debug for the live infrastructure feed */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 5,
          padding: '10px 12px',
          background: 'rgba(20,20,25,0.75)',
          color: 'white',
          borderRadius: 12,
          fontSize: 12,
          lineHeight: 1.4,
          maxWidth: 360,
          backdropFilter: 'blur(4px)'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Infrastructure Live Feed</div>
        <div>Status: {infraStatus}</div>
        <div>Buffer size: {infraEvents.length.toLocaleString()}</div>
        <div style={{ wordBreak: 'break-all' }}>
          <div>Cursor: {infraCursor ? String(infraCursor) : '—'}</div>
        </div>
        {latestInfra && (
          <details style={{ marginTop: 6 }}>
            <summary>Latest event preview</summary>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(
                {
                  _id: latestInfra._id,
                  city: latestInfra.city,
                  lat: latestInfra.lat,
                  lng: latestInfra.lng,
                  weight: latestInfra.weight,
                  sigmaKm: latestInfra.sigmaKm,
                  serviceIssue: latestInfra.serviceIssue
                    ? {
                        type: latestInfra.serviceIssue.type,
                        category: latestInfra.serviceIssue.category,
                        issue: latestInfra.serviceIssue.issue
                      }
                    : undefined
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
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
