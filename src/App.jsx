/**
 * incident-visualizer v2 — Main Application
 *
 * Routes:
 * - / or /search     → SearchShell (Screens 1 & 2)
 * - /incident/:id    → DetailShell - Incident view (Screen 3)
 * - /cluster/:id     → DetailShell - Cluster view (Screen 4)
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { MapSettingsProvider } from './context/MapSettingsContext';
import AppHeader from './components/layout/AppHeader';
import ControlBar from './components/layout/ControlBar';
import SearchShell from './shells/SearchShell';
import DetailShell from './shells/DetailShell';

import './styles.css';

export default function App() {
  return (
    <MapSettingsProvider>
      <BrowserRouter>
        <div className="app-layout">
          <AppHeader />
          <ControlBar />
          <div className="app-layout__content">
            <Routes>
              {/* Search Shell - main view */}
              <Route path="/" element={<SearchShell />} />
              <Route path="/search" element={<SearchShell />} />

              {/* Detail Shell - incident detail */}
              <Route path="/incident/:id" element={<DetailShell />} />

              {/* Detail Shell - cluster detail */}
              <Route path="/cluster/:id" element={<DetailShell />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </MapSettingsProvider>
  );
}
