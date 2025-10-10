import { describe, it, expect } from 'vitest';
import { makeHeatmap, makeScatter } from '../layers/index.js';
import { colorForType, colorRangeForRamp, COLOR_RAMPS } from '../utils/colors.js';

describe('layers + color ramps', () => {
  it('colorForType returns RGB array for each ramp', () => {
    ['cool','warm','inferno'].forEach(r => {
      const c = colorForType('wireless', r);
      expect(Array.isArray(c)).toBe(true);
      expect(c.length).toBe(3);
    });
  });
  it('colorRangeForRamp returns an array of stops', () => {
    const range = colorRangeForRamp('warm');
    expect(Array.isArray(range)).toBe(true);
    expect(range.length).toBeGreaterThan(3);
  });
  it('makeHeatmap accepts color ramp', () => {
    const layer = makeHeatmap([{ lat: 1, lng: 2, weight: 1 }], 10, 'inferno');
    expect(layer.id).toBe('incidents-heat');
  });
  it('makeScatter accepts color ramp', () => {
    const layer = makeScatter([{ lat: 1, lng: 2, serviceIssue: { type: 'wireless' } }], 3, 'warm');
    expect(layer.id).toBe('incidents-scatter');
  });
  it('ramps are defined with RGB triplets', () => {
    Object.values(COLOR_RAMPS).forEach(stops => {
      stops.forEach(rgb => { expect(rgb.length).toBe(3); });
    });
  });
});
