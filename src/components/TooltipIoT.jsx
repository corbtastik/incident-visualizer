import React from 'react';

export default function TooltipIoT({ x, y, incident }) {
  if (!incident) return null;

  const { incidentId, city, lat, lng, serviceIssue = {}, ts } = incident;

  const isIoT =
    serviceIssue?.category === 'emerging_tech' &&
    serviceIssue?.type === 'iot';
  if (!isIoT) return null;

  const fmt = (v, n = 2) => (typeof v === 'number' ? v.toFixed(n) : v);

  return (
    <div className="incident-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <div className="incident-tooltip__title">IoT</div>
      <div>incidentId: {incidentId}</div>
      <div>city: {city}</div>
      <div>lat: {fmt(lat)}</div>
      <div>lng: {fmt(lng)}</div>
      {serviceIssue?.deviceId && <div>deviceId: {serviceIssue.deviceId}</div>}
      {serviceIssue?.issue && <div>issue: {serviceIssue.issue}</div>}
      {serviceIssue?.fleet && <div>fleet: {serviceIssue.fleet}</div>}
      {serviceIssue?.region && <div>region: {serviceIssue.region}</div>}
      <div>ts: {ts}</div>
    </div>
  );
}
