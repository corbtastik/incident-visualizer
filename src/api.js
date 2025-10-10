const API = import.meta.env.VITE_INCIDENTS_URL;

export async function fetchIncidents({ types = [], windowSec = 60, limit = 200000 } = {}) {
  const qs = new URLSearchParams();
  if (types.length) qs.set('types', types.join(','));
  qs.set('windowSec', String(windowSec));
  qs.set('limit', String(limit));
  const res = await fetch(`${API}?${qs.toString()}`);
  if (!res.ok) throw new Error(`Fetch ${res.status}`);
  return res.json();
}

export function mockIncidents(n = 50000) {
  const types = ['wireless','fiber','enterprise','broadband','wifi-hotspot','iot','satellite','smart-city','public-safety','backhaul','edge','datacenter','cloud-network'];
  return Array.from({ length: n }, () => {
    const t = types[Math.floor(Math.random()*types.length)];
    return { ts: Date.now(), lat: 25 + Math.random()*20, lng: -125 + Math.random()*58, weight: Math.random()*2 + 0.5, serviceIssue: { type: t, issue: 'slow-speeds' } };
  });
}
