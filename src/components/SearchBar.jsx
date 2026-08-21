import React, { useState } from 'react';

export default function SearchBar({ onSearch }) {
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
        <button type="submit" className="search-button">
          Search
        </button>
      </form>
    </div>
  );
}
