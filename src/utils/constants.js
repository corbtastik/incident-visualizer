/**
 * Constants for incident-visualizer v2
 */

// All service types grouped by category
export const SERVICE_TYPES = {
  business: ['b2b', 'enterprise', 'voip'],
  consumer: ['5g', 'broadband', 'fiber', 'wifi-hotspot', 'wireless'],
  emerging_tech: ['iot', 'satellite', 'smart-city'],
  federal: ['firstnet', 'government', 'public-safety'],
  infrastructure: ['backhaul', 'cloud-network', 'construction', 'datacenter', 'edge', 'smartcell'],
};

// All categories
export const CATEGORIES = [
  'business',
  'consumer',
  'emerging_tech',
  'federal',
  'infrastructure',
];

// Category display labels
export const CATEGORY_LABELS = {
  business: 'Business',
  consumer: 'Consumer',
  emerging_tech: 'Emerging Tech',
  federal: 'Federal',
  infrastructure: 'Infrastructure',
};

// Severity levels
export const SEVERITIES = ['p1', 'p2', 'p3', 'p4'];

// Severity to weight mapping (for pin sizing)
export const SEVERITY_WEIGHT = {
  p1: 5,
  p2: 4,
  p3: 2,
  p4: 1,
};

// Search modes
export const SEARCH_MODES = ['lexical', 'hybrid', 'semantic'];

// Active patterns (from the spec)
export const PATTERNS = [
  { id: 'hs', label: 'Hybrid Search', code: '5A' },
  { id: 'vs', label: 'Vector Similarity', code: '6T' },
  { id: 'mf', label: 'Metadata-Filtered Retrieval', code: '6T' },
  { id: 'si', label: 'Streaming Ingestion', code: '1T' },
  { id: 'ir', label: 'Incremental Re-embedding', code: '1T' },
  { id: 'ce', label: 'CDC + Embedding Pipeline', code: '2E' },
];

// Impact unit labels
export const IMPACT_UNITS = {
  subscribers: 'subscribers',
  sites: 'sites',
  extensions: 'extensions',
  clients: 'clients',
  devices: 'devices',
  terminals: 'terminals',
  assets: 'assets',
  units: 'units',
  users: 'users',
  calls: 'calls',
  prefixes: 'prefixes',
  passings: 'passings',
  racks: 'racks',
  workloads: 'workloads',
};

// Resolution states
export const RESOLUTION_STATES = ['open', 'dispatched', 'resolved', 'duplicate'];

// Media kinds
export const MEDIA_KINDS = ['image', 'video', 'screenshot', 'document-page'];

// Evidence tabs (detail shell)
export const EVIDENCE_TABS = {
  incident: ['Map', 'Semantic', 'Media'],
  cluster: ['Map', 'Timeline', 'Keyword Overlap'],
};

// Map configuration
export const MAP_CONFIG = {
  initialViewState: {
    longitude: -98,
    latitude: 39,
    zoom: 3,
  },
  darkStyle: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  lightStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

// Service type display labels
export const SERVICE_TYPE_LABELS = {
  'b2b': 'B2B',
  'enterprise': 'Enterprise',
  'voip': 'VoIP',
  '5g': '5G',
  'broadband': 'Broadband',
  'fiber': 'Fiber',
  'wifi-hotspot': 'WiFi Hotspot',
  'wireless': 'Wireless',
  'iot': 'IoT',
  'satellite': 'Satellite',
  'smart-city': 'Smart City',
  'firstnet': 'FirstNet',
  'government': 'Government',
  'public-safety': 'Public Safety',
  'backhaul': 'Backhaul',
  'cloud-network': 'Cloud Network',
  'construction': 'Construction',
  'datacenter': 'Datacenter',
  'edge': 'Edge',
  'smartcell': 'Smartcell',
};
