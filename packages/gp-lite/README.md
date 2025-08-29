# lite-gp

[![CI](https://github.com/eenlars/lite-gp/actions/workflows/lite-gp-ci.yml/badge.svg)](https://github.com/eenlars/lite-gp/actions/workflows/lite-gp-ci.yml)
[![npm](https://img.shields.io/npm/v/lite-gp.svg)](https://www.npmjs.com/package/lite-gp)
[![license](https://img.shields.io/npm/l/lite-gp.svg)](./LICENSE)
[![types](https://img.shields.io/badge/types-TS-blue)](#)
[![size](https://img.shields.io/bundlephobia/minzip/lite-gp)](https://bundlephobia.com/package/lite-gp)

Tiny, zero-dependency Genetic Algorithms / Genetic Programming engine for TypeScript/JS.

Small, fast, fully-typed, and framework-agnostic. Works in Node and modern bundlers.

## Install

```bash
npm i lite-gp
# or
pnpm add lite-gp
# or
bun add lite-gp
```

## Quick start

```ts
import { LiteGP, type GPProblem, mulberry32 } from "lite-gp"

// Simple bitstring maximization (OneMax)
type BitString = boolean[]

const OneMax: GPProblem<BitString> = {
  createRandom: (rng) => Array.from({ length: 64 }, () => rng.next() < 0.5),
  fitness: (g) => g.filter(Boolean).length,
  mutate: (g, rng) => {
    const i = rng.int(g.length)
    const c = g.slice()
    c[i] = !c[i]
    return c
  },
  crossover: (a, b, rng) => {
    const cut = rng.int(a.length)
    return [[...a.slice(0, cut), ...b.slice(cut)], [...b.slice(0, cut), ...a.slice(cut)]]
  },
}

const gp = new LiteGP(OneMax, {
  popSize: 100,
  generations: 200,
  rng: mulberry32(42), // deterministic
})

const res = gp.run(({ gen, best, mean }) => {
  if (gen % 10 === 0) console.log(gen, best.toFixed(2), mean.toFixed(2))
})

console.log("Best:", res.bestFitness)
```

That’s it — you described your problem, and LiteGP handled selection, breeding, mutation, immigrants, budgets, and early-stopping for you.

## Highlights

- Minimal, composable API: `LiteGP<T>(problem, config)`
- Deterministic by default: tiny seeded RNG `mulberry32(seed?)`
- Strong types across the surface
- Budget-aware: `maxEvaluations`, `maxWallMs`/`timeLimitMs`
- Observability: generation callback, lifecycle hooks, metrics, `formatResult`
- Generic estimator: project time/cost before running

## 5‑Minute Tour

1) Define a problem (your genome and operators).
2) Construct `LiteGP(problem, config)`.
3) Call `run(onGen?)` to evolve and optionally observe progress.
4) Read `result` for best fitness, history, stop reason, and metrics.

Design guarantees:
- Deterministic when seeded (`mulberry32(seed)`), testable, and side-effect free in the core loop.
- No runtime dependencies. Ships both ESM and CJS with full TypeScript types.
- Budget-aware (evaluations and wall-clock) with clear stop reasons.

## Configuration

- popSize: number of individuals (default 100)
- generations: max generations (default 1000)
- elite: preserved top individuals each generation (default ~2%)
- cxProb: crossover probability (0..1, default 0.8)
- mutProb: mutation probability (0..1, default 0.1)
- immigration: fraction of new random individuals per gen (0..1, default 0.02)
- tournament: tournament size for selection (default 3)
- stall: early-stop window for no improvement (default 50)
- targetFitness: stop when best >= target (default Infinity)
- maxWallMs: wall-clock budget ms (preferred)
- timeLimitMs: deprecated alias of `maxWallMs` (back-compat)
- maxEvaluations: evaluation budget
- rng: custom RNG
- selector: custom parent selection
- hooks: lifecycle hooks (`onGenerationStart`, `onGenerationEnd`)
- Budgets: `maxEvaluations` and `maxWallMs` (alias: `timeLimitMs`).

See `src/types.ts` for full type docs.

### Selection strategies

- Built-in: `tournament(size = 3)` with sampling-with-replacement.
- Custom: Provide a `Selector<T>` to implement roulette, rank-based, etc.

### Determinism and RNG

- All randomness flows through the provided RNG (`RNG` interface).
- Use `mulberry32(seed)` for reproducible runs.

## Result visibility

`gp.run()` returns a `GPResult<T>` with core fields and optional visibility helpers:

- best: best genome from the final population
- bestFitness: best fitness found
- generations: number of generations executed
- history: best fitness per generation
- meanHistory (optional): mean fitness per generation
- invalidHistory (optional): count of `-Infinity` individuals per generation
- validShareHistory (optional): fraction of finite individuals per generation
- stopReason: one of `"target" | "stall" | "time" | "evaluations" | "generations"`
- metrics (optional): aggregated counters for deeper insight
  - evaluations, invalidEvaluations, repaired, repairFailures
  - fitnessErrors, nonFiniteFitness
  - mutations, crossovers, selections, immigrants, elitesPerGen
  - config snapshot (popSize, generations, cxProb, mutProb, immigration, tournament, stall, targetFitness, maxWallMs, maxEvaluations)

These extras help debug problem definitions (e.g., frequent invalid genomes), tune probabilities, and understand why a run stopped (see `stopReason`).

## Recipes

- Maximize sum of bits (OneMax)
- Evolve short strings to target
- Route planning toy (TSP-lite): use negative distance as fitness

See runnable examples in `packages/lite-gp/examples`.

### Pretty-printing results

```ts
import { formatResult } from "lite-gp"

const res = gp.run()
console.log(formatResult(res))
```

### Per-generation callback

`run(onGen?)` accepts an optional generation callback. It now receives extended stats as a second, optional argument:

```ts
gp.run((ctx, extra) => {
  const { gen, best, mean } = ctx
  const { invalidCount = 0, validShare = 0 } = extra ?? {}
  // ...log or visualize
})
```

### Lifecycle hooks (start/end of each generation)

Keep saving/notification logic outside the engine via lightweight hooks in config:

```ts
const gp = new LiteGP(problem, {
  hooks: {
    onGenerationStart: ({ gen, elapsedMs }) => {
      // user-defined: e.g., notify started gen
    },
    onGenerationEnd: ({ gen, best, mean, invalidCount, bestGenome, elapsedMs }) => {
      // user-defined: e.g., persist gen summary
    },
  },
})
```

## Budgets

- `maxEvaluations`: stops the run once the total number of fitness evaluations reaches this value.
- `maxWallMs`: wall-clock budget in milliseconds. Equivalent to (deprecated) `timeLimitMs`.

On budget stop, `result.stopReason` is `"evaluations"` or `"time"`.

## Estimator

## Estimating Cost/Time (generic)

Project the probable cost and duration of a run before you start it. The estimator stays generic by counting fitness evaluations and letting you plug in your own unit costs.

```ts
import { estimateRun } from "lite-gp"

const estimate = estimateRun(
  { popSize: 100, generations: 200 },
  { units: { perEvaluationMs: 2.5, perEvaluationCost: 0.0002 } }
)

console.log(estimate.evaluations) // { init, perGen, plannedTotal, expectedTotal }
console.log(estimate.timeMs)      // totals in ms (if perEvaluationMs provided)
console.log(estimate.monetary)    // totals (if perEvaluationCost provided)
console.log(estimate.operations)  // selections, expected crossovers/mutations, etc.
```

Compute realized cost post‑hoc from a finished run:

```ts
import { estimateFromMetrics } from "lite-gp"
const realized = estimateFromMetrics(result.metrics!, {
  perEvaluationMs: 2.5,
  perEvaluationCost: 0.0002,
})

## CLI

Estimate time/cost from a JSON config or flags:

```bash
# From a JSON file (shape: { config: GPConfig, units?: CostModel, expectedGenerations?: number })
lite-gp-estimate --config run.json

# With flags only
lite-gp-estimate --popSize 100 --generations 200 \
  --perEvaluationMs 2.5 --perEvaluationCost 0.0002 --json
```

Flags include: `--popSize`, `--generations`, `--elite`, `--cxProb`, `--mutProb`, `--immigration`, `--tournament`, `--stall`, `--targetFitness`, `--maxWallMs`, `--maxEvaluations`, `--expectedGenerations`, and units `--perEvaluationMs`, `--perGenerationOverheadMs`, `--perRunOverheadMs`, `--perEvaluationCost`. Add `--json` to print machine-readable output.

Example JSON lives in `packages/lite-gp/examples/run.json`.

Sample output (text mode):

```
lite-gp estimate

Evaluations:
  init=100 perGen=98 planned=20600 expected=14800
Time (ms):
  init=260 perGen=246 planned=247,? expected=??
Monetary:
  perEval=0.0002 planned=4.12 expected=2.96
Operations (per gen):
  selections=48 pairs=49 crossovers~= 39.20 mutations~= 9.80
Notes:
  - Estimates assume no early stop (target/stall/time/evaluations).
  - Per-generation evaluations equal popSize - elite by construction.
  - Crossovers are counted per parent-pair; mutations per child genome.
```

## Performance tips

- Keep genomes small and fitness pure (no I/O) for speed.
- Avoid allocations in `mutate`/`crossover` where possible.
- Tune `tournament`, `cxProb`, `mutProb` to balance exploration vs. exploitation.

## Troubleshooting

- Many `-Infinity` individuals? Validate/repair genomes or guard fitness.
- Early `time` stop? Increase `maxWallMs` or reduce population/generations.
- Non-deterministic runs? Ensure a seeded RNG is provided everywhere.

## Versioning

Follows SemVer. See `CHANGELOG.md` for notable changes.

## Contributing / Security / Conduct

See `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.

## License

MIT © Authors
```
