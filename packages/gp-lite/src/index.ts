// re-export all types and utilities
export { formatResult } from "./lib/format"
export { mulberry32 } from "./lib/rng"
export type {
  GPConfig, GPHooks, GPMetrics, GPProblem,
  GPResult, OnGeneration, RNG,
  Selector
} from "./types"

// engine exports
export { GPLite } from "./core/engine"
export { tournament } from "./core/selection"

// error utilities (opt-in)
export {
  ConfigError,
  EvolutionError,
  GPLiteError,
  ProblemError,
  validateConfig,
  validateProblem
} from "./lib/errors"

// estimator utilities (generic cost/time projection)
export { estimateFromMetrics, estimateRun } from "./lib/estimate"

