import React from 'react';

export default function TooltipSatellite({ x, y, incident }) {
  if (!incident) return null;

  const {
    incidentId,
    city,
    lat,
    lng,
    serviceIssue = {},
    ts
  } = incident;

  // Only show for Emerging Tech / Satellite
  const isSatellite =
    serviceIssue?.category === 'emerging_tech' &&
    serviceIssue?.type === 'satellite';

  if (!isSatellite) return null;

  const fmt = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : v);

  return (
    <div className="incident-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="incident-tooltip__title">Satellite</div>
      <div>incidentId: {incidentId}</div>
      <div>city: {city}</div>
      <div>lat: {fmt(lat)}</div>
      <div>lng: {fmt(lng)}</div>
      {serviceIssue?.terminalId && <div>terminalId: {serviceIssue.terminalId}</div>}
      {serviceIssue?.issue && <div>issue: {serviceIssue.issue}</div>}
      {typeof serviceIssue?.snrDb !== 'undefined' && <div>snrDb: {serviceIssue.snrDb}</div>}
      <div>ts: {ts}</div>
    </div>
  );
}
