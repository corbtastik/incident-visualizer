/**
 * DocumentPreview - Sidebar document thumbnail
 *
 * Shows document icon/preview with caption/score below.
 * Click to expand to full viewer.
 */

export default function DocumentPreview({
  caption,
  score,
  onExpand
}) {
  return (
    <div className="document-preview-container">
      <div className="document-preview__title">DOCUMENT</div>
      <div
        className="document-preview"
        onClick={onExpand}
      >
        {/* Document icon/preview */}
        <svg viewBox="0 0 200 100" className="document-preview__icon">
          <rect x="10" y="10" width="180" height="80" fill="#1B2127" stroke="#232A31" strokeWidth="1" />
          <line x1="25" y1="25" x2="175" y2="25" stroke="#3a4049" strokeWidth="2" />
          <line x1="25" y1="40" x2="155" y2="40" stroke="#3a4049" strokeWidth="2" />
          <line x1="25" y1="55" x2="165" y2="55" stroke="#3a4049" strokeWidth="2" />
          <line x1="25" y1="70" x2="120" y2="70" stroke="#3a4049" strokeWidth="2" />
          <rect x="130" y="60" width="50" height="22" fill="#232A31" stroke="#00ED64" strokeWidth="1" />
          <text x="155" y="75" fill="#00ED64" fontSize="10" textAnchor="middle">PDF</text>
        </svg>

        {/* Expand icon overlay */}
        <div className="document-preview__expand-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Info below */}
      <div className="document-preview__info">
        <span className="document-preview__caption">{caption}</span>
        <span className="document-preview__score">{score}</span>
      </div>
    </div>
  );
}
