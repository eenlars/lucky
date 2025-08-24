/*
  Inspect an evolution run's generations and invocations via the app's API.

  Usage examples:
  - bun scripts/inspect-evolution-run.ts
  - bun scripts/inspect-evolution-run.ts --run=evo_run_fe8ec7
  - APP_BASE_URL=http://localhost:3000 bun scripts/inspect-evolution-run.ts --run=evo_run_fe8ec7
*/

type EvolutionRun = {
  run_id: string
  goal_text?: string | null
  status?: string | null
  start_time?: string | null
  end_time?: string | null
  config?: unknown
  notes?: string | null
  [key: string]: unknown
}

type WorkflowInvocationSubset = {
  wf_invocation_id: string
  wf_version_id: string | null
  start_time: string | null
  end_time: string | null
  status: string | null
  usd_cost: number | null
  fitness_score: number | null
  accuracy: number | null
  run_id: string
  generation_id: string | null
}

type GenerationRecord = {
  generation_id: string
  run_id: string
  number: number
  [key: string]: unknown
}

type GenerationBundle = {
  generation: GenerationRecord
  versions: Array<Record<string, unknown>>
  invocations: WorkflowInvocationSubset[]
}

function getCliArg(name: string): string | undefined {
  const prefix = `--${name}=`
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length)
  }
  return undefined
}

function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "-"
  const seconds = Math.floor(ms / 1000)
  const s = seconds % 60
  const minutes = Math.floor(seconds / 60)
  const m = minutes % 60
  const hours = Math.floor(minutes / 60)
  const parts: string[] = []
  if (hours) parts.push(`${hours}h`)
  if (m || hours) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(" ")
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function inferRunMode(run: EvolutionRun): "cultural" | "gp" | "unknown" {
  let cfg: any = run.config
  if (typeof cfg === "string") {
    try {
      cfg = JSON.parse(cfg)
    } catch {
      cfg = undefined
    }
  }
  const mode: string | undefined = cfg?.mode
  if (typeof mode === "string") {
    const m = mode.toLowerCase()
    if (m === "iterative" || m === "cultural") return "cultural"
    if (m === "gp") return "gp"
  }
  if (cfg && typeof cfg === "object") {
    const hasGPKeys =
      typeof (cfg as any).generations === "number" &&
      typeof (cfg as any).populationSize === "number"
    const hasIterKeys = typeof (cfg as any).iterations === "number"
    if (hasGPKeys) return "gp"
    if (hasIterKeys) return "cultural"
  }
  const notes = run.notes?.toLowerCase() || ""
  if (notes.includes("iterative")) return "cultural"
  if (notes.includes(" gp")) return "gp"
  if (notes.includes("gp ")) return "gp"
  if (notes.includes("gp evolution")) return "gp"
  return "unknown"
}

function sum(numbers: Array<number | null | undefined>): number {
  let total = 0
  for (const value of numbers) {
    if (typeof value === "number" && !Number.isNaN(value)) {
      total += value
    }
  }
  return total
}

