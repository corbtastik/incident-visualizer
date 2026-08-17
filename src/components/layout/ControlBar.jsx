/**
 * ControlBar - Global control bar with app-level controls
 *
 * Contains dot size slider and other map controls.
 */

import { useMapSettings } from '../../context/MapSettingsContext';

export default function ControlBar() {
  const { dotSize, setDotSize, minDotSize, maxDotSize } = useMapSettings();

  return (
    <div className="control-bar">
      <div className="control-bar__group">
        <span className="control-bar__label">DOT SIZE</span>
        <input
          type="range"
          className="control-bar__slider"
          min={minDotSize}
          max={maxDotSize}
          step={1}
          value={dotSize}
          onChange={(e) => setDotSize(Number(e.target.value))}
        />
        <span className="control-bar__value">{dotSize}px</span>
      </div>
    </div>
  );
}
