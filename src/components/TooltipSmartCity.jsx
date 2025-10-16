import React from 'react';

export default function TooltipSmartCity({ x, y, incident }) {
  if (!incident) return null;

  const { incidentId, city, lat, lng, serviceIssue = {}, ts } = incident;

  const isSmartCity =
    serviceIssue?.category === 'emerging_tech' &&
    serviceIssue?.type === 'smart-city';
  if (!isSmartCity) return null;

  const fmt = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : v);

  return (
    <div className="incident-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="incident-tooltip__title">Smart City</div>
      <div>incidentId: {incidentId}</div>
      <div>city: {city}</div>
      <div>lat: {fmt(lat)}</div>
      <div>lng: {fmt(lng)}</div>
      {serviceIssue?.sensorId && <div>sensorId: {serviceIssue.sensorId}</div>}
      {serviceIssue?.issue && <div>issue: {serviceIssue.issue}</div>}
      {serviceIssue?.location && <div>location: {serviceIssue.location}</div>}
      <div>ts: {ts}</div>
    </div>
  );
}
