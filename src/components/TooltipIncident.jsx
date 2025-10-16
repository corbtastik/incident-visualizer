import React from 'react';
import { TOOLTIP_CONFIG } from '../tooltipConfig';

// Resolve deep keys like "serviceIssue.deviceId"
function get(obj, path) {
  return String(path).split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const fmt = v => (isNum(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : v);

export default function TooltipIncident({ x, y, incident }) {
  if (!incident) return null;

  const category = incident?.serviceIssue?.category;
  const type = incident?.serviceIssue?.type;
  if (!category || !type) return null;

  const key = `${category}/${type}`;
  const cfg = TOOLTIP_CONFIG[key];

  // If no explicit config yet, fall back to a generic list:
  // incidentId, city, lat, lng, all serviceIssue props (except category/type), ts
  let title = cfg?.title || (type || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let fields = cfg?.fields;
  if (!fields) {
    const svc = incident?.serviceIssue || {};
    const extraKeys = Object.keys(svc)
      .filter(k => k !== 'category' && k !== 'type')
      .sort(); // deterministic
    fields = ['incidentId', 'city', 'lat', 'lng', ...extraKeys.map(k => `serviceIssue.${k}`), 'ts'];
  }

  return (
    <div className="incident-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="incident-tooltip__title">{title}</div>
      {fields.map((path, i) => {
        const label = path.split('.').slice(-1)[0]; // last segment as label
        let value = get(incident, path);
        if (isNum(value)) value = fmt(value);
        return <div key={i}>{label}: {value}</div>;
      })}
    </div>
  );
}
