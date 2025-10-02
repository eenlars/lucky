import { requireAuth } from "@/lib/api-auth"
import { publicExperimentDir, readJsonLocal } from "@/lib/experiments/file-utils"
import { NextResponse } from "next/server"
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
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    // Single canonical local path under public
    const latestResultsPath = publicExperimentDir("02-sequential-chains", "sequential-results.json")

    let results: RawResult[] = []
    try {
      const parsedJson = await readJsonLocal<unknown>(latestResultsPath)
      const validation = RawResultSchema.array().safeParse(parsedJson)
      if (!validation.success) {
        return NextResponse.json(
          {
            ok: false,
            error: "Invalid sequential results format",
            details: validation.error.issues.map(i => ({
              path: i.path.join("."),
              message: i.message,
            })),
          },
          { status: 400 },
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
      { status: 500 },
    )
  }
}
