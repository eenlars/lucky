#!/usr/bin/env node
import { estimateRun } from "./lib/estimate"

type ArgMap = Record<string, string | true>

function parseArgs(argv: string[]): ArgMap {
  const out: ArgMap = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--")) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith("--")) {
        out[key] = next
        i++
      } else {
        out[key] = true
      }
    }
  }
  return out
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === true) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function showHelp() {
  const h = `gp-lite-estimate

Usage:
  gp-lite-estimate [--config path.json] [flags]

Config flags (override JSON when present):
  --popSize N                 --generations N           --elite N
  --cxProb F                  --mutProb F               --immigration F
  --tournament N              --stall N                 --targetFitness F
  --maxWallMs N               --maxEvaluations N        --expectedGenerations N

Units (generic):
  --perEvaluationMs F         --perGenerationOverheadMs F
  --perRunOverheadMs F        --perEvaluationCost F

Output:
  --json   print machine-readable JSON
  --help   show this help
`
  console.log(h)
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)
  if (args.help) return showHelp()

  let cfg: any = {}
  let units: any = {}
  let expectedGenerations: number | undefined

  if (args.config && typeof args.config === "string") {
    try {
      const fs = await import("node:fs/promises")
      const raw = await fs.readFile(args.config, "utf8")
      const json = JSON.parse(raw)
      cfg = json.config ?? json
      units = json.units ?? {}
      expectedGenerations = json.expectedGenerations ?? undefined
    } catch (e) {
      console.error(`Failed to read config: ${args.config}`, e)
      process.exit(2)
    }
  }

  // Apply flag overrides (numbers only when provided)
  const maybe = (k: string) => {
    const v = num(args[k])
    if (v !== undefined) cfg[k] = v
  }
  ;[
    "popSize",
    "generations",
    "elite",
    "cxProb",
    "mutProb",
    "immigration",
    "tournament",
    "stall",
    "targetFitness",
    "maxWallMs",
    "maxEvaluations",
  ].forEach(maybe)

  const maybeUnit = (k: string) => {
    const v = num(args[k])
    if (v !== undefined) units[k] = v
  }
  ;[
    "perEvaluationMs",
    "perGenerationOverheadMs",
    "perRunOverheadMs",
    "perEvaluationCost",
  ].forEach(maybeUnit)

  const eg = num(args.expectedGenerations)
  if (eg !== undefined) expectedGenerations = eg

  const est = estimateRun(cfg, { expectedGenerations, units })

  if (args.json) {
    console.log(JSON.stringify(est, null, 2))
    return
  }

  const lines: string[] = []
  lines.push("gp-lite estimate")
  lines.push("")
  lines.push("Evaluations:")
  lines.push(
    `  init=${est.evaluations.init} perGen=${est.evaluations.perGen} planned=${est.evaluations.plannedTotal} expected=${est.evaluations.expectedTotal}`
  )
  if (est.evaluations.cappedByMaxEvaluations !== undefined)
    lines.push(
      `  cappedByMaxEvaluations=${est.evaluations.cappedByMaxEvaluations}`
    )
  if (est.timeMs) {
    lines.push("Time (ms):")
    lines.push(
      `  init=${est.timeMs.init} perGen=${est.timeMs.perGen} planned=${est.timeMs.plannedTotal} expected=${est.timeMs.expectedTotal}`
    )
    if (est.timeMs.cappedByMaxWall !== undefined)
      lines.push(`  cappedByMaxWall=${est.timeMs.cappedByMaxWall}`)
  }
  if (est.monetary) {
    lines.push("Monetary:")
    lines.push(
      `  perEval=${est.monetary.perEval} planned=${est.monetary.plannedTotal} expected=${est.monetary.expectedTotal}`
    )
  }
  lines.push("Operations (per gen):")
  lines.push(
    `  selections=${est.operations.selectionsPerGen} pairs=${est.operations.pairsPerGen} crossovers~= ${est.operations.expectedCrossoversPerGen.toFixed(2)} mutations~= ${est.operations.expectedMutationsPerGen.toFixed(2)}`
  )
  if (est.notes.length) {
    lines.push("Notes:")
    est.notes.forEach((n) => lines.push(`  - ${n}`))
  }
  console.log(lines.join("\n"))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
