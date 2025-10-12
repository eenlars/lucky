import { requireAuth } from "@/lib/api-auth"
import { getDataSet, getDatasetRecords } from "@/lib/db/dataset"
import { logException } from "@/lib/error-logger"
import { type NextRequest, NextResponse } from "next/server"
import { loadDatasetMeta } from "../_lib/meta"

export async function GET(_req: NextRequest, { params }: { params: { datasetId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    // First try database
    try {
      const dataset = await getDataSet(params.datasetId)
      if (dataset) {
        const records = await getDatasetRecords(params.datasetId)
        return NextResponse.json({
          datasetId: dataset.dataset_id,
          name: dataset.name,
          description: dataset.description,
          data_format: dataset.data_format,
          createdAt: dataset.created_at,
          records: records,
        })
      }
    } catch (dbError) {
      console.error("Database query failed, falling back to storage:", dbError)
    }

    // Fallback to storage
    const meta = await loadDatasetMeta(params.datasetId)
    return NextResponse.json(meta)
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    logException(e, {
      location: "/api/ingestions/[datasetId]",
      env: process.env.NODE_ENV === "production" ? "production" : "development",
    })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
