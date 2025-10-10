import React, { useEffect, useMemo, useRef, useState } from 'react';
import DeckGL from '@deck.gl/react';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import ControlPanel from './components/ControlPanel.jsx';
import TopStats from './components/TopStats.jsx';

import { makeHeatmap, makeScatter } from './layers/index.js';
import { fetchIncidents, mockIncidents } from './api.js';
import { countsByType as computeCounts } from './utils/stats.js';

const DARK = import.meta.env.VITE_MAP_STYLE_URL || 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function App() {
  const mapRef = useRef(null);
  const [incidents, setIncidents] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [state, setState] = useState({
    layer: 'heatmap',
    radius: 30,
    baseMap: 'dark',
    colorRamp: 'cool',
    types: new Set(['wireless','fiber','enterprise','broadband','wifi-hotspot','iot','satellite','smart-city','public-safety','backhaul','edge','datacenter','cloud-network']),
    windowSec: 60,
    collapsed: false,
    cityQuery: ''
  });

  useEffect(() => {
    let mounted = true;
    async function loop() {
      try {
        const res = await fetchIncidents({ types: Array.from(state.types), windowSec: state.windowSec });
        if (mounted) setIncidents(res);
      } catch {
        if (mounted) setIncidents(mockIncidents(80000));
      }
    }
    loop();
    const id = setInterval(loop, 1000);
    return () => { mounted = false; clearInterval(id); };
  }, [state.types, state.windowSec]);

  const counts = useMemo(() => computeCounts(incidents, state.types), [incidents, state.types]);

  useEffect(() => { setTimeline(prev => [...prev.slice(-60), { t: Date.now(), ...counts }]); }, [counts]);

  const layers = useMemo(() => {
    const filtered = incidents.filter(d => state.types.has(d?.serviceIssue?.type));
    return [
      state.layer === 'heatmap'
        ? makeHeatmap(filtered, state.radius, state.colorRamp)
        : makeScatter(filtered, state.radius/4, state.colorRamp)
    ];
  }, [incidents, state.layer, state.radius, state.types, state.colorRamp]);

  const onZoomUS = () => { mapRef.current?.flyTo({ center: [-96.5, 39.8], zoom: 3.5, speed: 0.8 }); };
  const onZoomCity = async () => {
    const q = state.cityQuery?.trim();
    if (!q) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', USA')}`;
      const res = await fetch(url);
      const js = await res.json();
      if (js?.length) {
        const { lon, lat } = js[0];
        mapRef.current?.flyTo({ center: [Number(lon), Number(lat)], zoom: 9, speed: 0.8 });
      }
    } catch {}
  };

  const styleUrl = state.baseMap === 'dark' ? DARK : LIGHT;

  return (
    <div className="map-root">
      {/* Full-height left docked controls */}
      <ControlPanel state={state} setState={setState} onZoomUS={onZoomUS} onZoomCity={onZoomCity} />

      {/* Top stats (unchanged) */}
      <div className="stats-strip">
        <div className="panel rounded-xl p-3 w-72 h-40">
          <TopStats countsByType={counts} timeline={timeline} />
        </div>
      </div>

      {/* Bottom-right pills */}
      <div className="bottom-pills">
        <span className="pill">Incidents in View: {incidents.length.toLocaleString()}</span>
        <span className="pill">Window: {state.windowSec}s</span>
      </div>

      {/* Map canvas */}
      <div className="map-canvas">
        <DeckGL
          initialViewState={{ longitude: -98, latitude: 39, zoom: 3 }}
          controller={true}
          layers={layers}
          getTooltip={({object}) => object && `${object.serviceIssue?.type || 'unknown'}`}
        >
          <Map ref={mapRef} reuseMaps mapLib={maplibregl} mapStyle={styleUrl} />
        </DeckGL>
      </div>
    </div>
  );
}
