/**
 * Color System for incident-visualizer v2
 *
 * CRITICAL: All infrastructure types (backhaul, smartcell, datacenter, edge,
 * construction, cloud-network) MUST render amber (#FBBF24).
 */

// Category colors - use these for dots, pins, chart segments
// NOTE: business, consumer, emerging_tech updated to avoid cyan collision
export const CATEGORY_COLORS = {
  business:       '#818CF8',  // was #4F8FFF
  consumer:       '#4ADE80',  // was #00ED64
  emerging_tech:  '#C084FC',  // was #A78BFA
  federal:        '#F472B6',
  infrastructure: '#FBBF24',
};

// Category colors as RGBA arrays (for deck.gl)
export const CATEGORY_COLORS_RGBA = {
  business:       [129, 140, 248, 200],  // #818CF8
  consumer:       [74, 222, 128, 200],   // #4ADE80
  emerging_tech:  [192, 132, 252, 200],  // #C084FC
  federal:        [244, 114, 182, 200],
  infrastructure: [251, 191, 36, 200],
};

// Search mode colors - unified cyan ramp for search UI chrome
// Used for: mode buttons, pane headers, counts, HUD strip, focus states
export const MODE_COLOR = {
  lexical:  '#0E9BC4',
  semantic: '#22D3EE',
  hybrid:   '#A5F3FC',
};

// Provenance colors - per-result retrieval state (DIFFERENT from search mode)
// Used for: result card dots, map pin rings, donut segments, overlap bar
export const PROVENANCE_COLOR = {
  lexicalOnly:   '#0300AB',  // deep blue
  semanticOnly:  '#22D3EE',  // cyan (unchanged)
  bothPipelines: '#FFFFFF',  // white - categorical break, strongest state
};

// Provenance colors as RGBA arrays (for deck.gl)
export const PROVENANCE_COLOR_RGBA = {
  lexicalOnly:   [3, 0, 171, 255],     // #0300AB
  semanticOnly:  [34, 211, 238, 255],  // #22D3EE
  bothPipelines: [255, 255, 255, 255], // #FFFFFF
};

// Legacy STATE_COLORS - kept for backwards compatibility, maps to PROVENANCE_COLOR
export const STATE_COLORS = {
  lexical:  PROVENANCE_COLOR.lexicalOnly,
  semantic: PROVENANCE_COLOR.semanticOnly,
  hybrid:   PROVENANCE_COLOR.bothPipelines,
  novel:    '#FF6B4A',
  systemic: '#FF3B6B',
};

// Legacy STATE_COLORS_RGBA
export const STATE_COLORS_RGBA = {
  lexical:  [3, 0, 171, 200],      // #0300AB
  semantic: [34, 211, 238, 200],   // #22D3EE
  hybrid:   [255, 255, 255, 200],  // #FFFFFF
  novel:    [255, 107, 74, 200],
  systemic: [255, 59, 107, 200],
};

// Pin geometry based on provenance
export const PIN = {
  notMatched:    { r: 7,  fillOpacity: 0.25, rings: [] },
  lexicalOnly:   { r: 11, fillOpacity: 1,    rings: [] },
  semanticOnly:  { r: 11, fillOpacity: 1,    rings: [{ r: 16, w: 7, color: PROVENANCE_COLOR.semanticOnly }] },
  bothPipelines: { r: 11, fillOpacity: 1,    rings: [{ r: 16, w: 7, color: PROVENANCE_COLOR.semanticOnly },
                                                     { r: 25, w: 5, color: PROVENANCE_COLOR.bothPipelines }] },
};

// Helper to get pin config from provenance
export function getPinConfig(provenance) {
  const map = {
    'both': 'bothPipelines',
    'semantic': 'semanticOnly',
    'lexical': 'lexicalOnly',
  };
  return PIN[map[provenance]] || PIN.notMatched;
}

