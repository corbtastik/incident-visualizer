/**
 * useMockData - Hook for loading mock data from JSON files
 *
 * This hook provides all the mock data needed for the UI.
 * When we integrate with MongoDB later, this will be replaced
 * with actual API calls.
 */

import { useState, useEffect, useMemo } from 'react';
import mockIncidents from '../data/mock-incidents.json';
import mockClusters from '../data/mock-clusters.json';
import mockSearchResults from '../data/mock-search-results.json';
import mockNeighbours from '../data/mock-neighbours.json';
import mockUmap from '../data/mock-umap.json';

export function useMockData() {
  const [loading, setLoading] = useState(true);

  // In a real app, this would be async loading
  useEffect(() => {
    // Simulate loading delay for realistic feel
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize the data to prevent unnecessary re-renders
  const incidents = useMemo(() => mockIncidents || [], []);
  const clusters = useMemo(() => mockClusters || [], []);
  const searchResults = useMemo(() => mockSearchResults || {}, []);
  const neighbours = useMemo(() => mockNeighbours || {}, []);
  const umapCoords = useMemo(() => mockUmap || {}, []);

  // Helper to get incident by ID
  const getIncidentById = (id) => {
    return incidents.find(inc =>
      inc._id === id ||
      inc.serviceIssue?.ticketRef === id
    );
  };

  // Helper to get cluster by ID
  const getClusterById = (id) => {
    return clusters.find(c => c.clusterId === id);
  };

  // Helper to get neighbours for an incident
  const getNeighbours = (incidentId) => {
    return neighbours[incidentId] || [];
  };

  // Helper to get UMAP coordinates for an incident
  const getUmapCoords = (incidentId) => {
    return umapCoords[incidentId] || null;
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      business: 0,
      consumer: 0,
      emerging_tech: 0,
      federal: 0,
      infrastructure: 0,
    };
    incidents.forEach(inc => {
      const cat = inc.serviceIssue?.category;
      if (cat && counts.hasOwnProperty(cat)) {
        counts[cat]++;
      }
    });
    return counts;
  }, [incidents]);

  // Type counts
  const typeCounts = useMemo(() => {
    const counts = {};
    incidents.forEach(inc => {
      const type = inc.serviceIssue?.type;
      if (type) {
        counts[type] = (counts[type] || 0) + 1;
      }
    });
    return counts;
  }, [incidents]);

  return {
    loading,
    incidents,
    clusters,
    searchResults,
    neighbours,
    umapCoords,
    categoryCounts,
    typeCounts,
    getIncidentById,
    getClusterById,
    getNeighbours,
    getUmapCoords,
  };
}

export default useMockData;
