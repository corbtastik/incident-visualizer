/**
 * ImpactBlock - Cluster impact statistics
 *
 * Shows tickets collapsed, truck rolls avoided, and savings.
 * Includes arithmetic derivation as per design specs.
 */

import React from 'react';
import { formatCurrency } from '../../utils/formatters';

export default function ImpactBlock({
  ticketsCollapsed,
  truckRollsAvoided,
  estSavedUsd,
  costPerRoll = 3840,
}) {
  return (
    <div className="impact-block">
      <div className="impact-block__title">Impact</div>

      <div className="impact-block__stats">
        <div className="impact-block__stat">
          <span className="impact-block__label">Tickets collapsed</span>
          <span className="impact-block__value">{ticketsCollapsed} → 1</span>
        </div>

        <div className="impact-block__stat">
          <span className="impact-block__label">Truck rolls avoided</span>
          <span className="impact-block__value">{truckRollsAvoided}</span>
        </div>

        <div className="impact-block__note">
          {truckRollsAvoided} dispatches collapsed to 1
        </div>

        <div className="impact-block__stat">
          <span className="impact-block__label">Est. saved</span>
          <span className="impact-block__value impact-block__value--highlight">
            {formatCurrency(estSavedUsd)}
          </span>
        </div>

        <div className="impact-block__derivation">
          {truckRollsAvoided} × {formatCurrency(costPerRoll)} = {formatCurrency(estSavedUsd)}
        </div>

        <div className="impact-block__note">
          median splice-crew roll cost
        </div>
      </div>
    </div>
  );
}
