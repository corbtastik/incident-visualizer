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

import SearchShell from './shells/SearchShell';
import DetailShell from './shells/DetailShell';

import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
