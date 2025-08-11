import { NextRequest, NextResponse } from "next/server"
import { loadDatasetMeta } from "../_lib/meta"

export async function GET(
  _req: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const meta = await loadDatasetMeta(params.datasetId)
    return NextResponse.json(meta)
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    )
  }
}
