/*
  Backfill EvolutionRun.evolution_type with "iterative" or "gp".

  - iterative is the new word for cultural
  - Detection sources: EvolutionRun.config.mode, config fields, notes fallback

  Usage:
  - Dry run (default): bun scripts/backfill-evolution-type.ts --dry
  - Execute updates:   bun scripts/backfill-evolution-type.ts
  - Single run:        bun scripts/backfill-evolution-type.ts --run=evo_run_xxx
*/

import { supabase } from "@core/utils/clients/supabase/client"

type EvolutionRunRow = {
  run_id: string
  config?: unknown
  notes?: string | null
}

type EvolutionType = "iterative" | "gp" | "unknown"

function getCliArg(name: string): string | undefined {
  const prefix = `--${name}=`
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(prefix)) return arg.slice(prefix.length)
  }
  return undefined
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).some((a) => a === `--${name}`)
}

function inferEvolutionType(run: EvolutionRunRow): EvolutionType {
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
    if (m === "iterative" || m === "cultural") return "iterative"
    if (m === "gp") return "gp"
  }
  if (cfg && typeof cfg === "object") {
    const hasGPKeys = typeof (cfg as any).generations === "number" && typeof (cfg as any).populationSize === "number"
    const hasIterKeys = typeof (cfg as any).iterations === "number"
    if (hasGPKeys) return "gp"
    if (hasIterKeys) return "iterative"
  }
  const notes = run.notes?.toLowerCase() || ""
  if (notes.includes("iterative") || notes.includes("cultural")) return "iterative"
  if (notes.includes(" gp") || notes.includes("gp ") || notes.includes("gp evolution")) return "gp"
  return "unknown"
}

async function updateEvolutionType(runId: string, evolutionType: Exclude<EvolutionType, "unknown">) {
  // Cast to any to avoid type issues if local Database types haven't been updated with the new column yet
  const { error } = await supabase
    .from("EvolutionRun")
    .update({ evolution_type: evolutionType } as any)
    .eq("run_id", runId)

  if (error) {
    throw new Error(`Failed to update run ${runId}: ${error.message}`)
  }
}

async function main() {
  const onlyRun = getCliArg("run")
  const isDryRun = hasFlag("dry") || hasFlag("dry-run")

  console.log(`Backfilling evolution_type ${isDryRun ? "(dry run)" : ""}`)

  const query = supabase
    .from("EvolutionRun")
    .select("run_id, config, notes")
    .order("start_time", { ascending: false }) as unknown as {
    select: any
  }

  // Using any to avoid type mismatch due to schema drift
  const { data, error } = (await (query as any)) as {
    data: EvolutionRunRow[] | null
    error: { message: string } | null
  }

  if (error) {
    throw new Error(`Failed to list EvolutionRun: ${error.message}`)
  }

  const runs = (data ?? []).filter((r) => (onlyRun ? r.run_id === onlyRun : true))
  if (runs.length === 0) {
    console.log("No runs found")
    return
  }

  let updated = 0
  let skippedUnknown = 0

  for (const run of runs) {
    const inferred = inferEvolutionType(run)
    if (inferred === "unknown") {
      skippedUnknown++
      console.log(`- ${run.run_id}: unknown (skipped)`)
      continue
    }
    if (isDryRun) {
      console.log(`- ${run.run_id}: would set evolution_type=${inferred}`)
    } else {
      await updateEvolutionType(run.run_id, inferred)
      console.log(`- ${run.run_id}: set evolution_type=${inferred}`)
      updated++
    }
  }

  console.log("")
  console.log(`Processed: ${runs.length}`)
  if (!isDryRun) console.log(`Updated: ${updated}`)
  if (skippedUnknown > 0) console.log(`Skipped (unknown): ${skippedUnknown}`)
}

main().catch((err) => {
  console.error("\nBackfill failed:\n", err)
  process.exitCode = 1
})
