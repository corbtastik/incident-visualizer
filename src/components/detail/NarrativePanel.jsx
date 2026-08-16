/**
 * NarrativePanel - Incident narrative with highlight attribution
 *
 * Displays narrative text with proper highlight spans:
 * - Green filled box → Atlas Search highlight (lexical)
 * - Cyan dashed underline → rerank-2.5 top chunk
 *
 * NEVER attribute spans to vector pipeline.
 */

import React from 'react';

export default function NarrativePanel({
  narrative,
  query,
  lexicalHighlights = [],
  rerankHighlights = [],
}) {
  // Parse narrative and apply highlights
  // For now, show raw narrative with legend

  return (
    <div className="narrative-panel">
      <div className="narrative-panel__title">Narrative</div>

      <div className="narrative-panel__content">
        <p className="narrative-panel__text">{narrative}</p>
      </div>

      {/* Highlight Legend */}
      <div className="narrative-panel__legend">
        <div className="narrative-panel__legend-item">
          <span className="narrative-panel__highlight narrative-panel__highlight--lexical">
            matched against:
          </span>
          <span className="narrative-panel__query">"{query}"</span>
        </div>
      </div>

      {/* Attribution */}
      <div className="narrative-panel__attribution">
        <div className="narrative-panel__attr-item">
          <span className="narrative-panel__attr-box narrative-panel__attr-box--lexical" />
          <span>Atlas Search highlight (lexical)</span>
        </div>
        <div className="narrative-panel__attr-item">
          <span className="narrative-panel__attr-box narrative-panel__attr-box--rerank" />
          <span>rerank-2.5 top chunk</span>
        </div>
      </div>
    </div>
  );
}
