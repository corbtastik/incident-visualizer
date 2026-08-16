/**
 * SearchModeToggle - Lexical | Hybrid | Semantic tabs
 *
 * Matches Screen 1 mockup: three-way toggle for search mode,
 * with Hybrid as the default active state.
 */

import React from 'react';

const MODES = [
  { id: 'lexical', label: 'Lexical' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'semantic', label: 'Semantic' },
];

export default function SearchModeToggle({ mode, onModeChange }) {
  return (
    <div className="search-mode">
      <div className="search-mode__label">SEARCH MODE</div>
      <div className="search-mode__tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange?.(m.id)}
            className={`search-mode__tab ${mode === m.id ? 'search-mode__tab--active' : ''}`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
