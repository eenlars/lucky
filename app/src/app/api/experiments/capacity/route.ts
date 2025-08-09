import type { ToolCapacityResponse } from "@/research-experiments/tool-real/experiments/01-capacity-limits/main-experiment"
import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import path from "path"

type ToolCountPerf = {
  toolCount: number
  accuracy: number
  averageLatency: number
  totalRuns: number
}
type ModelPerf = {
  model: string
  accuracy: number
  averageLatency: number
  totalRuns: number
}

export type ToolCapacityExperimentResponse = {
  ok: boolean
  analysis: {
    toolCountPerformance: ToolCountPerf[]
    modelPerformance: ModelPerf[]
  } | null
  results: ToolCapacityResponse | null
  files: {
    analysis: string | null
    results: string | null
  }
}

const isToolCapacityExperimentResponse = (
  response: unknown
): response is ToolCapacityExperimentResponse => {
  return (
    response !== null &&
    typeof response === "object" &&
    "ok" in response &&
    typeof response.ok === "boolean" &&
    "analysis" in response &&
    typeof response.analysis === "object" &&
    "results" in response &&
    typeof response.results === "object" &&
    "files" in response &&
    typeof response.files === "object"
  )
}

async function getLatestFile(baseDir: string, prefix: string) {
  try {
    const entries = await fs.readdir(baseDir)
    const candidates = entries
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .map((f) => path.join(baseDir, f))
    if (candidates.length === 0) return null
    const stats = await Promise.all(
      candidates.map(async (p) => {
        try {
          const s = await fs.stat(p)
          return { filePath: p, mtimeMs: s.mtimeMs }
        } catch {
          return { filePath: p, mtimeMs: 0 }
        }
      })
    )
    stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return stats[0]?.filePath ?? null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const resultsDir = path.resolve(
      process.cwd(),
      "public/research-experiments/tool-real/experiments/01-capacity-limits"
    )

    let analysisPath = await getLatestFile(resultsDir, "tool-capacity-analysis")
    if (!analysisPath) {
      const exact = path.join(resultsDir, "tool-capacity-analysis.json")
      try {
        await fs.access(exact)
        analysisPath = exact
      } catch {}
    }

    let resultsPath = await getLatestFile(resultsDir, "tool-capacity-results")
    if (!resultsPath) {
      const exact = path.join(resultsDir, "tool-capacity-results.json")
      try {
        await fs.access(exact)
        resultsPath = exact
      } catch {}
    }

    if (!analysisPath && !resultsPath) {
      return NextResponse.json(
        { ok: false, error: "No capacity results found" },
        { status: 404 }
      )
    }

    const analysis = analysisPath
      ? (JSON.parse(await fs.readFile(analysisPath, "utf-8")) as {
          toolCountPerformance: ToolCountPerf[]
          modelPerformance: ModelPerf[]
        })
      : null

    const results = resultsPath
      ? JSON.parse(await fs.readFile(resultsPath, "utf-8"))
      : null

    return NextResponse.json<ToolCapacityExperimentResponse>({
      ok: true,
      analysis,
      results,
      files: { analysis: analysisPath, results: resultsPath },
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
