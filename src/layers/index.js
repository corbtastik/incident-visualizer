// src/layers/index.js
import { ScatterplotLayer } from "@deck.gl/layers";

// RGBA per category
const CAT_COLOR = {
  business: [66, 153, 225, 200],
  consumer: [16, 185, 129, 200],
  emerging_tech: [234, 179, 8, 200],
  federal: [244, 114, 182, 200],
  infrastructure: [250, 204, 21, 200],
};

// Normalize e.g. "WiFi Hotspot" -> "wifi-hotspot", "Edge" -> "edge"
function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// function filterByTypes(data, typesSet) {
//   if (!typesSet || typesSet.size === 0) return []; // keep UX: nothing selected -> show none
//   const wanted = new Set([...typesSet].map(slugify));
//   return data.filter(d => wanted.has(slugify(d?.serviceIssue?.type)));
// }

// TEMP BYPASS: render everything (ignore UI filters)
function filterByTypes(data /*, typesSet */) {
  return data || [];
}


/**
 * Build one ScatterplotLayer per category.
 */
export function makeCategoryScatterLayers(feeds, { radius = 30, types }) {
  return Object.entries(feeds).map(([key, data]) => {
    const filtered = filterByTypes(data, types);

    return new ScatterplotLayer({
      id: `scatter-${key}`,
      data: filtered,
      pickable: true,
      radiusMinPixels: radius,
      radiusMaxPixels: Math.max(radius * 2, 60),
      getPosition: d => [d.lng, d.lat],
      getFillColor: CAT_COLOR[key] || [200, 200, 200, 200],
      getLineColor: [0, 0, 0, 120],
      getLineWidth: 0,
      stroked: false,
      visible: true,
      updateTriggers: {
        data: filtered,
        color: CAT_COLOR[key],
        radius
      },
      parameters: { depthTest: false }
    });
  });
}
