/**
 * ImagePreview - Sidebar image thumbnail
 *
 * Shows thumbnail with caption/score below.
 * Click to expand to full viewer.
 */

export default function ImagePreview({
  imageSrc,
  caption,
  score,
  onExpand
}) {
  return (
    <div className="image-preview-container">
      <div className="image-preview__title">IMAGE</div>
      <div
        className="image-preview"
        onClick={onExpand}
      >
        <img
          src={imageSrc}
          alt={caption || 'Image thumbnail'}
          className="image-preview__img"
        />

        {/* Expand icon overlay */}
        <div className="image-preview__expand-btn">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Info below */}
      <div className="image-preview__info">
        <span className="image-preview__caption">{caption}</span>
        <span className="image-preview__score">{score}</span>
      </div>
    </div>
  );
}
