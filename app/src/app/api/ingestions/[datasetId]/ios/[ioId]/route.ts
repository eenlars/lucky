import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { loadDatasetMeta, saveDatasetMeta } from "../../../_lib/meta"

export async function PUT(req: NextRequest, { params }: { params: { datasetId: string; ioId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const patch = (await req.json()) as Partial<{
      input: unknown
      expected: unknown
    }>
    const meta = await loadDatasetMeta(params.datasetId)
    const idx = (meta.ios || []).findIndex((x) => x.id === params.ioId)
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const cur = meta.ios[idx]
    const next = {
      ...cur,
      input: typeof patch.input === "string" ? patch.input : cur.input,
      expected: typeof patch.expected === "string" ? patch.expected : cur.expected,
    }
    meta.ios[idx] = next
    await saveDatasetMeta(meta)
    return NextResponse.json(next)
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { datasetId: string; ioId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const meta = await loadDatasetMeta(params.datasetId)
    const before = (meta.ios || []).length
    meta.ios = (meta.ios || []).filter((x) => x.id !== params.ioId)
    if (meta.ios.length === before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
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
