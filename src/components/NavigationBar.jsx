import React from 'react';

export default function NavigationBar({ views, currentView, onNavigate }) {
  return (
    <div className="nav-bar">
      <button
        className={`nav-bar__btn ${currentView === 'overview' ? 'nav-bar__btn--active' : ''}`}
        onClick={() => onNavigate('overview')}
        title="Overview (Esc)"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span>Overview</span>
      </button>

      <div className="nav-bar__divider" />

      {views.map((view, idx) => (
        <button
          key={view.id}
          className={`nav-bar__btn ${currentView === view.id ? 'nav-bar__btn--active' : ''}`}
          onClick={() => onNavigate(view.id)}
          title={`${view.label} (${idx + 1})`}
        >
          {view.id === 'live' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          )}
          {view.id === 'heatmap' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c1.5 0 3 1 3 3 0 2.5-3 6-3 6s-3-3.5-3-6c0-2 1.5-3 3-3z" />
              <path d="M12 22c-4 0-8-2-8-6 0-3 3-5 5-7 1-1 2-2 3-2s2 1 3 2c2 2 5 4 5 7 0 4-4 6-8 6z" />
            </svg>
          )}
          <span>{view.label}</span>
        </button>
      ))}
    </div>
  );
}
