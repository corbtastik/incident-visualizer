import React, { useMemo, useState, useCallback } from 'react';
import DeckGL from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

import { useHeatmapData } from '../hooks/useHeatmapData';

const DARK =
  import.meta.env.VITE_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Thermal color ramp: blue -> cyan -> green -> yellow -> orange -> red
const COLOR_RANGE = [
  [65, 105, 225, 180],   // royal blue
  [65, 182, 196, 180],   // cyan
  [127, 205, 187, 180],  // teal
  [199, 233, 180, 180],  // light green
  [255, 255, 153, 180],  // yellow
  [255, 170, 0, 180],    // orange
  [255, 87, 51, 200],    // red-orange
  [255, 0, 0, 220],      // red
];

export default function HeatmapView({ apiBase }) {
  const [categories, setCategories] = useState({
    business: true,
    consumer: true,
    emerging_tech: true,
    federal: true,
    infrastructure: true
  });

  const [viewState, setViewState] = useState({
    longitude: -98,
    latitude: 33,
    zoom: 4,
    pitch: 0,
    bearing: 0,
  });

  const [settings, setSettings] = useState({
    radiusPixels: 30,
    intensity: 1,
    threshold: 0.05,
  });

  const { data, loading, error, stats, refetch } = useHeatmapData({
    baseUrl: apiBase,
    categories,
    limit: 50000
  });

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

  const toggleCategory = useCallback((cat) => {
    setCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const layers = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [
      new HeatmapLayer({
        id: 'heatmap-layer',
        data,
        getPosition: d => d.position,
        getWeight: 1,
        radiusPixels: settings.radiusPixels,
        intensity: settings.intensity,
        threshold: settings.threshold,
        colorRange: COLOR_RANGE,
        aggregation: 'SUM',
      })
    ];
  }, [data, settings]);

  return (
    <div className="heatmap-view">
      {/* Heatmap Controls */}
      <div className="heatmap-controls left-dock">
        <div className="left-dock__panel">
          <div className="cp-header">
            <span>Heatmap Controls</span>
            <button className="cp-reset-btn" onClick={resetView}>
              Center Map
            </button>
          </div>

          <div className="cp-body">
            <div className="section-title">Categories</div>
            {Object.entries(categories).map(([cat, enabled]) => (
              <label key={cat} className="checkbox-row">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={enabled}
                  onChange={() => toggleCategory(cat)}
                />
                <span style={{ textTransform: 'capitalize' }}>
                  {cat.replace(/_/g, ' ')}
                </span>
                {stats.byCategory[cat] !== undefined && (
                  <span style={{ marginLeft: 'auto', opacity: 0.6, fontSize: 12 }}>
                    {stats.byCategory[cat]?.toLocaleString()}
                  </span>
                )}
              </label>
            ))}

            <div className="section-title" style={{ marginTop: 20 }}>Display</div>

            <label>
              Radius ({settings.radiusPixels}px)
              <input
                type="range"
                className="slider"
                min="10"
                max="100"
                value={settings.radiusPixels}
                onChange={(e) => setSettings(s => ({ ...s, radiusPixels: +e.target.value }))}
              />
            </label>

            <label>
              Intensity ({settings.intensity.toFixed(1)})
              <input
                type="range"
                className="slider"
                min="0.1"
                max="3"
                step="0.1"
                value={settings.intensity}
                onChange={(e) => setSettings(s => ({ ...s, intensity: +e.target.value }))}
              />
            </label>

            <label>
              Threshold ({settings.threshold.toFixed(2)})
              <input
                type="range"
                className="slider"
                min="0"
                max="0.5"
                step="0.01"
                value={settings.threshold}
                onChange={(e) => setSettings(s => ({ ...s, threshold: +e.target.value }))}
              />
            </label>

            <button
              className="cp-reset-btn"
              style={{ marginTop: 16, width: '100%' }}
              onClick={refetch}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>

          <div className="cp-footer">
            <img src="/atlas-logo.svg" alt="MongoDB Atlas" />
          </div>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="bottom-pills">
        <span className="pill">
          {loading ? 'Loading...' : `${stats.total.toLocaleString()} incidents`}
        </span>
        <span className="pill">Historical Data</span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="heatmap-error">
          Error loading data: {error}
        </div>
      )}

      {/* Map Canvas */}
      <div className="map-canvas">
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
          controller={true}
          layers={layers}
        >
          <Map reuseMaps mapLib={maplibregl} mapStyle={DARK} />
        </DeckGL>
      </div>
    </div>
  );
}
