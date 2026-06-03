/**
 * trustMappings.js — Centralized UI config for trust, risk, and transaction states.
 * All trust-aware components consume these mappings instead of hardcoding labels/colors.
 */

// ── Trust Label Mapping ──────────────────────────────────────────────
export const TRUST_TIERS = [
  { key: 'high',   label: 'Highly Trusted', variant: 'success',   min: 0.8 },
  { key: 'good',   label: 'Trusted',        variant: 'primary',   min: 0.6 },
  { key: 'new',    label: 'New Creator',     variant: 'secondary', min: 0.4 },
  { key: 'review', label: 'Under Review',    variant: 'warning',   min: 0.0 },
];

export function getTrustLabel(score) {
  if (score == null) return null;
  for (const tier of TRUST_TIERS) {
    if (score >= tier.min) return tier;
  }
  return TRUST_TIERS[TRUST_TIERS.length - 1];
}

// ── Risk State Mapping ───────────────────────────────────────────────
export const RISK_LEVELS = [
  { key: 'low',      label: 'Low Risk',      color: 'text-emerald-500', max: 0.3 },
  { key: 'moderate', label: 'Moderate Risk', color: 'text-amber-500',   max: 0.6 },
  { key: 'elevated', label: 'Elevated Risk', color: 'text-rose-500',    max: Infinity },
];

export function getRiskLevel(anomalyRisk) {
  if (anomalyRisk == null) return null;
  for (const level of RISK_LEVELS) {
    if (anomalyRisk < level.max) return level;
  }
  return RISK_LEVELS[RISK_LEVELS.length - 1];
}

// ── Transaction State Mapping ────────────────────────────────────────
export const TRANSACTION_STATES = {
  INITIATED:     { label: 'Transaction Started',  color: 'text-slate-500',   bg: 'bg-slate-100',   dotColor: 'bg-slate-400',   step: 1 },
  ESCROW_HELD:   { label: 'Funds Secured',        color: 'text-amber-600',   bg: 'bg-amber-50',    dotColor: 'bg-amber-500',   step: 2 },
  VERIFIED:      { label: 'Delivery Verified',     color: 'text-blue-600',    bg: 'bg-blue-50',     dotColor: 'bg-blue-500',    step: 3 },
  RELEASED:      { label: 'Completed',             color: 'text-emerald-600', bg: 'bg-emerald-50',  dotColor: 'bg-emerald-500', step: 4 },
  FAILED:        { label: 'Failed',                color: 'text-rose-600',    bg: 'bg-rose-50',     dotColor: 'bg-rose-500',    step: -1 },
  DISPUTED:      { label: 'Under Dispute',         color: 'text-amber-700',   bg: 'bg-amber-50',    dotColor: 'bg-amber-600',   step: -1 },
  REFUNDED:      { label: 'Refunded',              color: 'text-slate-600',   bg: 'bg-slate-100',   dotColor: 'bg-slate-500',   step: -1 },
  FRAUD_FLAGGED: { label: 'Flagged',               color: 'text-red-700',     bg: 'bg-red-50',      dotColor: 'bg-red-600',     step: -1 },
};

// Ordered happy path for timeline rendering
export const TRANSACTION_HAPPY_PATH = ['INITIATED', 'ESCROW_HELD', 'VERIFIED', 'RELEASED'];

export function getTransactionState(status) {
  return TRANSACTION_STATES[status] || TRANSACTION_STATES.INITIATED;
}

// ── Trust Signal Labels (decomposed display) ─────────────────────────
export const TRUST_SIGNALS = {
  fulfillment_score:    { label: 'Fulfillment',  format: 'percent' },
  delivery_reliability: { label: 'Delivery',     format: 'percent' },
  dispute_risk:         { label: 'Dispute Risk', format: 'percent', invert: true },
  anomaly_risk:         { label: 'Anomaly Risk', format: 'percent', invert: true },
};

// ── Simulation Scenarios (human-readable labels) ─────────────────────
export const SIMULATION_SCENARIOS = {
  successful_fulfillment: { label: 'Successful Delivery',     description: 'Creator delivers on time' },
  delayed_delivery:       { label: 'Delayed Delivery',        description: 'Delivery arrives late' },
  dispute_and_refund:     { label: 'Dispute & Refund',        description: 'User raises dispute' },
  creator_cancellation:    { label: 'Creator Cancellation',     description: 'Creator cancels order' },
  suspicious_activity:    { label: 'Suspicious Activity',     description: 'Flagged during escrow' },
  fraud_scenario:         { label: 'Fraud Detection',         description: 'Immediate fraud flag' },
};

// ── Explanation Builder ──────────────────────────────────────────────
export function buildExplanationParts(match) {
  const parts = [];
  if (match.lgbm_score != null) parts.push({ label: 'Relevance', value: `${match.lgbm_score}%` });
  if (match.trust_score != null) parts.push({ label: 'Trust', value: `${(match.trust_score * 100).toFixed(0)}%` });
  if (match.fairness_penalty_applied) parts.push({ label: 'Fairness', value: 'Adjusted' });
  return parts;
}

// ── Format Helpers ───────────────────────────────────────────────────
export function formatTrustPercent(value) {
  if (value == null) return null;
  return `${(value * 100).toFixed(0)}%`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
