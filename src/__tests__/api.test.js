import { describe, it, expect } from 'vitest';
import { mockIncidents } from '../api.js';
import { countsByType } from '../utils/stats.js';

describe('api + stats', () => {
  it('mockIncidents returns the requested number with lat/lng', () => {
    const pts = mockIncidents(5);
    expect(pts).toHaveLength(5);
    expect(typeof pts[0].lat).toBe('number');
    expect(typeof pts[0].lng).toBe('number');
    expect(pts[0]).toHaveProperty('serviceIssue.type');
  });

  it('countsByType tallies only allowed types', () => {
    const pts = [
      { serviceIssue: { type: 'wireless' } },
      { serviceIssue: { type: 'fiber' } },
      { serviceIssue: { type: 'wireless' } },
      { serviceIssue: { type: 'iot' } }
    ];
    const allowed = new Set(['wireless','iot']);
    const out = countsByType(pts, allowed);
    expect(out.wireless).toBe(2);
    expect(out.iot).toBe(1);
    expect(out.fiber).toBeUndefined();
  });
});
