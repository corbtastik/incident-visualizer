/**
 * ProvenanceLegend - Legend for retrieval provenance colors
 *
 * Shows the meaning of pin colors on the map.
 */

import React from 'react';
import { MODE_COLOR } from '../../utils/colors';

const PROVENANCE_ITEMS = [
  { id: 'both', color: MODE_COLOR.hybrid, label: 'Anchor (both)' },
  { id: 'semantic', color: MODE_COLOR.semantic, label: 'Semantic only' },
  { id: 'lexical', color: MODE_COLOR.lexical, label: 'Lexical only' },
];

export default function ProvenanceLegend({ visible = true }) {
  if (!visible) return null;

  return (
    <div className="provenance-legend">
      <div className="provenance-legend__title">Retrieval Source</div>
      <div className="provenance-legend__items">
        {PROVENANCE_ITEMS.map(item => (
          <div key={item.id} className="provenance-legend__item">
            <span
              className="provenance-legend__dot"
              style={{ backgroundColor: item.color }}
            />
            <span className="provenance-legend__label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
