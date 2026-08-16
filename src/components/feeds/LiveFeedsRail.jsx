/**
 * LiveFeedsRail - Right rail container for live feeds
 *
 * Composes all feed components into the 380px right rail.
 */

import React from 'react';
import SystemicAlert from './SystemicAlert';
import IncidentCard from './IncidentCard';
import ResultDonut from './ResultDonut';

export default function LiveFeedsRail({
  // Event counts
  eventCount,
  // Cluster data (if detected)
  cluster,
  onClusterClick,
  // Result composition
  resultsSummary,
  // Recent incidents
  recentIncidents = [],
  onIncidentClick,
}) {
  return (
    <div className="live-feeds-rail">
      {/* Header */}
      <div className="live-feeds-rail__header">
        <div className="live-feeds-rail__title">Live Feeds</div>
        <div className="live-feeds-rail__count">{eventCount} events</div>
      </div>

      {/* Systemic Alert (if cluster detected) */}
      {cluster && (
        <div className="live-feeds-rail__section">
          <SystemicAlert
            clusterId={cluster.clusterId}
            location={`${cluster.city}, ${cluster.state}`}
            incidentCount={cluster.members?.length || 0}
            typeCount={new Set(cluster.members?.map(m => m.type) || []).size}
            categoryCount={3}
            maxDistance={`${cluster.detection?.actualSpanKm || 0}km`}
            onClick={onClusterClick}
          />
        </div>
      )}

      {/* Result Composition Donut */}
      {resultsSummary && (
        <div className="live-feeds-rail__section">
          <div className="live-feeds-rail__section-title">Result Composition</div>
          <ResultDonut
            total={resultsSummary.hybridCount}
            bothCount={resultsSummary.both}
            semanticOnlyCount={resultsSummary.semanticCount - resultsSummary.both}
            lexicalOnlyCount={resultsSummary.lexical}
          />
        </div>
      )}

      {/* Latest Events */}
      <div className="live-feeds-rail__events">
        <div className="live-feeds-rail__section-title">Latest Events</div>
        <div className="live-feeds-rail__cards">
          {recentIncidents.map(incident => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              onClick={() => onIncidentClick?.(incident)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="live-feeds-rail__footer">
        <img
          src="https://webimages.mongodb.com/_com_assets/cms/kuyjf3vea2hg34taa-horizontal_default_slate_blue.svg"
          alt="MongoDB"
          className="live-feeds-rail__logo"
        />
        <span className="live-feeds-rail__footer-text">Atlas</span>
      </div>
    </div>
  );
}
