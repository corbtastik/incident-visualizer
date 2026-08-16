/**
 * SeverityPills - P1/P2/P3/P4 toggle buttons
 *
 * Matches Screen 1 mockup: horizontal pill buttons
 * with outline style, filled when active.
 */

import React from 'react';

const SEVERITIES = [
  { id: 'p1', label: 'P1' },
  { id: 'p2', label: 'P2' },
  { id: 'p3', label: 'P3' },
  { id: 'p4', label: 'P4' },
];

export default function SeverityPills({ selected = [], onChange }) {
  const handleToggle = (sevId) => {
    const isSelected = selected.includes(sevId);
    if (isSelected) {
      onChange?.(selected.filter(s => s !== sevId));
    } else {
      onChange?.([...selected, sevId]);
    }
  };

  return (
    <div className="severity-pills">
      <div className="severity-pills__label">SEVERITY</div>
      <div className="severity-pills__list">
        {SEVERITIES.map((sev) => (
          <button
            key={sev.id}
            onClick={() => handleToggle(sev.id)}
            className={`severity-pills__pill ${
              selected.includes(sev.id) ? 'severity-pills__pill--active' : ''
            }`}
          >
            {sev.label}
          </button>
        ))}
      </div>
    </div>
  );
}
