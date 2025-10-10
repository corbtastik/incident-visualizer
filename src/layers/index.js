import { ScatterplotLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { colorForType, colorRangeForRamp } from '../utils/colors.js';

export function makeHeatmap(data, radius = 30, colorRamp = 'cool') {
  return new HeatmapLayer({
    id: 'incidents-heat',
    data,
    getPosition: d => [d.lng, d.lat],
    getWeight: d => d.weight || 1,
    radiusPixels: radius,
    aggregation: 'SUM',
    colorRange: colorRangeForRamp(colorRamp)
  });
}

export function makeScatter(data, radius = 3, colorRamp = 'cool') {
  return new ScatterplotLayer({
    id: 'incidents-scatter',
    data,
    getPosition: d => [d.lng, d.lat],
    getRadius: () => radius,
    getFillColor: d => colorForType(d.serviceIssue?.type || 'other', colorRamp),
    pickable: true
  });
}