function average(numbers: Array<number | null | undefined>): number | null {
  const vals = numbers.filter(
    (n): n is number => typeof n === "number" && !Number.isNaN(n)
  )
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: "application/json" } })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Request failed ${res.status} ${res.statusText} for ${url}\n${text}`
    )
  }
  return (await res.json()) as T
}

async function main() {
  const defaultRunId = "evo_run_fe8ec7"
  const runId = getCliArg("run") || defaultRunId
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000"

  const runUrl = `${baseUrl}/api/evolution/${encodeURIComponent(runId)}`
  const gensUrl = `${baseUrl}/api/evolution/${encodeURIComponent(runId)}/generations`

  console.log(`Inspecting evolution run: ${runId}`)
  console.log(`Base URL: ${baseUrl}`)
  console.log("")

  const run = await fetchJson<EvolutionRun>(runUrl)
  const bundles = await fetchJson<GenerationBundle[]>(gensUrl)

  const runStart = toDate(run.start_time)
  const runEnd = toDate(run.end_time)
  const runDuration =
    runStart && runEnd ? runEnd.getTime() - runStart.getTime() : null

  console.log("Run")
  console.log("- run_id:", run.run_id)
  console.log("- mode:", inferRunMode(run))
  if (run.goal_text) console.log("- goal:", run.goal_text)
  if (run.status) console.log("- status:", run.status)
  if (runStart) console.log("- start:", runStart.toISOString())
  if (runEnd) console.log("- end:", runEnd.toISOString())
  console.log("- duration:", formatDurationMs(runDuration))
  console.log("")

  // Per-generation details
  let totalInvocations = 0
  let totalCost = 0
  const allAccuracies: Array<number | null | undefined> = []
  const allFitness: Array<number | null | undefined> = []

  console.log(`Generations (${bundles.length})`)
  for (const bundle of bundles) {
    const gen = bundle.generation
    const invocations = bundle.invocations || []
    const statuses = new Map<string, number>()
    for (const inv of invocations) {
      const key = (inv.status || "unknown").toLowerCase()
      statuses.set(key, (statuses.get(key) || 0) + 1)
    }

    const genCost = sum(invocations.map((i) => i.usd_cost))
    const genAccAvg = average(invocations.map((i) => i.accuracy))
    const genFitAvg = average(invocations.map((i) => i.fitness_score))

    totalInvocations += invocations.length
    totalCost += genCost
    allAccuracies.push(...invocations.map((i) => i.accuracy))
    allFitness.push(...invocations.map((i) => i.fitness_score))

    const statusSummary =
      Array.from(statuses.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([s, c]) => `${s}:${c}`)
        .join(", ") || "-"

    console.log(`- Gen #${gen.number} (${gen.generation_id})`)
    console.log(`  versions: ${bundle.versions?.length ?? 0}`)
    console.log(`  invocations: ${invocations.length} [${statusSummary}]`)
    console.log(`  cost: $${genCost.toFixed(4)}`)
    console.log(
      `  accuracy(avg): ${genAccAvg == null ? "-" : genAccAvg.toFixed(4)}`
    )
    console.log(
      `  fitness(avg): ${genFitAvg == null ? "-" : genFitAvg.toFixed(4)}`
    )
  }

  console.log("")
  console.log("Overall")
  console.log("- generations:", bundles.length)
  console.log("- invocations:", totalInvocations)
  console.log("- total cost:", `$${totalCost.toFixed(4)}`)
  const overallAcc = average(allAccuracies)
  const overallFit = average(allFitness)
  console.log(
    "- accuracy(avg):",
    overallAcc == null ? "-" : overallAcc.toFixed(4)
  )
  console.log(
    "- fitness(avg):",
    overallFit == null ? "-" : overallFit.toFixed(4)
  )

  // WorkflowVersion uniqueness (from versions metadata per generation)
  const metaVersionIds: string[] = []
  const metaVersionIdToGenIds = new Map<string, Set<string>>()
  for (const bundle of bundles) {
    const genId = bundle.generation?.generation_id
    for (const v of bundle.versions || []) {
      const versionId = (v as any)?.wf_version_id as string | undefined
      if (!versionId) continue
      metaVersionIds.push(versionId)
      let s = metaVersionIdToGenIds.get(versionId)
      if (!s) {
        s = new Set<string>()
        metaVersionIdToGenIds.set(versionId, s)
      }
      if (genId) s.add(genId)
    }
  }
  const uniqueMetaVersions = new Set(metaVersionIds)
  const countsByMetaVersion = new Map<string, number>()
  for (const v of metaVersionIds) {
    countsByMetaVersion.set(v, (countsByMetaVersion.get(v) || 0) + 1)
  }
  const topMetaEntry = Array.from(countsByMetaVersion.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]
  const topMetaVersion = topMetaEntry?.[0]
  const topMetaCount = topMetaEntry?.[1] ?? 0
  const topMetaGenSpan = topMetaVersion
    ? (metaVersionIdToGenIds.get(topMetaVersion)?.size ?? 0)
    : 0

  console.log("")
  console.log("WorkflowVersion uniqueness (from versions)")
  if (metaVersionIds.length === 0) {
    console.log("- no versions present in metadata")
  } else {
    console.log(
      `- unique versions: ${uniqueMetaVersions.size} / ${metaVersionIds.length}`
    )
    if (uniqueMetaVersions.size === metaVersionIds.length) {
      console.log("- verdict: all versions are unique across generations")
    } else if (uniqueMetaVersions.size === 1) {
      console.log(
        "- verdict: a single WorkflowVersion was reused across generations"
      )
    } else {
      console.log("- verdict: mixed (some versions were reused)")
    }
    if (topMetaVersion) {
      console.log(
        `- top reused: ${topMetaVersion} appears ${topMetaCount} times across ${topMetaGenSpan} generations`
      )
    }
  }

  // WorkflowVersion uniqueness (by actual invocation usage)
  const allInvocationVersionIds: string[] = []
  const versionIdToGenIds = new Map<string, Set<string>>()
  for (const bundle of bundles) {
    const genId = bundle.generation?.generation_id
    for (const inv of bundle.invocations || []) {
      const v = inv.wf_version_id as unknown as string | undefined
      if (!v) continue
      allInvocationVersionIds.push(v)
      let s = versionIdToGenIds.get(v)
      if (!s) {
        s = new Set<string>()
        versionIdToGenIds.set(v, s)
      }
      if (genId) s.add(genId)
    }
  }

  const uniqueInvocationVersions = new Set(allInvocationVersionIds)
  const countsByVersion = new Map<string, number>()
  for (const v of allInvocationVersionIds) {
    countsByVersion.set(v, (countsByVersion.get(v) || 0) + 1)
  }
  const topVersionEntry = Array.from(countsByVersion.entries()).sort(
    (a, b) => b[1] - a[1]
  )[0]
  const topVersion = topVersionEntry?.[0]
  const topVersionCount = topVersionEntry?.[1] ?? 0
  const topVersionGenSpan = topVersion
    ? (versionIdToGenIds.get(topVersion)?.size ?? 0)
    : 0

  console.log("")
  console.log("WorkflowVersion uniqueness (by invocations)")
  console.log(
    `- unique versions: ${uniqueInvocationVersions.size} / ${allInvocationVersionIds.length}`
  )
  if (allInvocationVersionIds.length > 0) {
    if (uniqueInvocationVersions.size === allInvocationVersionIds.length) {
      console.log("- verdict: all invocations used unique WorkflowVersion IDs")
    } else if (uniqueInvocationVersions.size === 1) {
      console.log(
        `- verdict: single WorkflowVersion reused across all invocations (${topVersion})`
      )
    } else {
      console.log("- verdict: mixed (some WorkflowVersion IDs were reused)")
    }
    if (topVersion) {
      console.log(
        `- top reused: ${topVersion} used ${topVersionCount} times across ${topVersionGenSpan} generations`
      )
    }
  }

  console.log("")
  console.log(
    "Tip: pass a different run id with --run=... or set APP_BASE_URL to point elsewhere."
  )
}

main().catch((err) => {
  console.error("\nFailed to inspect evolution run:\n", err)
  process.exitCode = 1
})
