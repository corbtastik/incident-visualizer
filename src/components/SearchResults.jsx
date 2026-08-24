import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CAT_COLOR } from '../layers';

// Convert RGBA array to CSS
function rgbaToCss(arr = [], alpha = 1) {
  const [r = 128, g = 128, b = 128] = arr;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// YIQ contrast for text color
function contrastFor([r = 0, g = 0, b = 0]) {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#001E2B' : '#F8FAFC';
}

const DEFAULT_HEIGHT = Math.round(window.innerHeight / 3);

// Match badge component with monochrome SVG icons
function MatchBadge({ type }) {
  const icons = {
    narrative: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    media: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    )
  };

  return (
    <span
      className="sr-match-badge"
      title={`Matched on ${type}`}
    >
      {icons[type] || null}
    </span>
  );
}

// Media attachment display
function MediaAttachment({ media }) {
  if (!media || media.length === 0) return null;

  const firstMedia = media[0];
  const filename = firstMedia.filename?.split('/').pop() || 'image';
  const caption = firstMedia.caption || '';
  const truncatedCaption = caption.length > 80 ? caption.slice(0, 77) + '...' : caption;

  return (
    <div className="sr-row__media">
      <div className="sr-row__media-icon" title="Has attached media">
        📎
      </div>
      <div className="sr-row__media-info">
        <span className="sr-row__media-filename">{filename}</span>
        {truncatedCaption && (
          <span className="sr-row__media-caption">{truncatedCaption}</span>
        )}
      </div>
      {media.length > 1 && (
        <span className="sr-row__media-count">+{media.length - 1} more</span>
      )}
    </div>
  );
}

function ResultRow({ result, onZoom }) {
  const category = result?.serviceIssue?.category;
  const type = result?.serviceIssue?.type || 'Unknown';
  const rgba = CAT_COLOR[category] || [128, 128, 128, 200];

  const bgColor = rgbaToCss(rgba, 0.85);
  const textColor = contrastFor(rgba);
  const borderColor = rgbaToCss(rgba, 0.5);

  const title = type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const handleZoom = () => {
    if (onZoom && result.lat && result.lng) {
      onZoom(result.lat, result.lng);
    }
  };

  // Get matchedOn array (defaults to narrative if not present for backwards compat)
  const matchedOn = result.matchedOn || ['narrative'];

  return (
    <div
      className="sr-row"
      style={{
        '--row-bg': bgColor,
        '--row-fg': textColor,
        '--row-border': borderColor,
      }}
    >
      <div className="sr-row__header">
        <div className="sr-row__title">{title}</div>
        <div className="sr-row__badges">
          {matchedOn.map(m => (
            <MatchBadge key={m} type={m} />
          ))}
        </div>
        {result.lat && result.lng && (
          <button className="sr-row__zoom" onClick={handleZoom} title="Zoom to location">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </button>
        )}
      </div>

      <div className="sr-row__details">
        <span className="sr-row__field">
          <span className="sr-row__label">City:</span> {result.city || '—'}
        </span>
        <span className="sr-row__field">
          <span className="sr-row__label">Category:</span> {category || '—'}
        </span>
        <span className="sr-row__field">
          <span className="sr-row__label">ID:</span> {result.serviceIssue?.ticketRef || result._id || '—'}
        </span>
        {result.score !== undefined && (
          <span className="sr-row__field sr-row__score">
            <span className="sr-row__label">Score:</span> {result.score.toFixed(3)}
          </span>
        )}
      </div>

      {(result.serviceIssue?.narrative || result.narrative) && (
        <div className="sr-row__narrative">
          <span className="sr-row__label">Narrative:</span> {result.serviceIssue?.narrative || result.narrative}
        </div>
      )}

      <MediaAttachment media={result.media} />
    </div>
  );
}

export default function SearchResults({ query, results, loading, onClose, onZoom }) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const handleMouseDown = useCallback((e) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = startY.current - e.clientY;
      const newHeight = Math.max(150, Math.min(window.innerHeight - 100, startHeight.current + delta));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="bottom-dock" style={{ height: `${height}px` }}>
      <div className="sr-resize-handle" onMouseDown={handleMouseDown} />
      <div className="bottom-dock__panel">
        <div className="sr-header">
          <span className="sr-title">Search Results</span>
          <span className="sr-query">"{query}"</span>
          <span className="sr-count">{loading ? 'Searching...' : `${results.length} results`}</span>
          <button className="sr-close" onClick={onClose} title="Close">×</button>
        </div>
        <div className="sr-body">
          {loading ? (
            <div className="sr-loading">
              <div className="sr-loading__spinner" />
              <span>Searching incidents...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="sr-empty">No results found</div>
          ) : (
            <div className="sr-list">
              {results.map((result, i) => (
                <ResultRow key={result._id || result.incidentId || i} result={result} onZoom={onZoom} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
