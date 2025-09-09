import {
  getLatestFileByPrefix,
  publicExperimentDir,
} from "@/lib/experiments/file-utils"
import type { ToolCapacityResponse } from "@experiments/tool-real/experiments/01-capacity-limits/main-experiment"
import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

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

async function getLatestFile(baseDir: string, prefix: string) {
  return getLatestFileByPrefix(baseDir, prefix)
}

export async function GET() {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const resultsDir = publicExperimentDir("01-capacity-limits")

    const analysisPath = await getLatestFile(
      resultsDir,
      "tool-capacity-analysis"
    )

    const resultsPath = await getLatestFile(resultsDir, "tool-capacity-results")

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
