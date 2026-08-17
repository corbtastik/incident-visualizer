/**
 * VideoPreview - Sidebar video thumbnail with hover-to-play
 *
 * Shows thumbnail, plays muted preview on hover after 1s delay.
 * Click to expand to full player.
 */

import { useState, useRef, useCallback } from 'react';

const HOVER_DELAY = 1000;

export default function VideoPreview({
  videoSrc,
  thumbnailSrc,
  caption,
  score,
  onExpand
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef(null);
  const hoverTimer = useRef(null);

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      setShowPreview(true);
    }, HOVER_DELAY);
  }, []);

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setShowPreview(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setIsLoaded(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  return (
    <div className="video-preview-container">
      <div className="video-preview__title">VIDEO</div>
      <div
        className="video-preview"
        onClick={onExpand}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Thumbnail */}
        {(!showPreview || !isLoaded) && thumbnailSrc && (
          <img
            src={thumbnailSrc}
            alt={caption || 'Video thumbnail'}
            className="video-preview__thumb"
          />
        )}

        {/* Preview video (muted, loops) */}
        {showPreview && (
          <video
            ref={videoRef}
            src={videoSrc}
            className="video-preview__video"
            muted
            loop
            playsInline
            onLoadedData={handleVideoLoaded}
          />
        )}

        {/* Play button overlay */}
        <div className="video-preview__play-btn">
          <svg viewBox="0 0 24 24" width="24" height="24">
            <polygon points="5,3 19,12 5,21" fill="currentColor" />
          </svg>
        </div>

        {/* Hover indicator */}
        {showPreview && (
          <div className="video-preview__live-indicator">
            <span className="video-preview__live-dot" />
            PREVIEW
          </div>
        )}
      </div>

      {/* Info below */}
      <div className="video-preview__info">
        <span className="video-preview__caption">{caption}</span>
        <span className="video-preview__score">{score}</span>
      </div>
    </div>
  );
}
