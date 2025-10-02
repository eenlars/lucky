export type BalanceOptions = {
  costHalfLifeUsd?: number
  timeHalfLifeMs?: number
  costWeight?: number // 0..1
  timeWeight?: number // 0..1
}

function clampToRange(value: number, min: number, max: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/**
 * accuracyScorePct
 * - 100 if successItems >= requested (treated as correct/finally accurate)
 * - otherwise scales linearly with completeness: 100 * (successItems / requested)
 */
export function accuracyScorePct(successItems: number, requested: number): number {
  if (!requested || requested <= 0) return 0
  if (successItems >= requested) return 100
  const ratio = clampToRange(successItems / requested, 0, 1)
  return Number((ratio * 100).toFixed(2))
}

/**
 * costEfficiencyScorePct
 * Non-comparative, anchored by a configurable half-life.
 *
 * score = 100 * exp(-ln(2) * (costUsd / costHalfLifeUsd))
 * - At cost = 0, score = 100
 * - At cost = halfLife, score = 50
 * - Smoothly decays as cost grows; never negative
 */
export function costEfficiencyScorePct(costUsd: number, costHalfLifeUsd = 0.02): number {
  const c = Math.max(0, Number(costUsd) || 0)
  const hl = Math.max(1e-9, Number(costHalfLifeUsd) || 0.02)
  const score = 100 * Math.exp(-Math.LN2 * (c / hl))
  return Number(clampToRange(score, 0, 100).toFixed(2))
}

/**
 * timeEfficiencyScorePct
 * Non-comparative, anchored by a configurable half-life.
 *
 * score = 100 * exp(-ln(2) * (durationMs / timeHalfLifeMs))
 * - At time = 0ms, score = 100
 * - At time = halfLife, score = 50
 */
export function timeEfficiencyScorePct(durationMs: number, timeHalfLifeMs = 2000): number {
  const t = Math.max(0, Number(durationMs) || 0)
  const hl = Math.max(1e-6, Number(timeHalfLifeMs) || 2000)
  const score = 100 * Math.exp(-Math.LN2 * (t / hl))
  return Number(clampToRange(score, 0, 100).toFixed(2))
}

/**
 * costTimeBalancedScorePct
 * Combines cost and time efficiency using a weighted geometric mean.
 * This penalizes imbalances and avoids comparative normalization.
 *
 * combined = 100 * ( (costScore/100)^w_c * (timeScore/100)^w_t )
 * where w_c and w_t are normalized from options (defaults 0.5 each).
 */
export function costTimeBalancedScorePct(costUsd: number, durationMs: number, options: BalanceOptions = {}): number {
  const costScore = costEfficiencyScorePct(costUsd, options.costHalfLifeUsd)
  const timeScore = timeEfficiencyScorePct(durationMs, options.timeHalfLifeMs)
  const cw = Math.max(0, options.costWeight ?? 0.5)
  const tw = Math.max(0, options.timeWeight ?? 0.5)
  const denom = cw + tw || 1
  const wC = cw / denom
  const wT = tw / denom

  // Work in [0,1] to avoid scale issues, guard very small values
  const c01 = clampToRange(costScore / 100, 1e-6, 1)
  const t01 = clampToRange(timeScore / 100, 1e-6, 1)
  const combined01 = Math.exp(wC * Math.log(c01) + wT * Math.log(t01))
  const combined = 100 * combined01
  return Number(clampToRange(combined, 0, 100).toFixed(2))
}

/**
 * finalScorePct
 * Multiplies correctness-oriented accuracy by cost-time efficiency.
 *
 * final = (accuracy/100) * costTimeBalanced
 * - Yields 0..100 and is non-comparative (anchored via half-lives).
 * - If accuracy is 0 (insufficient items), final score is 0.
 */
export function finalScorePct(
  successItems: number,
  requested: number,
  costUsd: number,
  durationMs: number,
  options: BalanceOptions = {},
): number {
  const acc = accuracyScorePct(successItems, requested)
  if (acc <= 0) return 0
  const eff = costTimeBalancedScorePct(costUsd, durationMs, options)
  const final = (acc / 100) * eff
  return Number(clampToRange(final, 0, 100).toFixed(2))
}
