import { NextRequest, NextResponse } from "next/server"
import { loadDatasetMeta, saveDatasetMeta } from "../../_lib/meta"

export async function PUT(
  req: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { goal } = (await req.json()) as { goal?: unknown }
    if (typeof goal !== "string") {
      return NextResponse.json({ error: "Invalid goal" }, { status: 400 })
    }
    const meta = await loadDatasetMeta(params.datasetId)
    meta.goal = goal
    await saveDatasetMeta(meta)
    return NextResponse.json({ success: true })
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
