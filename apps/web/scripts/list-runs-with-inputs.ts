#!/usr/bin/env bun

import { supabase } from "@core/utils/clients/supabase/client"
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"

type EvolutionRunRow = {
  run_id: string
  config?: unknown
  start_time?: string | null
}

type InvocationRow = {
  run_id: string | null
}

function safeParseConfig(config: unknown): unknown {
  if (typeof config === "string") {
    try {
      return JSON.parse(config)
    } catch {
      return config
    }
  }
  return config
}

function findInputFile(value: unknown): string | null {
  const visited = new Set<unknown>()
  function walk(v: unknown): string | null {
    if (v == null) return null
    if (visited.has(v)) return null
    visited.add(v)

    if (typeof v === "string") {
      // Heuristic: return the string if it looks like a URL or CSV path
      if (/^https?:\/\//i.test(v) || v.endsWith(".csv")) return v
      return null
    }
    if (Array.isArray(v)) {
      for (const item of v) {
        const res = walk(item)
        if (res) return res
      }
      return null
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const key = k.toLowerCase()
        if (key === "inputfile" || key === "input_file" || key === "input") {
          // Direct hit
          const asStr = typeof val === "string" ? val : null
          if (asStr) return asStr
          const nested = walk(val)
          if (nested) return nested
        }
      }
      // No direct key match; still search nested values
      for (const val of Object.values(v as Record<string, unknown>)) {
        const res = walk(val)
        if (res) return res
      }
    }
    return null
  }
  return walk(value)
}

function formatMonthDay(date: Date | null): string {
  if (!date) return "-"
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" })
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
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true })

  console.log("Listing all EvolutionRun rows, counting invocations, and extracting inputFile from config\n")

  const { data: runs, error: runsError } = await supabase
    .from("EvolutionRun")
    .select("run_id, config, start_time")
    .order("start_time", { ascending: false })

  if (runsError) throw new Error(`Failed to fetch EvolutionRun rows: ${runsError.message}`)

  const allRuns: EvolutionRunRow[] = runs || []
  if (allRuns.length === 0) {
    console.log("No EvolutionRun rows found.")
    return
  }

  const runIds = allRuns.map(r => r.run_id)

  const { data: invocations, error: invError } = await supabase
    .from("WorkflowInvocation")
    .select("run_id")
    .in("run_id", runIds)

  if (invError) throw new Error(`Failed to fetch WorkflowInvocation rows: ${invError.message}`)

  const counts = new Map<string, number>()
  for (const id of runIds) counts.set(id, 0)
  for (const row of (invocations || []) as InvocationRow[]) {
    const id = row.run_id || undefined
    if (id && counts.has(id)) counts.set(id, (counts.get(id) || 0) + 1)
  }

  const withMeta = allRuns.map(r => {
    const cfg = safeParseConfig(r.config)
    const inputFile = findInputFile(cfg)
    const start = r.start_time ? new Date(r.start_time) : null
    return {
      run_id: r.run_id,
      count: counts.get(r.run_id) || 0,
      inputFile: inputFile || "-",
      date: formatMonthDay(start),
    }
  })

  const ranked = withMeta.sort((a, b) => b.count - a.count)

  const now = new Date()
  const filename = `all-runs-with-inputs-${formatTimestampForFilename(now)}.md`
  const outPath = join(reportsDir, filename)

  const lines: string[] = []
  lines.push("# Evolution Runs (All)")
  lines.push("")
  lines.push(`Generated: ${now.toISOString()}`)
  lines.push(`Base URL: ${baseUrl}`)
  lines.push("")
  lines.push(`Total runs: ${ranked.length}`)
  lines.push("")
  lines.push("| Rank | Run ID | Link | Invocations | Input File | Date |")
  lines.push("| ---: | :----- | :--- | ----------: | :--------- | :--- |")

  ranked.forEach((r, idx) => {
    const link = `${baseUrl}/evolution/${encodeURIComponent(r.run_id)}`
    const input = r.inputFile.replace(/\|/g, "\\|") // escape pipes for table
    lines.push(`| ${idx + 1} | ${r.run_id} | [${link}](${link}) | ${r.count} | ${input} | ${r.date} |`)
  })

  writeFileSync(outPath, lines.join("\n"))
  console.log(`\nReport written to: ${outPath}`)
}

main().catch(err => {
  console.error("\nFailed to list all runs with inputs:\n", err)
  process.exitCode = 1
})