// Service type to category mapping - CRITICAL for correct colors
export const TYPE_TO_CATEGORY = {
  // Business
  'b2b':         'business',
  'enterprise':  'business',
  'voip':        'business',
  // Consumer
  '5g':          'consumer',
  'broadband':   'consumer',
  'fiber':       'consumer',
  'wifi-hotspot':'consumer',
  'wireless':    'consumer',
  // Emerging Tech
  'iot':         'emerging_tech',
  'satellite':   'emerging_tech',
  'smart-city':  'emerging_tech',
  // Federal
  'firstnet':    'federal',
  'government':  'federal',
  'public-safety':'federal',
  // Infrastructure - ALL must be amber
  'backhaul':     'infrastructure',
  'cloud-network':'infrastructure',
  'construction': 'infrastructure',
  'datacenter':   'infrastructure',
  'edge':         'infrastructure',
  'smartcell':    'infrastructure',
};

/**
 * Get the category color for a document/incident or category string
 * @param {Object|string} docOrCategory - Document with serviceIssue.category OR category string
 * @returns {string} Hex color
 */
export function getCategoryColor(docOrCategory) {
  // Handle string category directly
  if (typeof docOrCategory === 'string') {
    return CATEGORY_COLORS[docOrCategory] || '#5A6672';
  }
  // Handle document object
  const category = docOrCategory?.serviceIssue?.category;
  return CATEGORY_COLORS[category] || '#5A6672';
}

/**
 * Get the category color as RGBA array for deck.gl
 * @param {Object} doc - Document with serviceIssue.category
 * @returns {number[]} RGBA array
 */
export function getCategoryColorRGBA(doc) {
  const category = doc?.serviceIssue?.category;
  return CATEGORY_COLORS_RGBA[category] || [90, 102, 114, 200];
}

/**
 * Get the retrieval provenance color
 * @param {'lexical'|'semantic'|'hybrid'|'novel'|'systemic'} provenance
 * @returns {string} Hex color
 */
export function getProvenanceColor(provenance) {
  return STATE_COLORS[provenance] || STATE_COLORS.lexical;
}

/**
 * Get the retrieval provenance color as RGBA for deck.gl
 * @param {'lexical'|'semantic'|'hybrid'|'novel'|'systemic'} provenance
 * @returns {number[]} RGBA array
 */
export function getProvenanceColorRGBA(provenance) {
  return STATE_COLORS_RGBA[provenance] || STATE_COLORS_RGBA.lexical;
}

/**
 * Get category from service type
 * @param {string} type - Service type (e.g., 'backhaul', 'fiber')
 * @returns {string} Category name
 */
export function getCategoryFromType(type) {
  return TYPE_TO_CATEGORY[type] || 'infrastructure';
}

/**
 * CSS class name for category dot
 * @param {string} category
 * @returns {string} CSS class
 */
export function getCategoryDotClass(category) {
  const normalized = category?.replace('_', '-');
  return `cat-dot--${normalized}`;
}

// Legacy exports for backwards compatibility during migration
export const COLOR_RAMPS = {
  cool: [
    [240, 249, 255], [198, 219, 239], [158, 202, 225], [107, 174, 214], [66, 146, 198], [33, 113, 181], [8, 81, 156], [8, 48, 107]
  ],
  warm: [
    [255, 247, 236], [254, 232, 200], [253, 212, 158], [253, 187, 132], [252, 141, 89], [239, 101, 72], [215, 48, 31], [153, 0, 0]
  ],
  inferno: [
    [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85], [227, 89, 51], [249, 140, 10], [252, 195, 44]
  ]
};

export function colorForType(type, ramp = 'cool') {
  const palette = COLOR_RAMPS[ramp] || COLOR_RAMPS.cool;
  const i = Math.abs(hash(type)) % palette.length;
  return palette[i];
}

export function colorRangeForRamp(ramp = 'cool') {
  return (COLOR_RAMPS[ramp] || COLOR_RAMPS.cool).slice();
}

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h;
}
