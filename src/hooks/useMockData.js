/**
 * useMockData - Hook for loading mock data from JSON files
 *
 * This hook provides all the mock data needed for the UI.
 * When we integrate with MongoDB later, this will be replaced
 * with actual API calls.
 *
 * JOIN KEY: ticketRef (not _id)
 * All lookups use serviceIssue.ticketRef as the canonical identifier.
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

  // Dev assertions for data consistency
  useEffect(() => {
    if (searchResults.counts) {
      const { lexicalOnly, semanticOnly, bothPipelines, hybridTotal, notMatched, corpusTotal } = {
        ...searchResults.counts,
        corpusTotal: searchResults.corpusTotal
      };

      if (lexicalOnly + semanticOnly + bothPipelines !== hybridTotal) {
        console.warn(
          `[useMockData] Count mismatch: ${lexicalOnly} + ${semanticOnly} + ${bothPipelines} !== ${hybridTotal}`
        );
      }
      if (hybridTotal + notMatched !== corpusTotal) {
        console.warn(
          `[useMockData] Corpus mismatch: ${hybridTotal} + ${notMatched} !== ${corpusTotal}`
        );
      }
    }
  }, [searchResults]);

  // Helper to get incident by ticketRef (primary) or _id (fallback)
  const getIncidentByTicketRef = (ticketRef) => {
    return incidents.find(inc =>
      inc.serviceIssue?.ticketRef === ticketRef || inc._id === ticketRef
    );
  };

  // Helper to get cluster by ID
  const getClusterById = (id) => {
    return clusters.find(c => c.clusterId === id);
  };

  // Helper to get neighbours for an incident by ticketRef
  const getNeighbours = (ticketRef) => {
    return neighbours[ticketRef] || [];
  };

  // Helper to get UMAP coordinates for an incident by ticketRef
  const getUmapCoords = (ticketRef) => {
    return umapCoords[ticketRef] || null;
  };

  // Build a map from ticketRef to result object for quick lookup
  const resultsByTicketRef = useMemo(() => {
    const map = {};
    if (searchResults.modes) {
      // Index hybrid results (superset)
      searchResults.modes.hybrid?.results?.forEach(r => {
        map[r.ticketRef] = r;
      });
    }
    return map;
  }, [searchResults]);

  // Helper to get result info for an incident
  const getResultInfo = (ticketRef) => {
    return resultsByTicketRef[ticketRef] || null;
  };

  // Category counts from full corpus
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

  // Type counts from full corpus
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
    getIncidentByTicketRef,
    getClusterById,
    getNeighbours,
    getUmapCoords,
    getResultInfo,
    resultsByTicketRef,
  };
}

export default useMockData;
