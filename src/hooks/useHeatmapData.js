import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Extract timestamp from MongoDB ObjectId string
 */
function objectIdToTimestamp(objectId) {
  if (!objectId || typeof objectId !== 'string' || objectId.length < 8) return null;
  // First 8 hex chars of ObjectId are seconds since epoch
  const timestamp = parseInt(objectId.substring(0, 8), 16) * 1000;
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Hook to fetch historical incident data for heatmap visualization.
 * Fetches all incidents (no simRunId filter) for density visualization.
 */
export function useHeatmapData({ baseUrl, categories, limit = 50000 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, byCategory: {} });
  const [timeRange, setTimeRange] = useState({ min: null, max: null });
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      // Fetch from each enabled category in parallel
      const enabledCategories = Object.entries(categories)
        .filter(([_, enabled]) => enabled)
        .map(([cat]) => cat);

      const promises = enabledCategories.map(async (category) => {
        const url = `${baseUrl}/heatmap/${category}?limit=${Math.ceil(limit / enabledCategories.length)}`;
        const response = await fetch(url, { signal: abortControllerRef.current.signal });
        if (!response.ok) throw new Error(`Failed to fetch ${category}: ${response.status}`);
        const json = await response.json();
        return { category, data: json.data || [] };
      });

      const results = await Promise.all(promises);

      // Combine all data and extract timestamps
      const allData = [];
      const byCategory = {};
      let minTime = Infinity;
      let maxTime = -Infinity;

      for (const { category, data: catData } of results) {
        byCategory[category] = catData.length;
        for (const d of catData) {
          if (d.lat && d.lng) {
            // Extract timestamp from _id (ObjectId) or ts field
            const idStr = typeof d._id === 'object' ? d._id.$oid : d._id;
            const timestamp = d.ts ? new Date(d.ts).getTime() : objectIdToTimestamp(idStr);

            if (timestamp) {
              minTime = Math.min(minTime, timestamp);
              maxTime = Math.max(maxTime, timestamp);
            }

            allData.push({
              ...d,
              category,
              position: [d.lng, d.lat],
              timestamp: timestamp || Date.now()
            });
          }
        }
      }

      // Sort by timestamp for consistent ordering
      allData.sort((a, b) => a.timestamp - b.timestamp);

      setData(allData);
      setStats({ total: allData.length, byCategory });
      setTimeRange({
        min: minTime === Infinity ? null : minTime,
        max: maxTime === -Infinity ? null : maxTime
      });
      setLoading(false);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[useHeatmapData] error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [baseUrl, categories, limit]);

  // Fetch on mount and when categories change
  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, stats, timeRange, refetch: fetchData };
}
