import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to fetch historical incident data for heatmap visualization.
 * Fetches all incidents (no simRunId filter) for density visualization.
 */
export function useHeatmapData({ baseUrl, categories, limit = 50000 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, byCategory: {} });
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

      // Combine all data
      const allData = [];
      const byCategory = {};

      for (const { category, data: catData } of results) {
        byCategory[category] = catData.length;
        for (const d of catData) {
          if (d.lat && d.lng) {
            allData.push({
              ...d,
              category,
              position: [d.lng, d.lat]
            });
          }
        }
      }

      setData(allData);
      setStats({ total: allData.length, byCategory });
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

  return { data, loading, error, stats, refetch: fetchData };
}
