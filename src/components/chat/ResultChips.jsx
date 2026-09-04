import React from 'react';

// Phase 4 makes these select the incident on the live map. For now they are
// visual only, so the layout is settled before cross-view state exists.
export default function ResultChips({ citations, onSelect }) {
  return (
    <div className="chat-chips">
      {citations.map((c) => (
        <button
          key={c.id}
          type="button"
          className={`chat-chip chat-chip--${c.category}`}
          onClick={() => onSelect?.(c)}
          title={`${c.city} · ${c.category}`}
        >
          <span className="chat-chip__ref">{c.ticketRef}</span>
          <span className="chat-chip__city">{c.city}</span>
        </button>
      ))}
    </div>
  );
}
