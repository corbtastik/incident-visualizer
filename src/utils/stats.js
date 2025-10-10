export function countsByType(data, allowedTypes) {
  const out = {};
  for (const d of data) {
    const t = d?.serviceIssue?.type || 'other';
    if (allowedTypes && !allowedTypes.has(t)) continue;
    out[t] = (out[t] || 0) + 1;
  }
  return out;
}
