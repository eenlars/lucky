import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import path from "path"
import { z } from "zod"

const RawResultSchema = z.object({
  model: z.string(),
  chain: z.string(),
  validation: z
    .object({
      score: z.coerce.number().optional(),
    })
    .optional(),
})
type RawResult = z.infer<typeof RawResultSchema>

export async function GET() {
  try {
    // Try known locations (prefer the tool-real experiment path)
    const candidateRelativePaths = [
      // When cwd is app package root
      "public/research-experiments/tool-real/experiments/02-sequential-chains/sequential-results.json",
      "public/research-experiments/sequential-results.json",
      // When cwd is monorepo root
      "app/public/research-experiments/tool-real/experiments/02-sequential-chains/sequential-results.json",
      "app/public/research-experiments/sequential-results.json",
    ] as const

    let chosenPath: string | null = null
    for (const rel of candidateRelativePaths) {
      const abs = path.resolve(process.cwd(), rel)
      try {
        await fs.access(abs)
        chosenPath = abs
        break
      } catch {
        // continue
      }
    }
    const latestResultsPath = chosenPath
      ? chosenPath
      : path.resolve(
          process.cwd(),
          candidateRelativePaths[0] // default to primary expected location
        )

    let results: RawResult[] = []
    try {
      const raw = await fs.readFile(latestResultsPath, "utf-8")
      const parsedJson = JSON.parse(raw)
      const validation = RawResultSchema.array().safeParse(parsedJson)
      if (!validation.success) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid sequential results format",
            details: validation.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 }
        )
      }
      results = validation.data
    } catch {
      results = []
    }

    return NextResponse.json({
      ok: true,
      results,
      analysis: null,
      summary: null,
      files: { results: latestResultsPath },
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
