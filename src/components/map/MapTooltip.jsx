/**
 * MapTooltip - Hover tooltip for map incidents
 *
 * Shows incident details when hovering over map pins.
 */

import React from 'react';
import { getCategoryColor } from '../../utils/colors';

export default function MapTooltip({
  x,
  y,
  incident,
  provenance,
}) {
  if (!incident) return null;

  const category = incident.serviceIssue?.category;
  const ticketRef = incident.serviceIssue?.ticketRef || incident._id;
  const type = incident.serviceIssue?.type;
  const city = incident.city;

  return (
    <div
      className="map-tooltip"
      style={{ left: x + 16, top: y + 16 }}
    >
      {/* Category dot and ticket */}
      <div className="map-tooltip__header">
        <span
          className="map-tooltip__dot"
          style={{ backgroundColor: getCategoryColor(category) }}
        />
        <span className="map-tooltip__ticket">{ticketRef}</span>
      </div>

      {/* City */}
      <div className="map-tooltip__city">{city}</div>

      {/* Type and category */}
      <div className="map-tooltip__meta">
        {type} · {category?.replace('_', ' ')}
      </div>

      {/* Provenance indicator */}
      {provenance && (
        <div className={`map-tooltip__provenance map-tooltip__provenance--${provenance}`}>
          {provenance === 'both' && 'anchor (lexical + semantic)'}
          {provenance === 'lexical' && 'lexical only'}
          {provenance === 'semantic' && 'semantic only'}
        </div>
      )}
    </div>
  );
}
