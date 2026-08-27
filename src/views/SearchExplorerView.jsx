import React, { useState, useCallback } from 'react';

const SEARCH_TYPES = [
  { id: 'lexical', label: 'Lexical', description: 'Keyword matching' },
  { id: 'hybrid', label: 'Hybrid', description: 'Best of both' },
  { id: 'vector', label: 'Vector', description: 'Semantic search' },
];

export default function SearchExplorerView({ apiBase, isActive = true }) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('hybrid');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showPipeline, setShowPipeline] = useState(true);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSelectedResult(null);

    try {
      const response = await fetch(`${apiBase}/search/${searchType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 20 }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data);

      // Auto-select first result
      if (data.results?.length > 0) {
        setSelectedResult(data.results[0]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults({ error: err.message, results: [] });
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
        <button
          className="search-explorer__help-btn"
          title="How search works"
        >
          ?
        </button>
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
          <div
            className="search-explorer__pipeline-header"
            onClick={() => setShowPipeline(!showPipeline)}
          >
            <span>{showPipeline ? '▼' : '▶'} Query Pipeline</span>
          </div>
          {showPipeline && (
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
                      <span>[{results.embedding?.slice(0, 4).map(n => n.toFixed(2)).join(', ')}, ...]</span>
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
          )}
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="search-explorer__results-section">
          {/* Results List */}
          <div className="search-explorer__results-list">
            <div className="search-explorer__results-header">
              Results ({results.results?.length || 0})
            </div>
            <div className="search-explorer__results-items">
              {results.results?.map((result, idx) => (
                <div
                  key={result._id || idx}
                  className={`search-result-item ${selectedResult?._id === result._id ? 'search-result-item--selected' : ''}`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="search-result-item__header">
                    <span className="search-result-item__title">
                      {result.serviceIssue?.type || 'Unknown Type'}
                    </span>
                    <span className="search-result-item__score">
                      {(result.scores?.hybrid || result.scores?.vector || result.scores?.lexical || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="search-result-item__narrative">
                    {result.narrative?.substring(0, 100)}...
                  </div>
                  <div className="search-result-item__meta">
                    <span>{result.city}, {result.state}</span>
                    <span className="search-result-item__category">{result.category}</span>
                  </div>
                </div>
              ))}
              {results.results?.length === 0 && (
                <div className="search-explorer__no-results">
                  No results found
                </div>
              )}
            </div>
          </div>

          {/* Details Panel */}
          <div className="search-explorer__details-panel">
            {selectedResult ? (
              <>
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

                <div className="details-section">
                  <h3>Why This Matched</h3>
                  <p className="match-reason">{selectedResult.matchReason}</p>
                </div>

                {selectedResult.media && selectedResult.media.length > 0 && (
                  <div className="details-section">
                    <h3>Media Attachments</h3>
                    <div className="media-list">
                      {selectedResult.media.map((m, i) => (
                        <div key={i} className="media-item">
                          <span className="media-icon">📎</span>
                          <span>{m.filename}</span>
                        </div>
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
          <div className="search-explorer__aggregation-header">
            <span>Aggregation Pipeline</span>
            <button
              className="search-explorer__copy-btn"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(results.pipeline, null, 2))}
            >
              Copy
            </button>
          </div>
          <pre className="search-explorer__aggregation-code">
            {JSON.stringify(results.pipeline, null, 2)}
          </pre>
        </div>
      )}

      {/* Footer */}
      <div className="search-explorer__footer">
        <img src="/atlas-logo.svg" alt="MongoDB Atlas" />
      </div>
    </div>
  );
}
