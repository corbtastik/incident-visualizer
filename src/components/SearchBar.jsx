import React, { useState } from 'react';

export default function SearchBar({ onSearch, currentRunOnly, onToggleCurrentRun, hasSimRunId }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="top-dock">
      <form className="top-dock__panel" onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-input"
          placeholder="Search incidents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" className="search-clear" onClick={handleClear} title="Clear">
            ×
          </button>
        )}
        <label
          className="current-run-toggle"
          title={hasSimRunId ? "Filter search to current simulation run" : "No active simulation run detected"}
          style={{ opacity: hasSimRunId ? 1 : 0.5 }}
        >
          <input
            type="checkbox"
            checked={currentRunOnly}
            onChange={(e) => onToggleCurrentRun?.(e.target.checked)}
            disabled={!hasSimRunId}
          />
          <span className="toggle-label">Current run</span>
        </label>
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
    </div>
  );
}
