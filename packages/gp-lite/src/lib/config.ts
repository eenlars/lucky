import type { GPConfig } from "../types"

/**
 * Normalize GPConfig to shared defaults without instantiating the engine.
 * Also treats `timeLimitMs` as a deprecated alias of `maxWallMs` (backwards-compat).
 */
export function normalizeConfigBase<T>(cfg: GPConfig<T>): Required<Pick<
  GPConfig<T>,
  | "popSize"
  | "generations"
  | "elite"
  | "cxProb"
  | "mutProb"
  | "immigration"
  | "tournament"
  | "stall"
  | "targetFitness"
  | "timeLimitMs"
  | "maxWallMs"
  | "maxEvaluations"
>> {
  const popSize = cfg.popSize ?? 100
  const elite = cfg.elite ?? Math.max(1, Math.floor(0.02 * popSize))
  const maxWallMs = (cfg.maxWallMs ?? cfg.timeLimitMs) ?? Infinity
  return {
    popSize,
    generations: cfg.generations ?? 1000,
    elite,
    cxProb: cfg.cxProb ?? 0.8,
    mutProb: cfg.mutProb ?? 0.1,
    immigration: cfg.immigration ?? 0.02,
    tournament: cfg.tournament ?? 3,
    stall: cfg.stall ?? 50,
    targetFitness: cfg.targetFitness ?? Infinity,
    timeLimitMs: maxWallMs,
    maxWallMs,
    maxEvaluations: cfg.maxEvaluations ?? Infinity,
  }
}
