import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { loadDatasetMeta, saveDatasetMeta } from "../../_lib/meta"
import type { EvaluationConfig } from "../../_lib/types"

export async function PUT(req: NextRequest, { params }: { params: { datasetId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const body = (await req.json()) as Partial<EvaluationConfig> | null
    if (!body || !body.type) {
      return NextResponse.json({ error: "Missing evaluation type" }, { status: 400 })
    }
    const meta = await loadDatasetMeta(params.datasetId)
    meta.evaluation = {
      type: body.type as EvaluationConfig["type"],
      inputField: body.inputField ?? meta.evaluation?.inputField,
      params: body.params ?? meta.evaluation?.params,
    }
    await saveDatasetMeta(meta)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
