#!/usr/bin/env bun

import { supabase } from "@core/utils/clients/supabase/client"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

type EvolutionRunRow = {
  run_id: string
  config?: unknown
}

type InvocationRow = {
  run_id: string | null
}

function configMatchesAnnotatedFull(config: unknown): boolean {
  if (config == null) return false
  try {
    const text = typeof config === "string" ? config : JSON.stringify(config, null, 0)
    return text.toLowerCase().includes("annotated-full")
  } catch {
    return false
  }
}

function formatTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-` +
    `${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  )
}

async function main() {
  const baseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "")

  const projectRoot = join(__dirname, "..")
  const reportsDir = join(projectRoot, "reports")

  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true })
  }

  console.log("Listing EvolutionRun rows with config containing 'annotated-full'\n")

  const { data: runs, error: runsError } = await supabase
    .from("EvolutionRun")
    .select("run_id, config")
    .order("start_time", { ascending: false })

  if (runsError) {
    throw new Error(`Failed to fetch EvolutionRun rows: ${runsError.message}`)
  }

  const matchingRuns: EvolutionRunRow[] = (runs || []).filter((r) => configMatchesAnnotatedFull(r.config))

  if (matchingRuns.length === 0) {
    console.log("No EvolutionRun rows matched 'annotated-full'.")
    return
  }

  const runIds = matchingRuns.map((r) => r.run_id)

  console.log(`Found ${runIds.length} matching runs. Counting invocations...`)

  const { data: invocations, error: invError } = await supabase
    .from("WorkflowInvocation")
    .select("run_id")
    .in("run_id", runIds)

  if (invError) {
    throw new Error(`Failed to fetch WorkflowInvocation rows: ${invError.message}`)
  }

  const counts = new Map<string, number>()
  for (const id of runIds) counts.set(id, 0)
  for (const row of (invocations || []) as InvocationRow[]) {
    const id = row.run_id || undefined
    if (id && counts.has(id)) counts.set(id, (counts.get(id) || 0) + 1)
  }

  const ranked = matchingRuns
    .map((r) => ({ run_id: r.run_id, count: counts.get(r.run_id) || 0 }))
    .sort((a, b) => b.count - a.count)

  const now = new Date()
  const filename = `annotated-full-runs-${formatTimestampForFilename(now)}.md`
  const outPath = join(reportsDir, filename)

  const lines: string[] = []
  lines.push("# Annotated-full Evolution Runs")
  lines.push("")
  lines.push(`Generated: ${now.toISOString()}`)
  lines.push(`Base URL: ${baseUrl}`)
  lines.push("")
  lines.push(`Total matching runs: ${ranked.length}`)
  lines.push("")
  lines.push("| Rank | Run ID | Link | Invocations |")
  lines.push("| ---: | :----- | :--- | ----------: |")

  ranked.forEach((r, idx) => {
    const link = `${baseUrl}/evolution/${encodeURIComponent(r.run_id)}`
    lines.push(`| ${idx + 1} | ${r.run_id} | [${link}](${link}) | ${r.count} |`)
  })

  writeFileSync(outPath, lines.join("\n"))
  console.log(`\nReport written to: ${outPath}`)
}

main().catch((err) => {
  console.error("\nFailed to list annotated-full runs:\n", err)
  process.exitCode = 1
})
