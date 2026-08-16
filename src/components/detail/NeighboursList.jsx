/**
 * NeighboursList - Nearest neighbours or cluster members list
 *
 * Displays similar incidents with similarity scores.
 * Shows SEED badge for cluster seed incidents.
 */

import React from 'react';
import { getCategoryColor } from '../../utils/colors';
import { formatScore } from '../../utils/formatters';

export default function NeighboursList({
  title,
  subtitle,
  items = [],
  incidents = [],
  isClusterView = false,
  onItemClick,
}) {
  // Find incident by ticketRef
  const findIncident = (ticketRef) => {
    return incidents.find(i => i.serviceIssue?.ticketRef === ticketRef);
  };

  return (
    <div className="neighbours-list">
      {/* Header */}
      <div className="neighbours-list__header">
        <div className="neighbours-list__title">
          {title} · {items.length}
        </div>
        {subtitle && (
          <div className="neighbours-list__subtitle">{subtitle}</div>
        )}
      </div>

      {/* Items */}
      <div className="neighbours-list__items">
        {items.map((item) => {
          const id = item.incidentId || item._id;
          const inc = findIncident(id);
          const category = inc?.serviceIssue?.category;
          const type = item.type || inc?.serviceIssue?.type;
          const city = item.city || inc?.city;
          const similarity = item.similarity;
          const isSeed = item.isSeed;

          return (
            <div
              key={id}
              className="neighbours-list__item"
              onClick={() => onItemClick?.(id)}
            >
              <span
                className="neighbours-list__dot"
                style={{ backgroundColor: getCategoryColor(category) }}
              />
              <div className="neighbours-list__content">
                <div className="neighbours-list__id">{id}</div>
                <div className="neighbours-list__meta">
                  {type}{city ? ` · ${city}` : ''}
                </div>
              </div>
              {isSeed ? (
                <span className="neighbours-list__seed">SEED</span>
              ) : (
                <span className="neighbours-list__score">
                  {formatScore(similarity)}
                </span>
              )}
              <span className="neighbours-list__arrow">→</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
