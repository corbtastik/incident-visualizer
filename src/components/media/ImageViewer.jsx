/**
 * ImageViewer - Full image viewer overlay
 *
 * Features:
 * - Click outside or X to close
 * - Escape key to close
 * - Shows caption at bottom
 */

import { useEffect, useCallback } from 'react';

export default function ImageViewer({ imageSrc, caption, score, onClose }) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div
        className="image-viewer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="image-viewer__close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>

        {/* Image */}
        <img
          src={imageSrc}
          alt={caption || 'Image'}
          className="image-viewer__img"
        />

        {/* Caption bar */}
        <div className="image-viewer__caption-bar">
          <span className="image-viewer__caption">{caption}</span>
          {score && <span className="image-viewer__score">{score}</span>}
        </div>
      </div>
    </div>
  );
}
