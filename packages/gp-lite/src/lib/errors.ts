import type { GPConfig, GPProblem } from "../types"

export class GPLiteError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GPLiteError"
  }
}

export class ConfigError extends GPLiteError {
  constructor(message: string) {
    super(message)
    this.name = "ConfigError"
  }
}

export class ProblemError extends GPLiteError {
  constructor(message: string) {
    super(message)
    this.name = "ProblemError"
  }
}

export class EvolutionError extends GPLiteError {
  constructor(message: string) {
    super(message)
    this.name = "EvolutionError"
  }
}

export function validateConfig<T>(cfg: GPConfig<T>): void {
  if (
    cfg.popSize !== undefined &&
    (cfg.popSize < 2 || !Number.isInteger(cfg.popSize))
  ) {
    throw new ConfigError("Population size must be an integer >= 2")
  }
  if (
    cfg.generations !== undefined &&
    (cfg.generations < 1 || !Number.isInteger(cfg.generations))
  ) {
    throw new ConfigError("Generations must be an integer >= 1")
  }
  if (
    cfg.elite !== undefined &&
    (cfg.elite < 0 || !Number.isInteger(cfg.elite))
  ) {
    throw new ConfigError("Elite count must be a non-negative integer")
  }
  if (cfg.cxProb !== undefined && (cfg.cxProb < 0 || cfg.cxProb > 1)) {
    throw new ConfigError("Crossover probability must be between 0 and 1")
  }
  if (cfg.mutProb !== undefined && (cfg.mutProb < 0 || cfg.mutProb > 1)) {
    throw new ConfigError("Mutation probability must be between 0 and 1")
  }
  if (
    cfg.immigration !== undefined &&
    (cfg.immigration < 0 || cfg.immigration > 1)
  ) {
    throw new ConfigError("Immigration rate must be between 0 and 1")
  }
  if (
    cfg.tournament !== undefined &&
    (cfg.tournament < 1 || !Number.isInteger(cfg.tournament))
  ) {
    throw new ConfigError("Tournament size must be an integer >= 1")
  }
  if (
    cfg.timeLimitMs !== undefined &&
    (cfg.timeLimitMs < 0 || !Number.isFinite(cfg.timeLimitMs))
  ) {
    throw new ConfigError("timeLimitMs must be a finite number >= 0")
  }
  if (
    cfg.maxWallMs !== undefined &&
    (cfg.maxWallMs < 0 || !Number.isFinite(cfg.maxWallMs))
  ) {
    throw new ConfigError("maxWallMs must be a finite number >= 0")
  }
  if (
    cfg.maxEvaluations !== undefined &&
    (cfg.maxEvaluations < 0 || !Number.isFinite(cfg.maxEvaluations))
  ) {
    throw new ConfigError("maxEvaluations must be a finite number >= 0")
  }
  if (cfg.stall !== undefined && (cfg.stall < 0 || !Number.isInteger(cfg.stall))) {
    throw new ConfigError("stall must be a non-negative integer")
  }
  if (
    cfg.targetFitness !== undefined &&
    (!Number.isFinite(cfg.targetFitness) && cfg.targetFitness !== Infinity)
  ) {
    throw new ConfigError("targetFitness must be a finite number or Infinity")
  }
}

export function validateProblem<T>(problem: GPProblem<T>): void {
  if (!problem.fitness) {
    throw new ProblemError("Problem must have a fitness function")
  }
  if (!problem.createRandom) {
    throw new ProblemError("Problem must have a createRandom function")
  }
  if (!problem.crossover) {
    throw new ProblemError("Problem must have a crossover function")
  }
  if (!problem.mutate) {
    throw new ProblemError("Problem must have a mutate function")
  }
}
