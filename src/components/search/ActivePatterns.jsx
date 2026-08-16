/**
 * ActivePatterns - Pattern indicator lights
 *
 * Matches Screen 1 mockup: list of AI patterns with
 * indicator dots that light up when active.
 */

import React from 'react';

const PATTERNS = [
  { id: 'hs', code: '5A', label: 'Hybrid Search' },
  { id: 'vs', code: '6T', label: 'Vector Similarity' },
  { id: 'mf', code: '6T', label: 'Metadata-Filtered Retrieval' },
  { id: 'si', code: '1T', label: 'Streaming Ingestion' },
  { id: 'ir', code: '1T', label: 'Incremental Re-embedding' },
  { id: 'ce', code: '2E', label: 'CDC + Embedding Pipeline' },
];

export default function ActivePatterns({ active = [] }) {
  return (
    <div className="active-patterns">
      <div className="active-patterns__label">ACTIVE PATTERNS</div>
      <div className="active-patterns__list">
        {PATTERNS.map((pattern) => {
          const isActive = active.includes(pattern.id);
          return (
            <div
              key={pattern.id}
              className={`active-patterns__item ${
                isActive ? 'active-patterns__item--active' : ''
              }`}
            >
              <span className="active-patterns__dot" />
              <span className="active-patterns__code">{pattern.code}</span>
              <span className="active-patterns__name">{pattern.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
