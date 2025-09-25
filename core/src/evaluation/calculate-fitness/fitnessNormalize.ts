import { CONFIG } from "@runtime/settings/constants"

export const normalizeTime = (timeMs: number): number => {
  const { timeThresholdSeconds, baselineTimeSeconds } = CONFIG.improvement.fitness
  const timeThresholdMs = timeThresholdSeconds * 1000
  const baselineTimeMs = baselineTimeSeconds * 1000

  // 1) no penalty region
  if (timeMs <= timeThresholdMs) return 100

  // 2) penalty region: scale from threshold → baseline
  //    at timeMs = timeThresholdMs → ratio = 1 → score 100
  //    at timeMs = baselineTimeMs   → ratio = baseline/threshold → <100
  //likely bug: division by zero if timeMs is 0
  if (timeMs === 0) return 0
  const ratio = baselineTimeMs / timeMs
  return Math.min(100, ratio * 100)
}

export const normalizeCost = (costUsd: number): number => {
  const { costThresholdUsd, baselineCostUsd } = CONFIG.improvement.fitness

  // 1) no penalty region
  if (costUsd <= costThresholdUsd) return 100

  // 2) penalty region: scale from threshold → baseline
  //    at costUsd = costThresholdUsd → ratio = 1 → score 100
  //    at costUsd = baselineCostUsd   → ratio = baseline/threshold → <100
  //likely bug: division by zero if costUsd is 0
  if (costUsd === 0) return 100 // free operations get perfect score
  const ratio = baselineCostUsd / costUsd
  return Math.min(100, ratio * 100)
}
