/**
 * Formatting utilities for incident-visualizer v2
 */

/**
 * Format a date/timestamp for display
 * @param {string|Date} date
 * @param {object} options
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return '—';

  const d = new Date(date);
  const { includeTime = true, relative = false } = options;

  if (relative) {
    return formatRelativeTime(d);
  }

  if (includeTime) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date
 * @returns {string}
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return formatDate(date, { includeTime: false });
}

/**
 * Format a timestamp for display (HH:MM:SSZ format)
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTimestamp(date) {
  if (!date) return '—';
  const d = new Date(date);
  return d.toISOString().slice(11, 19) + 'Z';
}

/**
 * Format a number with commas
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num == null) return '—';
  return num.toLocaleString('en-US');
}

/**
 * Format currency
 * @param {number} amount
 * @param {boolean} showCents
 * @returns {string}
 */
export function formatCurrency(amount, showCents = false) {
  if (amount == null) return '—';

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  return formatter.format(amount);
}

/**
 * Format a similarity/confidence score
 * @param {number} score - Value between 0 and 1
 * @param {number} decimals
 * @returns {string}
 */
export function formatScore(score, decimals = 2) {
  if (score == null) return '—';
  return score.toFixed(decimals);
}

/**
 * Format a percentage
 * @param {number} value - Value between 0 and 1, or already a percentage
 * @param {boolean} isDecimal - If true, multiply by 100
 * @returns {string}
 */
export function formatPercent(value, isDecimal = true) {
  if (value == null) return '—';
  const pct = isDecimal ? value * 100 : value;
  return `${pct.toFixed(0)}%`;
}

/**
 * Format distance in km
 * @param {number} km
 * @returns {string}
 */
export function formatDistance(km) {
  if (km == null) return '—';
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration in hours
 * @param {number} hours
 * @returns {string}
 */
export function formatDuration(hours) {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  return `${hours.toFixed(1)}h`;
}

/**
 * Format latency in milliseconds
 * @param {number} ms
 * @returns {string}
 */
export function formatLatency(ms) {
  if (ms == null) return '—';
  return `${ms}ms`;
}

/**
 * Truncate text with ellipsis
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '...';
}

/**
 * Format ticket reference for display
 * @param {string} ticketRef
 * @returns {string}
 */
export function formatTicketRef(ticketRef) {
  if (!ticketRef) return '—';
  return ticketRef;
}

/**
 * Format coordinates
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
export function formatCoordinates(lat, lng) {
  if (lat == null || lng == null) return '—';
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Parse MongoDB ObjectId or plain string ID
 * @param {string|object} id
 * @returns {string}
 */
export function parseId(id) {
  if (!id) return '';
  if (typeof id === 'string') return id;
  if (id.$oid) return id.$oid;
  return String(id);
}
