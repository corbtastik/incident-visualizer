/**
 * IncidentCard - JSON preview card for live feeds
 *
 * Matches Screen 1 mockup: compact JSON syntax highlighting
 * with category dot and ticket reference.
 */

import React from 'react';
import { CATEGORY_COLORS } from '../../utils/colors';

export default function IncidentCard({ incident, onClick }) {
  const category = incident.serviceIssue?.category;
  const ticketRef = incident.serviceIssue?.ticketRef;
  const type = incident.serviceIssue?.type;
  const severity = incident.serviceIssue?.severity;
  const impact = incident.serviceIssue?.impact?.count || 0;

  return (
    <div className="incident-card" onClick={onClick}>
      <div className="incident-card__header">
        <span
          className="incident-card__dot"
          style={{ backgroundColor: CATEGORY_COLORS[category] }}
        />
        <span className="incident-card__ticket">{ticketRef}</span>
      </div>

      <div className="incident-card__json">
        <div className="incident-card__line">
          <span className="token-key">"type"</span>
          <span className="token-colon">: </span>
          <span className="token-string">"{type}"</span>
          <span className="token-comma">,</span>
        </div>
        <div className="incident-card__line">
          <span className="token-key">"severity"</span>
          <span className="token-colon">: </span>
          <span className="token-string">"{severity}"</span>
          <span className="token-comma">,</span>
        </div>
        <div className="incident-card__line">
          <span className="token-key">"impact"</span>
          <span className="token-colon">: </span>
          <span className="token-number">{impact}</span>
        </div>
      </div>
    </div>
  );
}
