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

function ResultRow({ result }) {
  const category = result?.serviceIssue?.category;
  const type = result?.serviceIssue?.type || 'Unknown';
  const rgba = CAT_COLOR[category] || [128, 128, 128, 200];

  const bgColor = rgbaToCss(rgba, 0.85);
  const textColor = contrastFor(rgba);
  const borderColor = rgbaToCss(rgba, 0.5);

  const title = type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div
      className="sr-row"
      style={{
        '--row-bg': bgColor,
        '--row-fg': textColor,
        '--row-border': borderColor,
      }}
    >
      <div className="sr-row__title">{title}</div>
      <div className="sr-row__details">
        <span className="sr-row__field">
          <span className="sr-row__label">City:</span> {result.city || '—'}
        </span>
        <span className="sr-row__field">
          <span className="sr-row__label">Category:</span> {category || '—'}
        </span>
        <span className="sr-row__field">
          <span className="sr-row__label">ID:</span> {result.incidentId || result._id || '—'}
        </span>
        {result.score !== undefined && (
          <span className="sr-row__field sr-row__score">
            <span className="sr-row__label">Score:</span> {result.score.toFixed(3)}
          </span>
        )}
      </div>
      {result.narrative && (
        <div className="sr-row__narrative">
          <span className="sr-row__label">Narrative:</span> {result.narrative}
        </div>
      )}
    </div>
  );
}

export default function SearchResults({ query, results, onClose }) {
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
          <span className="sr-count">{results.length} results</span>
          <button className="sr-close" onClick={onClose} title="Close">×</button>
        </div>
        <div className="sr-body">
          {results.length === 0 ? (
            <div className="sr-empty">No results found</div>
          ) : (
            <div className="sr-list">
              {results.map((result, i) => (
                <ResultRow key={result._id || result.incidentId || i} result={result} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
