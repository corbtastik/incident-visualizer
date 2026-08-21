import { ScatterplotLayer } from "@deck.gl/layers";

// Exported so the Control Panel can use the same palette.
export const CAT_COLOR = {
  business:       [66, 153, 225, 200],  // blue
  consumer:       [16, 185, 129, 200],  // teal/green
  emerging_tech:  [168, 85, 247, 200],  // purple
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

// Helper to stringify MongoDB ObjectId-ish
function idOf(d) {
  if (!d) return null;
  const v = d._id;
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && typeof v.$oid === "string") return v.$oid;
  try { return String(v); } catch { return null; }
}

/**
 * Build one ScatterplotLayer per category.
 * @param feeds  { business, consumer, emerging_tech, federal, infrastructure }
 * @param opts   { radiusPx, types, categories, nowTick?, demoMetaByCat? }
 *
 * demoMetaByCat:
 *   { [cat]: { enabled: boolean, createdAtRef?: Ref<Map>, expiryAtRef?: Ref<Map> } }
 */
export function makeCategoryScatterLayers(
  feeds,
  { radiusPx = 2, types, categories, nowTick = 0, demoMetaByCat = {} }
) {
  return Object.entries(feeds).map(([key, data]) => {
    const filtered = filterByTypes(data, types);
    const visible = !!(categories?.[key]); // master category toggle

    const baseColor = CAT_COLOR[key] || [200, 200, 200, 200];
    const meta = demoMetaByCat[key] || { enabled: false };
    const demoEnabled = !!meta.enabled;

    const getFillColor = demoEnabled
      ? (d) => {
          // Blink only in the final 25% of lifespan
          const id = idOf(d);
          const createdAt = meta.createdAtRef?.current.get(id);
          const expiryAt  = meta.expiryAtRef?.current.get(id);
          if (!createdAt || !expiryAt) return baseColor;

          const span = Math.max(1, expiryAt - createdAt);
          const p = Math.min(1, Math.max(0, (nowTick - createdAt) / span));
          if (p < 0.75) return baseColor;

          // Two-phase blink: 2 Hz then 6 Hz near the end
          const rateHz = p < 0.95 ? 2 : 6;
          const t = nowTick / 1000;
          const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * rateHz * t); // 0..1

          const a = Math.max(0, Math.min(255, Math.round(baseColor[3] * (0.5 + 0.5 * pulse))));
          return [baseColor[0], baseColor[1], baseColor[2], a];
        }
      : baseColor;

    const getRadius = demoEnabled
      ? (d) => {
        const id = idOf(d);
        const createdAt = meta.createdAtRef?.current.get(id);
        const expiryAt  = meta.expiryAtRef?.current.get(id);
        if (!createdAt || !expiryAt) return radiusPx;

        const span = Math.max(1, expiryAt - createdAt);
        const p = Math.min(1, Math.max(0, (nowTick - createdAt) / span));
        if (p < 0.75) return radiusPx;

        const rateHz = p < 0.95 ? 2 : 6;
        const t = nowTick / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * rateHz * t); // 0..1
        const grow = 1 + 0.20 * pulse; // up to +20% growth
        return radiusPx * grow;
      }
      : () => radiusPx;

    return new ScatterplotLayer({
      id: `scatter-${key}`,
      data: filtered,
      visible,
      pickable: true,

      radiusUnits: "pixels",
      getRadius,
      radiusMinPixels: 1,
      radiusMaxPixels: Math.max(radiusPx * 2, 6),

      getPosition: (d) => [d.lng, d.lat],
      getFillColor,

      stroked: false,
      parameters: { depthTest: false },

      updateTriggers: {
        data: filtered,
        visible,
        radiusPx,
        nowTick,
        demoFlag: demoEnabled
      },
    });
  });
}

/**
 * Build layers for search result pins.
 * Creates a "target" visual: outer pulsing ring + center dot.
 * @param results  Array of search results with lat, lng, serviceIssue.category
 * @param opts     { nowTick }
 * @returns Array of layers (ring layer + dot layer)
 */
export function makeSearchResultLayers(results, { nowTick = 0 } = {}) {
  if (!results || results.length === 0) return [];

  // Pulse animation: gentle breathing effect (0.8 Hz)
  const t = nowTick / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.8 * t);

  // Outer ring layer - stroked, pulsing size
  const ringLayer = new ScatterplotLayer({
    id: "search-pins-ring",
    data: results,
    pickable: true,

    radiusUnits: "pixels",
    getRadius: () => 12 + 4 * pulse, // 12-16px pulsing
    radiusMinPixels: 10,
    radiusMaxPixels: 20,

    getPosition: (d) => [d.lng, d.lat],

    filled: false,
    stroked: true,
    lineWidthUnits: "pixels",
    getLineWidth: 2.5,
    getLineColor: (d) => {
      const cat = d?.serviceIssue?.category;
      const base = CAT_COLOR[cat] || [200, 200, 200, 200];
      return [base[0], base[1], base[2], 255]; // full opacity for ring
    },

    parameters: { depthTest: false },

    updateTriggers: {
      getRadius: nowTick,
    },
  });

  // Center dot layer - filled, static
  const dotLayer = new ScatterplotLayer({
    id: "search-pins-dot",
    data: results,
    pickable: true,

    radiusUnits: "pixels",
    getRadius: 4,
    radiusMinPixels: 3,
    radiusMaxPixels: 6,

    getPosition: (d) => [d.lng, d.lat],

    filled: true,
    stroked: false,
    getFillColor: (d) => {
      const cat = d?.serviceIssue?.category;
      const base = CAT_COLOR[cat] || [200, 200, 200, 200];
      return [base[0], base[1], base[2], 255];
    },

    parameters: { depthTest: false },
  });

  return [ringLayer, dotLayer];
}
