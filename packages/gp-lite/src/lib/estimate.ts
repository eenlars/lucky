import type { GPConfig, GPMetrics } from "../types"
import { normalizeConfigBase } from "./config"

export interface CostModel {
  /** Estimated milliseconds per fitness evaluation (defaults to 0). */
  perEvaluationMs?: number
  /** Optional monetary cost per fitness evaluation (generic units). */
  perEvaluationCost?: number
  /** Fixed overhead per generation in milliseconds (loop bookkeeping). */
  perGenerationOverheadMs?: number
  /** One-time overhead per run in milliseconds (setup/teardown). */
  perRunOverheadMs?: number
}

export interface RunEstimate {
  evaluations: {
    init: number
    perGen: number
    plannedTotal: number
    expectedTotal: number
    cappedByMaxEvaluations?: number
  }
  timeMs?: {
    init: number
    perGen: number
    plannedTotal: number
    expectedTotal: number
    cappedByMaxWall?: number
  }
  monetary?: {
    perEval: number
    plannedTotal: number
    expectedTotal: number
  }
  operations: {
    immigrantsPerGen: number
    childrenFromBreedingPerGen: number
    pairsPerGen: number
    selectionsPerGen: number
    expectedCrossoversPerGen: number
    expectedMutationsPerGen: number
  }
  notes: string[]
}

/**
 * Normalize GPConfig to mirror GPLite defaults without instantiating the engine.
 */
// uses shared normalization from config.ts

/**
 * Estimate planned and expected costs for a run given a config.
 * - Generic: uses counts of fitness evaluations + optional unit costs.
 * - Time and budget caps are applied to provide "capped" views.
 */
export function estimateRun<T>(
  cfg: GPConfig<T> = {},
  opts: {
    /** If provided, overrides `cfg.generations` for expected scenario. */
    expectedGenerations?: number
    /** Generic cost and time units. */
    units?: CostModel
  } = {}
): RunEstimate {
  const c = normalizeConfigBase(cfg)
  const expectedGenerations = opts.expectedGenerations ?? c.generations
  const immigrantsPerGen = Math.floor(c.popSize * c.immigration)
  const childrenFromBreedingPerGen = Math.max(0, c.popSize - c.elite - immigrantsPerGen)
  const pairsPerGen = Math.ceil(childrenFromBreedingPerGen / 2)
  const selectionsPerGen = pairsPerGen * 2

  const init = c.popSize
  // Each full generation evaluates exactly popSize - elite new individuals
  const perGen = Math.max(0, c.popSize - c.elite)
  const plannedTotal = init + c.generations * perGen
  const expectedTotal = init + expectedGenerations * perGen
  const cappedByMaxEvaluations = Math.min(expectedTotal, c.maxEvaluations)

  const perEvalMs = opts.units?.perEvaluationMs ?? 0
  const perGenOverheadMs = opts.units?.perGenerationOverheadMs ?? 0
  const perRunOverheadMs = opts.units?.perRunOverheadMs ?? 0

  const timeInit = init * perEvalMs + perRunOverheadMs
  const timePerGen = perGen * perEvalMs + perGenOverheadMs
  const timePlannedTotal = timeInit + c.generations * timePerGen
  const timeExpectedTotal = timeInit + expectedGenerations * timePerGen
  const cappedByMaxWall = Math.min(timeExpectedTotal, c.maxWallMs)

  const perEvalCost = opts.units?.perEvaluationCost
  const monetary =
    perEvalCost !== undefined
      ? {
          perEval: perEvalCost,
          plannedTotal: plannedTotal * perEvalCost,
          expectedTotal: expectedTotal * perEvalCost,
        }
      : undefined

  return {
    evaluations: {
      init,
      perGen,
      plannedTotal,
      expectedTotal,
      cappedByMaxEvaluations: Number.isFinite(c.maxEvaluations)
        ? cappedByMaxEvaluations
        : undefined,
    },
    timeMs:
      perEvalMs || perGenOverheadMs || perRunOverheadMs
        ? {
            init: timeInit,
            perGen: timePerGen,
            plannedTotal: timePlannedTotal,
            expectedTotal: timeExpectedTotal,
            cappedByMaxWall: Number.isFinite(c.maxWallMs) ? cappedByMaxWall : undefined,
          }
        : undefined,
    monetary,
    operations: {
      immigrantsPerGen,
      childrenFromBreedingPerGen,
      pairsPerGen,
      selectionsPerGen,
      expectedCrossoversPerGen: pairsPerGen * c.cxProb,
      expectedMutationsPerGen: childrenFromBreedingPerGen * c.mutProb,
    },
    notes: [
      "Estimates assume no early stop (target/stall/time/evaluations).",
      "Per-generation evaluations equal popSize - elite by construction.",
      "Crossovers are counted per parent-pair; mutations per child genome.",
    ],
  }
}

/**
 * Compute realized cost from a completed run's metrics (post‑hoc).
 */
export function estimateFromMetrics(
  m: GPMetrics,
  units: CostModel = {}
) {
  const evals = m.evaluations
  const timeMs = (units.perEvaluationMs ?? 0) * evals
  const cost = units.perEvaluationCost !== undefined ? units.perEvaluationCost * evals : undefined
  return {
    evaluations: evals,
    timeMs: units.perEvaluationMs !== undefined ? timeMs : undefined,
    monetary: cost !== undefined ? { total: cost, perEval: units.perEvaluationCost! } : undefined,
  }
}
