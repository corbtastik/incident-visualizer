/**
 * DocumentViewer - Full document/PDF viewer overlay
 *
 * Features:
 * - Displays PDF in iframe
 * - Click outside or X to close
 * - Escape key to close
 * - Shows caption at bottom
 */

import { useEffect } from 'react';

export default function DocumentViewer({ documentSrc, caption, score, onClose }) {
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

  // Use Google Docs Viewer to embed the PDF
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(documentSrc)}&embedded=true`;

  return (
    <div className="document-viewer-overlay" onClick={onClose}>
      <div
        className="document-viewer"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="document-viewer__close" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>

        {/* PDF iframe via Google Docs Viewer */}
        <iframe
          src={viewerUrl}
          className="document-viewer__iframe"
          title={caption || 'Document'}
        />

        {/* Caption bar */}
        <div className="document-viewer__caption-bar">
          <span className="document-viewer__caption">{caption}</span>
          {score && <span className="document-viewer__score">{score}</span>}
        </div>
      </div>
    </div>
  );
}
