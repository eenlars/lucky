import type { GPResult } from "../types"

/**
 * formatResult: Pretty-print summary of a GP run.
 */
export function formatResult<T>(res: GPResult<T>): string {
  const lastMean = res.meanHistory?.at(-1)
  const lastInvalid = res.invalidHistory?.at(-1)
  const validShare = res.validShareHistory?.at(-1)
  const m = res.metrics

  const lines = [
    `GP Result`,
    `  bestFitness: ${fmt(res.bestFitness)}`,
    `  generations: ${res.generations}`,
    `  stopReason: ${res.stopReason ?? "generations"}`,
    res.elapsedMs !== undefined ? `  elapsedMs: ${res.elapsedMs}` : undefined,
    m
      ? `  cfg: pop=${m.config.popSize}, gens=${m.config.generations}, cx=${m.config.cxProb}, mut=${m.config.mutProb}, imm=${m.config.immigration}, tour=${m.config.tournament}, stall=${m.config.stall}`
      : undefined,
    lastMean !== undefined ? `  meanFitness(last): ${fmt(lastMean)}` : undefined,
    lastInvalid !== undefined ? `  invalidCount(last): ${lastInvalid}` : undefined,
    validShare !== undefined
      ? `  validShare(last): ${(validShare * 100).toFixed(1)}%`
      : undefined,
    m
      ? `  evaluations: ${m.evaluations} (invalid: ${m.invalidEvaluations}, repaired: ${m.repaired}, repairFailures: ${m.repairFailures})`
      : undefined,
    m
      ? `  fitnessIssues: errors=${m.fitnessErrors}, nonFinite=${m.nonFiniteFitness}`
      : undefined,
    m
      ? `  ops: mutations=${m.mutations}, crossovers=${m.crossovers}, selections=${m.selections}, immigrants=${m.immigrants}, elites/gen=${m.elitesPerGen}`
      : undefined,
    m ? `  budgets: wallMs=${m.config.maxWallMs}, evals=${m.config.maxEvaluations}` : undefined,
  ].filter(Boolean) as string[]

  return lines.join("\n")
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  return n % 1 === 0 ? String(n) : n.toFixed(4)
}
