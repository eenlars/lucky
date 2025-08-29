import { ConfigError, validateConfig, validateProblem } from "../lib/errors"
import type {
  GPConfig,
  GPProblem,
  GPResult,
  OnGeneration,
  RNG,
  Selector,
} from "../types"
import type { GPMetrics } from "../types"
import { mulberry32 } from "../lib/rng"
import { normalizeConfigBase } from "../lib/config"
import { tournament } from "./selection"
/**
 * Tournament selection: sample `size` individuals and pick the best fitness.
 * Small size keeps pressure low; larger size increases selection pressure.
 */
// selection moved to src/selection.ts

/**
 * GPLiten: a minimal, zero-dependency genetic programming/algorithm engine.
 *
 * - Synchronous operations only (fitness/mutate/crossover are sync)
 * - Deterministic RNG via `mulberry32`
 * - Early stopping via `targetFitness` and `stall` window
 * - Optional problem hooks: `isValid`, `repair`
 */
export class GPLite<T> {
  readonly cfg: Required<GPConfig<T>>
  readonly rng: RNG
  private select: Selector<T>

  constructor(
    private problem: GPProblem<T>,
    cfg: GPConfig<T> = {}
  ) {
    // Validate inputs for clearer developer feedback
    validateProblem(problem)
    validateConfig(cfg)
    const base = normalizeConfigBase(cfg)
    this.cfg = {
      ...base,
      rng: cfg.rng ?? mulberry32(),
      selector: cfg.selector ?? tournament(base.tournament),
      hooks: cfg.hooks ?? {},
    }
    this.rng = this.cfg.rng
    this.select = this.cfg.selector
    if (this.cfg.elite > this.cfg.popSize) {
      throw new ConfigError("Elite count cannot exceed population size")
    }
    // allow tournament sizes larger than population (sampling with replacement)
  }

  static seed(seed: number) {
    return mulberry32(seed)
  }

  /** Guard fitness evaluation and invalid genomes. */
  private safeFitness(
    g: T,
    metrics?: Pick<
      GPMetrics,
      | "evaluations"
      | "invalidEvaluations"
      | "repaired"
      | "repairFailures"
      | "fitnessErrors"
      | "nonFiniteFitness"
    >
  ): number {
    let genome = g
    metrics && (metrics.evaluations += 1)

    // Validate and potentially repair
    if (this.problem.isValid && !this.problem.isValid(genome)) {
      if (this.problem.repair) {
        genome = this.problem.repair(genome, this.rng)
        // If still invalid after repair, assign worst fitness
        if (!this.problem.isValid(genome)) {
          if (metrics) {
            metrics.invalidEvaluations += 1
            metrics.repairFailures += 1
          }
          return -Infinity
        }
        if (metrics) metrics.repaired += 1
      } else {
        if (metrics) metrics.invalidEvaluations += 1
        return -Infinity
      }
    }

    // Evaluate fitness with safety checks
    try {
      const f = this.problem.fitness(genome)
      // Handle various edge cases
      if (!Number.isFinite(f) || f !== f) {
        if (metrics) {
          metrics.invalidEvaluations += 1
          metrics.nonFiniteFitness += 1
        }
        return -Infinity
      }
      return f
    } catch {
      // If fitness function throws, treat as invalid
      if (metrics) {
        metrics.invalidEvaluations += 1
        metrics.fitnessErrors += 1
      }
      return -Infinity
    }
  }

