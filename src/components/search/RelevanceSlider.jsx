/**
 * RelevanceSlider - Exact ↔ Conceptual blend control
 *
 * Matches Screen 1 mockup: slider with "Exact" and "Conceptual" labels,
 * showing current lexical/semantic weights.
 */

import React from 'react';

export default function RelevanceSlider({ value, onChange }) {
  const lexicalWeight = (1 - value).toFixed(2);
  const semanticWeight = value.toFixed(2);

  return (
    <div className="relevance-slider">
      <div className="relevance-slider__header">
        <span className="relevance-slider__label">RELEVANCE BLEND</span>
      </div>

      <div className="relevance-slider__scale">
        <span className="relevance-slider__endpoint">Exact</span>
        <span className="relevance-slider__weights">
          lexical {lexicalWeight} · semantic {semanticWeight}
        </span>
        <span className="relevance-slider__endpoint">Conceptual</span>
      </div>

      <div className="relevance-slider__track-wrapper">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value))}
          className="relevance-slider__input"
        />
        <div className="relevance-slider__track">
          <div
            className="relevance-slider__fill"
            style={{ width: `${value * 100}%` }}
          />
        </div>
      </div>

      <div className="relevance-slider__note">
        — makes RRF physically manipulable.
      </div>
    </div>
  );
}
