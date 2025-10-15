import { ScatterplotLayer } from "@deck.gl/layers";

// Exported so the Control Panel can use the same palette.
export const CAT_COLOR = {
  business:       [66, 153, 225, 200],  // blue
  consumer:       [16, 185, 129, 200],  // teal/green
  emerging_tech:  [168, 85, 247, 200],  // 🔄 purple (was yellow)
  federal:        [244, 114, 182, 200], // pink
  infrastructure: [250, 204, 21, 200],  // yellow
};

// Normalize both UI values and doc values
const slugify = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// REAL filter
function filterByTypes(data, typesSet) {
  if (!typesSet || typesSet.size === 0) return []; // show none until user selects
  const wanted = new Set([...typesSet].map(slugify));
  return (data || []).filter((d) => wanted.has(slugify(d?.serviceIssue?.type)));
}

/**
 * Build one ScatterplotLayer per category.
 * @param feeds { business, consumer, emerging_tech, federal, infrastructure }
 * @param opts { radius, types, categories }
 */
export function makeCategoryScatterLayers(feeds, { radius = 30, types, categories }) {
  return Object.entries(feeds).map(([key, data]) => {
    const filtered = filterByTypes(data, types);
    const visible = !!(categories?.[key]); // master category toggle

    return new ScatterplotLayer({
      id: `scatter-${key}`,
      data: filtered,
      visible,
      pickable: true,
      radiusMinPixels: radius,
      radiusMaxPixels: Math.max(radius * 2, 60),
      getPosition: (d) => [d.lng, d.lat],
      getFillColor: CAT_COLOR[key] || [200, 200, 200, 200],
      stroked: false,
      parameters: { depthTest: false },
      updateTriggers: { data: filtered, radius, visible },
    });
  });
}
