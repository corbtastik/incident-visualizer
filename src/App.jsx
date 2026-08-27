import React from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

import ViewNavigator from './components/ViewNavigator.jsx';
import LiveMapView from './views/LiveMapView.jsx';
import HeatmapView from './views/HeatmapView.jsx';
import SearchExplorerView from './views/SearchExplorerView.jsx';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export default function App() {
  return (
    <div className="app-root">
      <ViewNavigator>
        <LiveMapView
          viewId="live"
          apiBase={API_BASE}
        />
        <HeatmapView
          viewId="heatmap"
          apiBase={API_BASE}
        />
        <SearchExplorerView
          viewId="search"
          apiBase={API_BASE}
        />
      </ViewNavigator>
    </div>
  );
}
