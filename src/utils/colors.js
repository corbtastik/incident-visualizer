/**
 * Color System for incident-visualizer v2
 *
 * CRITICAL: All infrastructure types (backhaul, smartcell, datacenter, edge,
 * construction, cloud-network) MUST render amber (#FBBF24).
 */

// Category colors - use these for dots, pins, chart segments
export const CATEGORY_COLORS = {
  business:       '#4F8FFF',
  consumer:       '#00ED64',
  emerging_tech:  '#A78BFA',
  federal:        '#F472B6',
  infrastructure: '#FBBF24',
};

// Category colors as RGBA arrays (for deck.gl)
export const CATEGORY_COLORS_RGBA = {
  business:       [79, 143, 255, 200],
  consumer:       [0, 237, 100, 200],
  emerging_tech:  [167, 139, 250, 200],
  federal:        [244, 114, 182, 200],
  infrastructure: [251, 191, 36, 200],
};

// State colors - for retrieval provenance
export const STATE_COLORS = {
  lexical:  '#94A3B8',
  semantic: '#00ED64',
  hybrid:   '#22D3EE',
  novel:    '#FF6B4A',
  systemic: '#FF3B6B',
};

// State colors as RGBA arrays (for deck.gl)
export const STATE_COLORS_RGBA = {
  lexical:  [148, 163, 184, 200],
  semantic: [0, 237, 100, 200],
  hybrid:   [34, 211, 238, 200],
  novel:    [255, 107, 74, 200],
  systemic: [255, 59, 107, 200],
};

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
