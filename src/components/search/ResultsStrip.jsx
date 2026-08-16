/**
 * ResultsStrip - Horizontal scrollable result cards
 *
 * Matches Screen 1 mockup: horizontal strip at bottom
 * with ranked result cards, #1 having cyan border.
 */

import React from 'react';
import { CATEGORY_COLORS } from '../../utils/colors';

export default function ResultsStrip({
  results = [],
  scores = {},
  onResultClick,
  selectedId
}) {
  if (results.length === 0) {
    return null;
  }

  return (
    <div className="results-strip">
      <div className="results-strip__scroll">
        {results.map((result, idx) => {
          const score = scores[result._id] || 0;
          const isTop = idx === 0;
          const isSelected = result._id === selectedId;
          const category = result.serviceIssue?.category;

          return (
            <div
              key={result._id}
              onClick={() => onResultClick?.(result)}
              className={`results-strip__card ${
                isTop ? 'results-strip__card--top' : ''
              } ${isSelected ? 'results-strip__card--selected' : ''}`}
            >
              {/* Rank and category dot */}
              <div className="results-strip__card-header">
                <span className="results-strip__rank">#{idx + 1}</span>
                <span
                  className="results-strip__dot"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                />
                <span className="results-strip__score">{score.toFixed(3)}</span>
              </div>

              {/* Ticket ref */}
              <div className="results-strip__ticket">
                {result.serviceIssue?.ticketRef}
              </div>

              {/* Type */}
              <div className="results-strip__type">
                {result.serviceIssue?.type}
              </div>

              {/* City */}
              <div className="results-strip__city">
                {result.city}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
