/**
 * VideoPlayer - Full video player with custom controls
 *
 * Features:
 * - Play/pause with click on video or button
 * - Seek bar with progress and buffered indicators
 * - Volume control with mute toggle
 * - Time display
 * - Fullscreen toggle
 */

import { useState, useEffect, useCallback, useRef } from 'react';

function formatTime(seconds) {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export default function VideoPlayer({ videoSrc, onClose, caption }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const seekBarRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('progress', onProgress);
    video.addEventListener('volumechange', onVolumeChange);

    // Restore volume from localStorage
    const savedVolume = localStorage.getItem('videoPlayerVolume');
    if (savedVolume !== null) {
      video.volume = parseFloat(savedVolume);
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => clearTimeout(controlsTimeoutRef.current);
  }, [isPlaying, resetControlsTimeout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isFullscreen) {
        onClose?.();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm') {
        toggleMute();
      } else if (e.key === 'f') {
        toggleFullscreen();
      } else if (e.key === 'ArrowLeft') {
        seekRelative(-5);
      } else if (e.key === 'ArrowRight') {
        seekRelative(5);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.paused ? video.play() : video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const handleVolumeChange = useCallback((e) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    localStorage.setItem('videoPlayerVolume', newVolume);
    if (newVolume > 0 && video.muted) video.muted = false;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);

  const handleSeekClick = useCallback((e) => {
    const video = videoRef.current;
    const bar = seekBarRef.current;
    if (!video || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    video.currentTime = Math.max(0, Math.min(percent * duration, duration));
  }, [duration]);

  const seekRelative = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  }, [duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="video-player-overlay" onClick={onClose}>
      <div
        ref={containerRef}
        className={`video-player ${isFullscreen ? 'video-player--fullscreen' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={resetControlsTimeout}
      >
        {/* Close button */}
        {!isFullscreen && (
          <button className="video-player__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          </button>
        )}

        {/* Video */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="video-player__video"
          onClick={togglePlay}
          autoPlay
        />

        {/* Controls overlay */}
        <div className={`video-player__controls ${showControls ? '' : 'video-player__controls--hidden'}`}>
          {/* Seek bar */}
          <div className="video-player__seek-container">
            <div
              ref={seekBarRef}
              className="video-player__seek-bar"
              onClick={handleSeekClick}
            >
              <div
                className="video-player__seek-buffered"
                style={{ width: `${bufferedPercent}%` }}
              />
              <div
                className="video-player__seek-progress"
                style={{ width: `${progress}%` }}
              />
              <div
                className="video-player__seek-handle"
                style={{ left: `${progress}%` }}
              />
            </div>
          </div>

          {/* Control bar */}
          <div className="video-player__bar">
            {/* Play/Pause */}
            <button className="video-player__btn" onClick={togglePlay}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <polygon points="5,3 19,12 5,21" fill="currentColor" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="video-player__volume">
              <button className="video-player__btn" onClick={toggleMute}>
                {isMuted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                    <path d="M23 9l-6 6M17 9l6 6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" fill="currentColor" />
                    <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                className="video-player__volume-slider"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
              />
            </div>

            {/* Time */}
            <div className="video-player__time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Caption */}
            {caption && (
              <div className="video-player__caption">{caption}</div>
            )}

            {/* Fullscreen */}
            <button className="video-player__btn" onClick={toggleFullscreen}>
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
