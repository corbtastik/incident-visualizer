/**
 * DotSizeControl - Vertical slider for controlling map dot size
 *
 * Slide up to increase dot size, down to decrease.
 * Positioned in bottom-left corner of map area.
 */

import { useMapSettings } from '../../context/MapSettingsContext';

export default function DotSizeControl() {
  const { dotSize, setDotSize, minDotSize, maxDotSize } = useMapSettings();

  return (
    <div className="dot-size-control">
      <div className="dot-size-control__label">SIZE</div>
      <div className="dot-size-control__slider-container">
        <input
          type="range"
          className="dot-size-control__slider"
          min={minDotSize}
          max={maxDotSize}
          step={1}
          value={dotSize}
          onChange={(e) => setDotSize(Number(e.target.value))}
          orient="vertical"
        />
      </div>
      <div className="dot-size-control__preview">
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle
            cx="12"
            cy="12"
            r={Math.min(dotSize / 2, 10)}
            fill="var(--cat-consumer)"
            opacity="0.9"
          />
        </svg>
      </div>
    </div>
  );
}
