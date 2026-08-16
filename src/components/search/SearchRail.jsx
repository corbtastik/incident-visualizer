/**
 * SearchRail - Left rail container for search shell
 *
 * Composes all search control components into the 300px left rail.
 */

import React from 'react';
import SearchHeader from './SearchHeader';
import SearchModeToggle from './SearchModeToggle';
import RelevanceSlider from './RelevanceSlider';
import CategoryFilters from './CategoryFilters';
import SeverityPills from './SeverityPills';
import ActivePatterns from './ActivePatterns';

export default function SearchRail({
  // Search state
  query,
  onQueryChange,
  onSearch,
  // Mode state
  searchMode,
  onSearchModeChange,
  // Relevance state
  relevanceBlend,
  onRelevanceChange,
  // Category state
  categories,
  onCategoryChange,
  categoryCounts,
  // Severity state
  severities,
  onSeverityChange,
  // Active patterns
  activePatterns,
}) {
  return (
    <div className="search-rail">
      {/* Header with search input */}
      <SearchHeader
        query={query}
        onQueryChange={onQueryChange}
        onSearch={onSearch}
      />

      {/* Divider */}
      <div className="search-rail__divider" />

      {/* Search mode tabs */}
      <SearchModeToggle
        mode={searchMode}
        onModeChange={onSearchModeChange}
      />

      {/* Divider */}
      <div className="search-rail__divider" />

      {/* Relevance blend slider */}
      <RelevanceSlider
        value={relevanceBlend}
        onChange={onRelevanceChange}
      />

      {/* Divider */}
      <div className="search-rail__divider" />

      {/* Category filters */}
      <div className="search-rail__scrollable">
        <CategoryFilters
          categories={categories}
          onCategoryChange={onCategoryChange}
          counts={categoryCounts}
        />

        {/* Divider */}
        <div className="search-rail__divider" />

        {/* Severity pills */}
        <SeverityPills
          selected={severities}
          onChange={onSeverityChange}
        />

        {/* Divider */}
        <div className="search-rail__divider" />

        {/* Active patterns */}
        <ActivePatterns
          active={activePatterns}
        />
      </div>

      {/* Footer */}
      <div className="search-rail__footer">
        <img
          src="https://webimages.mongodb.com/_com_assets/cms/kuyjf3vea2hg34taa-horizontal_default_slate_blue.svg"
          alt="MongoDB"
          className="search-rail__logo"
        />
        <span className="search-rail__footer-text">Atlas</span>
      </div>
    </div>
  );
}
