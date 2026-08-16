/**
 * ResultDonut - Dual-ring donut chart for result composition
 *
 * Matches Screen 1 mockup: outer ring shows corpus composition,
 * inner ring shows result composition by provenance.
 */

import React, { useMemo } from 'react';

const PROVENANCE_COLORS = {
  both: '#22D3EE',     // hybrid/anchor
  semantic: '#00ED64', // semantic only
  lexical: '#94A3B8',  // lexical only
};

export default function ResultDonut({
  total,
  bothCount,
  semanticOnlyCount,
  lexicalOnlyCount,
}) {
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages
  const segments = useMemo(() => {
    const totalResults = bothCount + semanticOnlyCount + lexicalOnlyCount;
    if (totalResults === 0) return [];

    const result = [];
    let offset = 0;

    if (bothCount > 0) {
      const pct = bothCount / totalResults;
      result.push({
        color: PROVENANCE_COLORS.both,
        dasharray: `${pct * circumference} ${circumference}`,
        offset: -offset * circumference,
        label: 'anchor',
        count: bothCount,
      });
      offset += pct;
    }

    if (semanticOnlyCount > 0) {
      const pct = semanticOnlyCount / totalResults;
      result.push({
        color: PROVENANCE_COLORS.semantic,
        dasharray: `${pct * circumference} ${circumference}`,
        offset: -offset * circumference,
        label: 'semantic only',
        count: semanticOnlyCount,
      });
      offset += pct;
    }

    if (lexicalOnlyCount > 0) {
      const pct = lexicalOnlyCount / totalResults;
      result.push({
        color: PROVENANCE_COLORS.lexical,
        dasharray: `${pct * circumference} ${circumference}`,
        offset: -offset * circumference,
        label: 'lexical only',
        count: lexicalOnlyCount,
      });
    }

    return result;
  }, [bothCount, semanticOnlyCount, lexicalOnlyCount, circumference]);

  return (
    <div className="result-donut">
      <div className="result-donut__chart">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />

          {/* Segment arcs */}
          {segments.map((seg, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          ))}
        </svg>

        {/* Center number */}
        <div className="result-donut__center">
          <div className="result-donut__total">{total}</div>
          <div className="result-donut__label">total</div>
        </div>
      </div>

      {/* Legend */}
      <div className="result-donut__legend">
        {segments.map((seg, idx) => (
          <div key={idx} className="result-donut__legend-item">
            <span
              className="result-donut__legend-dot"
              style={{ backgroundColor: seg.color }}
            />
            <span className="result-donut__legend-label">{seg.label}</span>
            <span className="result-donut__legend-count">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
