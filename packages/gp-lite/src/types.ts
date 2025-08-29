/**
 * Problem definition for the genome type `T`.
 * Provide domain-specific implementations of initialization, fitness, and operators.
 */
export interface GPProblem<T> {
  /** Create a fresh random genome. */
  createRandom(rng: RNG): T
  /** Fitness score: higher is better. Must be finite. */
  fitness(g: T): number
  /** Return a mutated copy of the genome. */
  mutate(g: T, rng: RNG): T
  /** Return two crossover children from parents `a` and `b`. */
  crossover(a: T, b: T, rng: RNG): [T, T]

  // optional hooks
  /** Validate genome; invalid genomes are assigned -Infinity fitness. */
  isValid?(g: T): boolean
  /** Repair invalid genome before fitness evaluation. */
  repair?(g: T, rng: RNG): T
  /** Optional distance function for diversity/novelty metrics. */
  distance?(a: T, b: T): number
}

export interface RNG {
  /** 0 ≤ value < 1 */
  next(): number
  /** Integer in [0, max) */
  int(max: number): number
}

/* ────────────  Config / Result  ──────────── */

export interface GPConfig<T = unknown> {
  /** Population size (default 100) */
  popSize?: number
  /** Max generations (default 1000) */
  generations?: number
  /** Elites preserved per generation (default ~2% of pop) */
  elite?: number
  /** Crossover probability (default 0.8) */
  cxProb?: number
  /** Mutation probability (default 0.1) */
  mutProb?: number
  /** Fraction of immigrants per generation (default 0.02) */
  immigration?: number
  /** Tournament size (default 3) */
  tournament?: number
  /** Early-stop if no improvement across this window (default 50) */
  stall?: number
  /** Stop once best fitness reaches or exceeds this value (default Infinity) */
  targetFitness?: number
  /**
   * Auto-stop if runtime exceeds this many milliseconds (default: Infinity)
   * @deprecated Prefer `maxWallMs`. This field remains as a back-compat alias.
   */
  timeLimitMs?: number
  /** Preferred wall-clock budget (ms). If set, overrides `timeLimitMs`. */
  maxWallMs?: number
  /** Max total fitness evaluations budget. */
  maxEvaluations?: number
  /** Custom RNG implementation */
  rng?: RNG
  /** Custom selection operator */
  selector?: Selector<T>
  /** Optional lifecycle hooks for generation start/end */
  hooks?: GPHooks<T>
}

/**
 * Generation callback
 * - ctx: primary stats used most often
 * - extra: optional extended stats for richer telemetry (non-breaking)
 */
export type OnGeneration = (
  ctx: { gen: number; best: number; mean: number },
  extra?: { invalidCount: number; validShare: number }
) => void

export interface GPResult<T> {
  /** Best genome from the final population */
  best: T
  /** Best fitness found */
  bestFitness: number
  /** Number of generations actually executed */
  generations: number
  /** Best fitness per generation */
  history: number[]
  /** Elapsed wall-clock time in milliseconds */
  elapsedMs?: number
  /** Reason for stopping if early-terminated */
  stopReason?: "target" | "stall" | "time" | "evaluations" | "generations"
  /** Mean fitness per generation, finite only (optional) */
  meanHistory?: number[]
  /** Count of invalid evaluations per generation (optional) */
  invalidHistory?: number[]
  /** Fraction of finite individuals per generation (0..1) */
  validShareHistory?: number[]
  /** Aggregated run metrics for better insight (optional) */
  metrics?: GPMetrics
}

/** Detailed counters and config snapshot for a GP run */
export interface GPMetrics {
  /** Total number of fitness evaluations */
  evaluations: number
  /** Evaluations that resulted in -Infinity (invalid/errors/non-finite) */
  invalidEvaluations: number
  /** Invalid genomes successfully repaired before evaluation */
  repaired: number
  /** Repair attempts that still resulted in invalid genomes */
  repairFailures: number
  /** Fitness function threw an error */
  fitnessErrors: number
  /** Fitness returned NaN or ±Infinity */
  nonFiniteFitness: number
  /** Number of mutation operations applied */
  mutations: number
  /** Number of crossover operations applied */
  crossovers: number
  /** Number of parent selections performed */
  selections: number
  /** Total immigrants introduced across generations */
  immigrants: number
  /** Elites preserved per generation */
  elitesPerGen: number
  /** Config snapshot for reference */
  config: {
    popSize: number
    generations: number
    cxProb: number
    mutProb: number
    immigration: number
    tournament: number
    stall: number
    targetFitness: number
    maxWallMs: number
    maxEvaluations: number
  }
}

/** User-provided hooks to observe evolution lifecycle without coupling to storage */
export interface GPHooks<T> {
  /** Called at the start of each generation (including gen=0) */
  onGenerationStart?(info: { gen: number; elapsedMs: number }): void
  /** Called after per-generation stats are computed */
  onGenerationEnd?(info: {
    gen: number
    best: number
    mean: number
    invalidCount: number
    bestGenome: T
    elapsedMs: number
  }): void
}

/* ─────────────  Selection  ───────────── */

/** Return index of selected parent from `pop`. */
export type Selector<T> = (pop: Array<{ g: T; f: number }>, rng: RNG) => number
