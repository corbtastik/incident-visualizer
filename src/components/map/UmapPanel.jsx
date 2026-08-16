/**
 * UmapPanel - Semantic space UMAP projection
 *
 * Displays precomputed UMAP coordinates as a scatter plot
 * showing semantic relationships between incidents.
 */

import React, { useMemo } from 'react';
import { getCategoryColor } from '../../utils/colors';

export default function UmapPanel({
  incidents = [],
  umapCoords = {},
  selectedId,
  onIncidentClick,
  caption = 'Scattered across 5 states geographically. One cluster semantically.',
}) {
  // Calculate bounds and scale
  const { points, bounds } = useMemo(() => {
    const pts = incidents
      .filter(inc => umapCoords[inc._id])
      .map(inc => {
        const coords = umapCoords[inc._id];
        // Handle both array format [x, y] and object format { x, y }
        const x = Array.isArray(coords) ? coords[0] : coords.x;
        const y = Array.isArray(coords) ? coords[1] : coords.y;
        return {
          id: inc._id,
          x,
          y,
          category: inc.serviceIssue?.category,
          ticketRef: inc.serviceIssue?.ticketRef,
        };
      });

    if (pts.length === 0) {
      return { points: [], bounds: { minX: 0, maxX: 1, minY: 0, maxY: 1 } };
    }

    const xs = pts.map(p => p.x);
    const ys = pts.map(p => p.y);

    return {
      points: pts,
      bounds: {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      },
    };
  }, [incidents, umapCoords]);

  // Scale point to SVG coordinates
  const scalePoint = (x, y) => {
    const padding = 20;
    const width = 100 - padding * 2;
    const height = 100 - padding * 2;

    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;

    return {
      cx: padding + ((x - bounds.minX) / rangeX) * width,
      cy: padding + ((y - bounds.minY) / rangeY) * height,
    };
  };

  return (
    <div className="umap-panel">
      <div className="umap-panel__header">
        <span className="umap-panel__title">Semantic Space</span>
        <span className="umap-panel__subtitle">UMAP Projection</span>
      </div>

      <div className="umap-panel__canvas">
        {points.length > 0 ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="0.2"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" opacity="0.5" />

            {/* Points */}
            {points.map(point => {
              const { cx, cy } = scalePoint(point.x, point.y);
              const isSelected = point.id === selectedId;
              const color = getCategoryColor(point.category);

              return (
                <circle
                  key={point.id}
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 4 : 2.5}
                  fill={color}
                  opacity={isSelected ? 1 : 0.7}
                  stroke={isSelected ? '#fff' : 'none'}
                  strokeWidth={isSelected ? 1 : 0}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onIncidentClick?.(point.id)}
                >
                  <title>{point.ticketRef}</title>
                </circle>
              );
            })}
          </svg>
        ) : (
          <div className="umap-panel__empty">
            No UMAP data available
          </div>
        )}
      </div>

      <div className="umap-panel__caption">{caption}</div>
    </div>
  );
}
