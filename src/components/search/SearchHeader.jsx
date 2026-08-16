/**
 * SearchHeader - Connection string display and search input
 *
 * Matches Screen 1 mockup: "Incident Intelligence" header with
 * MongoDB connection string and search bar with voyage-4 badge.
 */

import React from 'react';

export default function SearchHeader({
  query,
  onQueryChange,
  onSearch,
  connectionString = 'att-demo.r9xpj.mongodb.net',
  collection = 'incident_events'
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(query);
  };

  return (
    <div className="search-header">
      {/* Title and connection info */}
      <div className="search-header__title">
        <span className="search-header__label">Incident Intelligence</span>
        <div className="search-header__connection">
          <span className="search-header__connection-string">{connectionString}</span>
          <span className="search-header__collection">{collection}</span>
        </div>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="search-header__form">
        <div className="search-header__input-wrapper">
          <svg
            className="search-header__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange?.(e.target.value)}
            placeholder="backhoe damage near SE-MCA-2211"
            className="search-header__input"
          />
          <span className="search-header__model-badge">voyage-4</span>
        </div>
        <button type="submit" className="search-header__button">
          Search
        </button>
      </form>
    </div>
  );
}
