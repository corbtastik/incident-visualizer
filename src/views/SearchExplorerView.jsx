import React, { useState, useCallback } from 'react';

const SEARCH_TYPES = [
  { id: 'lexical', label: 'Lexical', description: 'Keyword matching' },
  { id: 'hybrid', label: 'Hybrid', description: 'Best of both' },
  { id: 'vector', label: 'Vector', description: 'Semantic search' },
];

/**
 * Lightweight JSON syntax highlighter using brand colors
 */
function highlightJson(obj) {
  const json = JSON.stringify(obj, null, 2);

  // Escape HTML first
  let highlighted = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // MongoDB operators (purple) - match $word patterns
  highlighted = highlighted.replace(
    /"\$(\w+)"/g,
    '"<span class="json-mongo-op">$$$1</span>"'
  );

  // Property keys (blue) - match "key": patterns
  highlighted = highlighted.replace(
    /"([^"]+)"(?=\s*:)/g,
    '"<span class="json-key">$1</span>"'
  );

  // String values (teal) - match ": "value" patterns, but not already highlighted
  highlighted = highlighted.replace(
    /: "([^"]*)"(?![^<]*<\/span>)/g,
    ': "<span class="json-string">$1</span>"'
  );

  // Numbers (yellow)
  highlighted = highlighted.replace(
    /: (\d+\.?\d*)/g,
    ': <span class="json-number">$1</span>'
  );

  // Booleans and null (pink)
  highlighted = highlighted.replace(
    /: (true|false|null)/g,
    ': <span class="json-bool">$1</span>'
  );

  // Brackets and braces (muted)
  highlighted = highlighted.replace(
    /([[{}\]])/g,
    '<span class="json-bracket">$1</span>'
  );

  return highlighted;
}

