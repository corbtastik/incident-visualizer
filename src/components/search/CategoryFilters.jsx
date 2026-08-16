/**
 * CategoryFilters - Category checkboxes with counts
 *
 * Matches Screen 1 mockup: checkboxes with colored dots,
 * category names, and live counts aligned right.
 */

import React from 'react';
import { CATEGORY_COLORS } from '../../utils/colors';
import { CATEGORY_LABELS } from '../../utils/constants';

const CATEGORIES = [
  { id: 'business', label: 'Business' },
  { id: 'consumer', label: 'Consumer' },
  { id: 'emerging_tech', label: 'Emerging Tech' },
  { id: 'federal', label: 'Federal' },
  { id: 'infrastructure', label: 'Infrastructure' },
];

export default function CategoryFilters({
  categories,
  onCategoryChange,
  counts = {}
}) {
  const allChecked = CATEGORIES.every(cat => categories[cat.id]);

  const handleToggleAll = () => {
    const newValue = !allChecked;
    const updated = {};
    CATEGORIES.forEach(cat => {
      updated[cat.id] = newValue;
    });
    onCategoryChange?.(updated);
  };

  const handleToggle = (categoryId) => {
    onCategoryChange?.({
      ...categories,
      [categoryId]: !categories[categoryId]
    });
  };

  return (
    <div className="category-filters">
      <div className="category-filters__header">
        <span className="category-filters__label">CATEGORIES</span>
        <button
          onClick={handleToggleAll}
          className="category-filters__toggle-all"
        >
          {allChecked ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="category-filters__list">
        {CATEGORIES.map((cat) => (
          <label key={cat.id} className="category-filters__item">
            <input
              type="checkbox"
              checked={categories[cat.id] || false}
              onChange={() => handleToggle(cat.id)}
              className="category-filters__checkbox"
            />
            <span
              className="category-filters__dot"
              style={{ backgroundColor: CATEGORY_COLORS[cat.id] }}
            />
            <span className="category-filters__name">{cat.label}</span>
            <span className="category-filters__count">{counts[cat.id] || 0}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