  run(onGen?: OnGeneration): GPResult<T> {
    const t0 = Date.now()
    let stopReason: "target" | "stall" | "time" | "evaluations" | "generations" | undefined
    // metrics counters
    const metrics = {
      evaluations: 0,
      invalidEvaluations: 0,
      repaired: 0,
      repairFailures: 0,
      fitnessErrors: 0,
      nonFiniteFitness: 0,
      mutations: 0,
      crossovers: 0,
      selections: 0,
      immigrants: 0,
    }
    // constants derived from config
    const immigrantsPerGen = Math.min(
      Math.floor(this.cfg.popSize * this.cfg.immigration),
      Math.max(0, this.cfg.popSize - this.cfg.elite)
    )
    // 1. initialise population
    let pop: Array<{ g: T; f: number }> = Array.from(
      { length: this.cfg.popSize },
      () => {
        const g = this.problem.createRandom(this.rng)
        return { g, f: this.safeFitness(g, metrics) }
      }
    )
    // budget check after initialisation
    if (metrics.evaluations >= this.cfg.maxEvaluations) {
      pop.sort((a, b) => b.f - a.f)
      return {
        best: pop[0].g,
        bestFitness: pop[0].f,
        generations: 0,
        history: [pop[0].f],
        elapsedMs: Date.now() - t0,
        stopReason: "evaluations",
        meanHistory: [-Infinity],
        invalidHistory: [0],
        validShareHistory: [1],
        metrics: {
          evaluations: metrics.evaluations,
          invalidEvaluations: metrics.invalidEvaluations,
          repaired: metrics.repaired,
          repairFailures: metrics.repairFailures,
          fitnessErrors: metrics.fitnessErrors,
          nonFiniteFitness: metrics.nonFiniteFitness,
          mutations: metrics.mutations,
          crossovers: metrics.crossovers,
          selections: metrics.selections,
          immigrants: metrics.immigrants,
          elitesPerGen: this.cfg.elite,
          config: {
            popSize: this.cfg.popSize,
            generations: this.cfg.generations,
            cxProb: this.cfg.cxProb,
            mutProb: this.cfg.mutProb,
            immigration: this.cfg.immigration,
            tournament: this.cfg.tournament,
            stall: this.cfg.stall,
            targetFitness: this.cfg.targetFitness,
            maxWallMs: this.cfg.maxWallMs,
            maxEvaluations: this.cfg.maxEvaluations,
          },
        },
      }
    }

    const history: number[] = []
    const meanHistory: number[] = []
    const invalidHistory: number[] = []
    const validShareHistory: number[] = []
    for (let gen = 0; gen < this.cfg.generations; ++gen) {
      // lifecycle hook: signal generation start
      this.cfg.hooks.onGenerationStart?.({ gen, elapsedMs: Date.now() - t0 })
      // rank by fitness
      pop.sort((a, b) => b.f - a.f)

      // basic stats
      const best = pop[0].f
      // one-pass for finite sum and invalid count
      let finiteSum = 0
      let finiteCount = 0
      let invalidCount = 0
      for (let i = 0; i < pop.length; i++) {
        const f = pop[i].f
        if (Number.isFinite(f)) {
          finiteSum += f
          finiteCount++
        } else {
          invalidCount++
        }
      }
      const mean = finiteCount ? finiteSum / finiteCount : -Infinity
      history.push(best)
      meanHistory.push(mean)
      invalidHistory.push(invalidCount)
      validShareHistory.push(finiteCount / pop.length)
      onGen?.({ gen, best, mean }, { invalidCount, validShare: finiteCount / pop.length })
      // lifecycle hook: after stats computed for the generation
      this.cfg.hooks.onGenerationEnd?.({
        gen,
        best,
        mean,
        invalidCount,
        bestGenome: pop[0].g,
        elapsedMs: Date.now() - t0,
      })

      // early-stop
      if (best >= this.cfg.targetFitness) {
        stopReason = "target"
        break
      }
      // time-limit auto stop
      if (Date.now() - t0 > this.cfg.maxWallMs) {
        stopReason = "time"
        break
      }
      // evaluation budget stop
      if (metrics.evaluations >= this.cfg.maxEvaluations) {
        stopReason = "evaluations"
        break
      }
      const w = this.cfg.stall
      if (
        w &&
        history.length > w &&
        history[history.length - 1] <= history[history.length - 1 - w]
      ) {
        stopReason = "stall"
        break
      }

      // 2. next population – start with elites
      const next: typeof pop = pop.slice(0, this.cfg.elite)

      // 3. breeding
      while (next.length < this.cfg.popSize - immigrantsPerGen) {
        const p1 = this.select(pop, this.rng)
        const p2 = this.select(pop, this.rng)
        metrics.selections += 2

        let [c1, c2] =
          this.rng.next() < this.cfg.cxProb
            ? (metrics.crossovers += 1,
              this.problem.crossover(pop[p1].g, pop[p2].g, this.rng))
            : [pop[p1].g, pop[p2].g]

        if (this.rng.next() < this.cfg.mutProb) {
          metrics.mutations += 1
          c1 = this.problem.mutate(c1, this.rng)
        }
        if (this.rng.next() < this.cfg.mutProb) {
          metrics.mutations += 1
          c2 = this.problem.mutate(c2, this.rng)
        }

        next.push({ g: c1, f: this.safeFitness(c1, metrics) })
        if (metrics.evaluations >= this.cfg.maxEvaluations) {
          stopReason = "evaluations"
          break
        }
        if (next.length < this.cfg.popSize - immigrantsPerGen)
          next.push({ g: c2, f: this.safeFitness(c2, metrics) })
        if (metrics.evaluations >= this.cfg.maxEvaluations) {
          stopReason = "evaluations"
          break
        }
      }
      if (stopReason) {
        pop = next
        break
      }

      // 4. immigrants
      for (let i = 0; i < immigrantsPerGen; ++i) {
        const g = this.problem.createRandom(this.rng)
        next.push({ g, f: this.safeFitness(g, metrics) })
        metrics.immigrants += 1
        if (metrics.evaluations >= this.cfg.maxEvaluations) {
          stopReason = "evaluations"
          break
        }
      }
      if (stopReason) {
        pop = next
        break
      }

      pop = next
    }

    pop.sort((a, b) => b.f - a.f)
    if (!stopReason) stopReason = "generations"
    return {
      best: pop[0].g,
      bestFitness: pop[0].f,
      generations: history.length,
      history,
      elapsedMs: Date.now() - t0,
      stopReason,
      meanHistory,
      invalidHistory,
      validShareHistory,
      metrics: {
        evaluations: metrics.evaluations,
        invalidEvaluations: metrics.invalidEvaluations,
        repaired: metrics.repaired,
        repairFailures: metrics.repairFailures,
        fitnessErrors: metrics.fitnessErrors,
        nonFiniteFitness: metrics.nonFiniteFitness,
        mutations: metrics.mutations,
        crossovers: metrics.crossovers,
        selections: metrics.selections,
        immigrants: metrics.immigrants,
        elitesPerGen: this.cfg.elite,
        config: {
          popSize: this.cfg.popSize,
          generations: this.cfg.generations,
          cxProb: this.cfg.cxProb,
          mutProb: this.cfg.mutProb,
          immigration: this.cfg.immigration,
          tournament: this.cfg.tournament,
          stall: this.cfg.stall,
          targetFitness: this.cfg.targetFitness,
          maxWallMs: this.cfg.maxWallMs,
          maxEvaluations: this.cfg.maxEvaluations,
        },
      },
    }
  }
}
