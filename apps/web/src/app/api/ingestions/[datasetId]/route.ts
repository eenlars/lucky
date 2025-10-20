import { getDataSet, getDatasetRecords } from "@/lib/db/dataset"
import { logException } from "@/lib/error-logger"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { loadDatasetMeta } from "../_lib/meta"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ datasetId: string }> }) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  try {
    const { datasetId } = await params
    // First try database
    try {
      const dataset = await getDataSet(datasetId)
      if (dataset) {
        const records = await getDatasetRecords(datasetId)
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
    const meta = await loadDatasetMeta(datasetId)
    return NextResponse.json(meta)
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    logException(e, {
      location: "/api/ingestions/[datasetId]",
    })
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
