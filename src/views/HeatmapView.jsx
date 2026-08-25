import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import DeckGL from '@deck.gl/react';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { Map } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';

import { useHeatmapData } from '../hooks/useHeatmapData';
import SearchBar from '../components/SearchBar.jsx';
import SearchResults from '../components/SearchResults.jsx';
import TooltipIncident from '../components/TooltipIncident.jsx';
import { makeSearchResultLayers } from '../layers/index.js';

// Convert UI slider value (0-100) to pixel radius
function uiToRadiusPx(u) {
  const v = Math.max(0, Math.min(100, Number(u) || 0));
  if (v <= 50) return 1 + (2 - 1) * (v / 50);
  return 2 + (14 - 2) * ((v - 50) / 50);
}

// Format timestamp for display
function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

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
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentRunOnly, setCurrentRunOnly] = useState(false); // Default false for historical view
  const [hoverInfo, setHoverInfo] = useState(null);

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
    radiusPixels: 30,  // Heatmap spread
    intensity: 1,
    threshold: 0.05,
  });

  // Separate point size for search result pins
  const [searchPointSize, setSearchPointSize] = useState(50);

  // Time playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const [currentTime, setCurrentTime] = useState(null); // null = show all
  const playIntervalRef = useRef(null);

  const { data, loading, error, stats, timeRange, refetch } = useHeatmapData({
    baseUrl: apiBase,
    categories,
    limit: 50000
  });

  // Initialize currentTime when data loads
  useEffect(() => {
    if (timeRange.min !== null && currentTime === null) {
      setCurrentTime(timeRange.max); // Start showing all data
    }
  }, [timeRange.min, timeRange.max, currentTime]);

  // Playback animation
  useEffect(() => {
    if (isPlaying && timeRange.min !== null && timeRange.max !== null) {
      const totalDuration = timeRange.max - timeRange.min;
      // Complete animation in ~30 seconds at 1x speed
      const stepMs = 50; // Update every 50ms
      const timePerStep = (totalDuration / (30000 / stepMs)) * playbackSpeed;

      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const next = (prev || timeRange.min) + timePerStep;
          if (next >= timeRange.max) {
            setIsPlaying(false);
            return timeRange.max;
          }
          return next;
        });
      }, stepMs);

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
      };
    }
  }, [isPlaying, playbackSpeed, timeRange.min, timeRange.max]);

  // Filter data by current time
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (currentTime === null || currentTime >= timeRange.max) return data;
    return data.filter(d => d.timestamp <= currentTime);
  }, [data, currentTime, timeRange.max]);

  // Calculate visible count for current time
  const visibleCount = filteredData.length;

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

  const zoomToLocation = useCallback((lat, lng) => {
    setViewState(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      zoom: 12,
      transitionDuration: 1000,
    }));
  }, []);

  const toggleCategory = useCallback((cat) => {
    setCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // Time playback controls
  const handlePlayPause = useCallback(() => {
    if (!isPlaying && currentTime >= timeRange.max) {
      // Reset to beginning if at end
      setCurrentTime(timeRange.min);
    }
    setIsPlaying(prev => !prev);
  }, [isPlaying, currentTime, timeRange.min, timeRange.max]);

  const handleTimeSliderChange = useCallback((e) => {
    setIsPlaying(false);
    setCurrentTime(Number(e.target.value));
  }, []);

  const handleTimeReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(timeRange.max);
  }, [timeRange.max]);

  const handleSpeedChange = useCallback(() => {
    setPlaybackSpeed(prev => {
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 1;
    });
  }, []);

  // Search handlers
  const handleSearch = useCallback(async (query) => {
    if (!query || query.trim().length === 0) return;

    setSearchQuery(query);
    setSearchResults([]);
    setSearchLoading(true);

    try {
      const body = { query: query.trim(), limit: 20 };
      // Note: currentRunOnly is false by default for heatmap (historical search)

      const response = await fetch(`${apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const json = await response.json();
      setSearchResults(json.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [apiBase]);

  const handleCloseResults = useCallback(() => {
    setSearchResults(null);
  }, []);

  // Animation tick for search pins
  const [nowTick, setNowTick] = useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const heatmapLayers = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    return [
      new HeatmapLayer({
        id: 'heatmap-layer',
        data: filteredData,
        getPosition: d => d.position,
        getWeight: 1,
        radiusPixels: settings.radiusPixels,
        intensity: settings.intensity,
        threshold: settings.threshold,
        colorRange: COLOR_RANGE,
        aggregation: 'SUM',
      })
    ];
  }, [filteredData, settings]);

  // Convert point size slider to pixels
  const searchRadiusPx = useMemo(() => uiToRadiusPx(searchPointSize), [searchPointSize]);

  // Search result pin layers
  const searchLayers = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return [];
    return makeSearchResultLayers(searchResults, { radiusPx: searchRadiusPx, nowTick });
  }, [searchResults, searchRadiusPx, nowTick]);

  // Combine all layers
  const layers = useMemo(() => {
    return [...heatmapLayers, ...searchLayers];
  }, [heatmapLayers, searchLayers]);

  return (
    <div className="heatmap-view">
      <SearchBar
        onSearch={handleSearch}
        currentRunOnly={currentRunOnly}
        onToggleCurrentRun={setCurrentRunOnly}
        hasSimRunId={false}
      />

      {/* Heatmap Controls */}
      <div className="heatmap-controls left-dock">
        <div className="left-dock__panel">
          <div className="cp-header">
            <span>Heatmap Controls</span>
          </div>

          <div className="cp-body">
            {/* Top controls - match Live Map layout */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10, marginBottom: 12 }}>
              <label>
                <span>Point Size</span>
                <input
                  className="slider w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={searchPointSize}
                  onChange={(e) => setSearchPointSize(+e.target.value)}
                />
              </label>

              <button
                type="button"
                className="cp-reset-btn"
                onClick={resetView}
              >
                Center Map
              </button>
            </div>

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
              Heat Radius ({settings.radiusPixels}px)
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

            {/* Time Controls */}
            {timeRange.min !== null && timeRange.max !== null && (
              <>
                <div className="section-title" style={{ marginTop: 20 }}>Time Playback</div>

                <div className="time-display">
                  {formatTime(currentTime || timeRange.max)}
                </div>

                <input
                  type="range"
                  className="slider time-slider"
                  min={timeRange.min}
                  max={timeRange.max}
                  value={currentTime || timeRange.max}
                  onChange={handleTimeSliderChange}
                />

                <div className="time-range-labels">
                  <span>{formatTime(timeRange.min)}</span>
                  <span>{formatTime(timeRange.max)}</span>
                </div>

                <div className="time-controls">
                  <button
                    className="time-btn"
                    onClick={handlePlayPause}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" />
                        <rect x="14" y="4" width="4" height="16" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21" />
                      </svg>
                    )}
                  </button>

                  <button
                    className="time-btn"
                    onClick={handleSpeedChange}
                    title="Change speed"
                  >
                    {playbackSpeed}x
                  </button>

                  <button
                    className="time-btn"
                    onClick={handleTimeReset}
                    title="Show all"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>

                <div className="time-stats">
                  Showing {visibleCount.toLocaleString()} of {stats.total.toLocaleString()}
                </div>
              </>
            )}
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

      {/* Search Results */}
      {searchResults !== null && (
        <SearchResults
          query={searchQuery}
          results={searchResults}
          loading={searchLoading}
          onClose={handleCloseResults}
          onZoom={zoomToLocation}
        />
      )}

      {/* Map Canvas */}
      <div className="map-canvas">
        <DeckGL
          viewState={viewState}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
          controller={true}
          layers={layers}
          onHover={info => {
            const obj = info && info.object;
            if (obj && obj.serviceIssue) {
              setHoverInfo({ x: info.x, y: info.y, object: obj });
            } else {
              setHoverInfo(null);
            }
          }}
        >
          <Map reuseMaps mapLib={maplibregl} mapStyle={DARK} />

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
