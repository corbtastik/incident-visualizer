/**
 * SystemicAlert - Systemic event detection card
 *
 * Matches Screen 1 mockup: pink/red accent with pulsing dot
 * showing cluster detection summary.
 */

import React from 'react';

export default function SystemicAlert({
  clusterId,
  location,
  incidentCount,
  typeCount,
  categoryCount,
  maxDistance,
  onClick,
}) {
  return (
    <div className="systemic-alert">
      <div className="systemic-alert__header">
        <span className="systemic-alert__dot" />
        <span className="systemic-alert__title">Systemic Event Detected</span>
      </div>

      <div className="systemic-alert__stats">
        <div className="systemic-alert__stat">
          <span className="systemic-alert__stat-label">incidents</span>
          <span className="systemic-alert__stat-value">{incidentCount}</span>
        </div>
        <div className="systemic-alert__stat">
          <span className="systemic-alert__stat-label">types</span>
          <span className="systemic-alert__stat-value">{typeCount}</span>
        </div>
        <div className="systemic-alert__stat">
          <span className="systemic-alert__stat-label">categories</span>
          <span className="systemic-alert__stat-value">{categoryCount}</span>
        </div>
        <div className="systemic-alert__stat">
          <span className="systemic-alert__stat-label">max pairwise</span>
          <span className="systemic-alert__stat-value">{maxDistance}</span>
        </div>
      </div>

      <div className="systemic-alert__location">{location}</div>

      <button
        onClick={onClick}
        className="systemic-alert__link"
      >
        View cluster →
      </button>
    </div>
  );
}
