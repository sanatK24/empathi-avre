import React from 'react';
import Badge from './Badge';
import { getTrustLabel } from '../../utils/trustMappings';

/**
 * TrustBadge — renders a colored Badge based on trust score thresholds.
 * Returns null when score is null/undefined (progressive enhancement).
 */
const TrustBadge = ({ score, className = '' }) => {
  const tier = getTrustLabel(score);
  if (!tier) return null;

  return (
    <Badge variant={tier.variant} className={className}>
      {tier.label}
    </Badge>
  );
};

export default TrustBadge;