export default function SearchExplorerView({ apiBase, isActive = true }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('hybrid');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // 'incident' or 'media'
  const [showAggregation, setShowAggregation] = useState(true);

  const handleSelectIncident = (incident) => {
    setSelectedResult(incident);
    setSelectedType('incident');
  };

  const handleSelectMedia = (media) => {
    setSelectedResult(media);
    setSelectedType('media');
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedResult(null);
    setSelectedType(null);

    try {
      const response = await fetch(`${apiBase}/search/${searchType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 20 }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data);

      // Auto-select first incident result
      if (data.incidents?.length > 0) {
        setSelectedResult(data.incidents[0]);
        setSelectedType('incident');
      } else if (data.media?.length > 0) {
        setSelectedResult(data.media[0]);
        setSelectedType('media');
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults({ error: err.message, incidents: [], media: [] });
    } finally {
      setLoading(false);
    }
  }, [apiBase, query, searchType]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-explorer-view">
      {/* Header */}
      <div className="search-explorer__header">
        <h1>Search Playground</h1>
      </div>

      {/* Search Input */}
      <div className="search-explorer__input-section">
        <div className="search-explorer__input-wrapper">
          <svg className="search-explorer__input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="search-explorer__input"
            placeholder="Enter your search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="search-explorer__search-btn"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Search Type Selector */}
        <div className="search-explorer__type-selector">
          {SEARCH_TYPES.map((type) => (
            <label key={type.id} className="search-explorer__type-option">
              <input
                type="radio"
                name="searchType"
                value={type.id}
                checked={searchType === type.id}
                onChange={(e) => setSearchType(e.target.value)}
              />
              <span className="search-explorer__type-label">
                <strong>{type.label}</strong>
                <small>{type.description}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Query Pipeline Visualization */}
      {results && (
        <div className="search-explorer__pipeline-section">
          <div className="search-explorer__pipeline-header">
            <span>Query Pipeline</span>
          </div>
          <div className="search-explorer__pipeline">
              <div className="pipeline-step">
                <div className="pipeline-step__icon">1</div>
                <div className="pipeline-step__content">
                  <div className="pipeline-step__title">Query Input</div>
                  <div className="pipeline-step__value">"{results.query}"</div>
                </div>
              </div>

              <div className="pipeline-arrow">→</div>

              <div className="pipeline-step">
                <div className="pipeline-step__icon">2</div>
                <div className="pipeline-step__content">
                  <div className="pipeline-step__title">Tokenize</div>
                  <div className="pipeline-step__value">
                    {results.tokenization?.map((t, i) => (
                      <span key={i} className="pipeline-token">{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pipeline-arrow">→</div>

              <div className="pipeline-step">
                <div className="pipeline-step__icon">3</div>
                <div className="pipeline-step__content">
                  <div className="pipeline-step__title">
                    {searchType === 'lexical' ? 'Match Terms' : 'Embed Vector'}
                  </div>
                  <div className="pipeline-step__value pipeline-step__value--small">
                    {searchType === 'lexical' ? (
                      <span>Fuzzy matching enabled</span>
                    ) : (
                      <span>
                        {Array.isArray(results.embedding)
                          ? `[${results.embedding.slice(0, 4).map(n => n.toFixed(2)).join(', ')}, ...]`
                          : results.embedding || '[embedding generated]'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pipeline-arrow">→</div>

              <div className="pipeline-step">
                <div className="pipeline-step__icon">4</div>
                <div className="pipeline-step__content">
                  <div className="pipeline-step__title">Search Index</div>
                  <div className="pipeline-step__value">
                    {searchType === 'lexical' && '$search'}
                    {searchType === 'vector' && '$vectorSearch'}
                    {searchType === 'hybrid' && '$search + $vectorSearch'}
                  </div>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Results Section - Side by Side */}
      {results && (
        <div className="search-explorer__results-section">
          {/* Incidents Column */}
          <div className="search-explorer__results-column">
            <div className="search-explorer__results-header">
              <svg className="search-explorer__results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              INCIDENTS ({results.incidents?.length || 0})
            </div>
            <div className="search-explorer__results-items">
              {results.incidents?.map((incident, idx) => (
                <div
                  key={incident._id || idx}
                  className={`search-result-item ${selectedResult?._id === incident._id && selectedType === 'incident' ? 'search-result-item--selected' : ''}`}
                  onClick={() => handleSelectIncident(incident)}
                >
                  <div className="search-result-item__body">
                    <div className="search-result-item__header">
                      <span className="search-result-item__title">
                        {incident.serviceIssue?.type || 'Unknown Type'}
                      </span>
                      <span className="search-result-item__score">
                        {(incident.scores?.hybrid || incident.scores?.vector || incident.scores?.lexical || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="search-result-item__narrative">
                      {incident.narrative?.substring(0, 80)}...
                    </div>
                    <div className="search-result-item__meta">
                      <span>{incident.city}, {incident.state}</span>
                      <span className={`search-result-item__category search-result-item__category--${incident.category}`}>{incident.category?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
              {results.incidents?.length === 0 && (
                <div className="search-explorer__no-results">
                  No incidents found
                </div>
              )}
            </div>
          </div>

          {/* Media Column */}
          <div className="search-explorer__results-column">
            <div className="search-explorer__results-header">
              <svg className="search-explorer__results-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              MEDIA ({results.media?.length || 0})
            </div>
            <div className="search-explorer__media-grid">
              {results.media?.map((media, idx) => (
                <div
                  key={media._id || idx}
                  className={`search-media-item ${selectedResult?._id === media._id && selectedType === 'media' ? 'search-media-item--selected' : ''}`}
                  onClick={() => handleSelectMedia(media)}
                >
                  <div className="search-media-item__image">
                    <img src={`${apiBase}${media.thumbnail}`} alt={media.caption} />
                  </div>
                  <div className="search-media-item__score">
                    {(media.scores?.hybrid || media.scores?.vector || media.scores?.lexical || 0).toFixed(2)}
                  </div>
                </div>
              ))}
              {results.media?.length === 0 && (
                <div className="search-explorer__no-results">
                  No media found
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="search-explorer__details-panel">
            {selectedResult ? (
              <>
                {/* Type indicator */}
                <div className="details-section details-section--type">
                  <span className={`details-type-badge details-type-badge--${selectedType}`}>
                    {selectedType === 'incident' ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        Incident
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        Media
                      </>
                    )}
                  </span>
                </div>

                {/* Media preview (if media selected) */}
                {selectedType === 'media' && selectedResult.thumbnail && (
                  <div className="details-section">
                    <div className="details-media-preview">
                      <img src={`${apiBase}${selectedResult.thumbnail}`} alt={selectedResult.caption} />
                    </div>
                    <p className="details-media-caption">{selectedResult.caption}</p>
                    <div className="details-media-filename">{selectedResult.filename}</div>
                  </div>
                )}

                {/* Incident info (if incident selected) */}
                {selectedType === 'incident' && (
                  <div className="details-section">
                    <h3>{selectedResult.serviceIssue?.type}</h3>
                    <p className="details-narrative">{selectedResult.narrative}</p>
                    <div className="details-location">{selectedResult.city}, {selectedResult.state}</div>
                  </div>
                )}

                {/* Score Breakdown */}
                <div className="details-section">
                  <h3>Score Breakdown</h3>
                  <div className="score-breakdown">
                    {selectedResult.scores?.lexical != null && (
                      <div className="score-row">
                        <span className="score-label">Lexical</span>
                        <div className="score-bar-wrapper">
                          <div
                            className="score-bar score-bar--lexical"
                            style={{ width: `${selectedResult.scores.lexical * 100}%` }}
                          />
                        </div>
                        <span className="score-value">{selectedResult.scores.lexical.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedResult.scores?.vector != null && (
                      <div className="score-row">
                        <span className="score-label">Vector</span>
                        <div className="score-bar-wrapper">
                          <div
                            className="score-bar score-bar--vector"
                            style={{ width: `${selectedResult.scores.vector * 100}%` }}
                          />
                        </div>
                        <span className="score-value">{selectedResult.scores.vector.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedResult.scores?.hybrid != null && (
                      <div className="score-row">
                        <span className="score-label">Hybrid (RRF)</span>
                        <div className="score-bar-wrapper">
                          <div
                            className="score-bar score-bar--hybrid"
                            style={{ width: `${selectedResult.scores.hybrid * 100}%` }}
                          />
                        </div>
                        <span className="score-value">{selectedResult.scores.hybrid.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Matched Terms */}
                <div className="details-section">
                  <h3>Matched Terms</h3>
                  <div className="matched-terms">
                    {selectedResult.matchedTerms?.map((term, i) => (
                      <span key={i} className="matched-term">{term}</span>
                    ))}
                    {(!selectedResult.matchedTerms || selectedResult.matchedTerms.length === 0) && (
                      <span className="no-matched-terms">Semantic match (no exact terms)</span>
                    )}
                  </div>
                </div>

                {/* Why This Matched (incidents only) */}
                {selectedType === 'incident' && selectedResult.matchReason && (
                  <div className="details-section">
                    <h3>Why This Matched</h3>
                    <p className="match-reason">{selectedResult.matchReason}</p>
                  </div>
                )}

                {/* Tags (media only) */}
                {selectedType === 'media' && selectedResult.tags && (
                  <div className="details-section">
                    <h3>Image Tags</h3>
                    <div className="matched-terms">
                      {selectedResult.tags.map((tag, i) => (
                        <span key={i} className="matched-term">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="details-placeholder">
                Select a result to see details
              </div>
            )}
          </div>
        </div>
      )}

      {/* Aggregation Pipeline Preview */}
      {results?.pipeline && (
        <div className="search-explorer__aggregation-section">
          <div
            className="search-explorer__aggregation-header"
            onClick={() => setShowAggregation(!showAggregation)}
          >
            <span>{showAggregation ? '▼' : '▶'} Aggregation Pipeline</span>
            <button
              className="search-explorer__copy-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(JSON.stringify(results.pipeline, null, 2));
              }}
            >
              Copy
            </button>
          </div>
          {showAggregation && (
            <pre
              className="search-explorer__aggregation-code"
              dangerouslySetInnerHTML={{ __html: highlightJson(results.pipeline) }}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="search-explorer__footer">
        <img src="/atlas-logo.svg" alt="MongoDB Atlas" />
      </div>
    </div>
  );
}
