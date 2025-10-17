// src/components/TooltipIncident.jsx
import React from 'react';
import { TOOLTIP_CONFIG } from '../tooltipConfig';
import { CAT_COLOR } from '../layers'; // <-- import the palette

// Resolve deep keys like "serviceIssue.deviceId"
function get(obj, path) {
  return String(path).split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);
}
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const fmt = v => (isNum(v) ? (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2)) : v);

// Helpers for colors
function rgbaToCss(arr = []) {
  const [r = 0, g = 237, b = 100, a = 200] = arr;           // default to spec green if missing
  const alpha = (a > 1 ? a / 255 : a);                      // support 0-255 or 0-1
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// Simple YIQ contrast to decide dark vs light text
function contrastFor([r = 0, g = 0, b = 0]) {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#001E2B' : '#F8FAFC'; // dark text on light bg, light text on dark bg
}

export default function TooltipIncident({ x, y, incident }) {
  if (!incident) return null;

  const category = incident?.serviceIssue?.category;
  const type = incident?.serviceIssue?.type;
  if (!category || !type) return null;

  const key = `${category}/${type}`;
  const cfg = TOOLTIP_CONFIG[key];

  // Dynamic tooltip colors by category
  const rgba = CAT_COLOR[category] || undefined;
  const tipBg = rgbaToCss(rgba);
  const tipFg = contrastFor(rgba || [0, 237, 100]);

  // Subtle border derived from category color
  const tipBorder = rgba
    ? `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, 0.35)`
    : 'rgba(0,0,0,0.08)';

  // Fallback generic fields if not configured
  let title = cfg?.title || (type || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let fields = cfg?.fields;
  if (!fields) {
    const svc = incident?.serviceIssue || {};
    const extraKeys = Object.keys(svc)
      .filter(k => k !== 'category' && k !== 'type')
      .sort();
    fields = ['incidentId', 'city', 'lat', 'lng', ...extraKeys.map(k => `serviceIssue.${k}`), 'ts'];
  }

  return (
    <div
      className="incident-tooltip"
      style={{
        left: x + 16,
        top: y + 16,
        // set CSS variables for bg/fg/border
        '--tip-bg': tipBg,
        '--tip-fg': tipFg,
        '--tip-border': tipBorder
      }}
    >
      <div className="incident-tooltip__title">{title}</div>
      {fields.map((path, i) => {
        const label = path.split('.').slice(-1)[0];
        let value = get(incident, path);
        if (isNum(value)) value = fmt(value);
        return <div key={i}>{label}: {String(value ?? '—')}</div>;
      })}
    </div>
  );
}
