# Architecture Overview

`lite-gp` is a minimal, zero-dependency GA/GP engine designed for clarity, determinism, and extensibility.

## Core Principles

- Deterministic by default: seeded Mulberry32 RNG drives all randomness.
- Pure and synchronous: no async in the core loop.
- Safety-first: robust validation and guarded fitness evaluation.
- Extensible: custom selection (`Selector<T>`), hooks, and problem-specific strategies.

## Key Modules

- `src/types.ts` – Public types and config/result shapes.
- `src/core/engine.ts` – GA/GP loop implementation with selection, breeding, budgets, and metrics.
- `src/core/selection.ts` – Selection operators (e.g., `tournament`).
- `src/lib/rng.ts` – RNG (`mulberry32`).
- `src/lib/format.ts` – `formatResult` helper for human-readable summaries.
- `src/lib/estimate.ts` – Generic time/cost estimator using evaluation counts.
- `src/lib/config.ts` – Shared default normalization (single source of truth).
- `src/lib/errors.ts` – Error types and validation helpers.
- `src/index.ts` – Public export surface.

## Data Flow

1. Initialize population via `problem.createRandom` and guarded `fitness`.
2. Rank population, compute stats, and fire generation hooks.
3. Early-stop checks (target, time, evaluations, stall).
4. Breed next generation via selection → crossover/mutation → evaluation.
5. Inject immigrants, loop until budget or generation limit.

## Budgets

- `maxEvaluations` – hard cap on total fitness evaluations.
- `maxWallMs`/`timeLimitMs` – wall-clock time budget.
- Engine stops immediately after init if `maxEvaluations` is already exhausted.

## Error Handling

- Non-finite or throwing fitness → counted as invalid and mapped to `-Infinity`.
- Optional `isValid` / `repair` hooks for domain-specific validation.

## Selection

- Built-in `tournament(k)` with sampling-with-replacement.
- Users can supply any `Selector<T>` to model different pressures.
