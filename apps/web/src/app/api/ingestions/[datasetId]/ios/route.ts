import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import { loadDatasetMeta, saveDatasetMeta } from "@/app/api/ingestions/_lib/meta"
import type { WorkflowIO } from "@/app/api/ingestions/_lib/types"

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return "io_" + Math.random().toString(36).slice(2)
}

export async function GET(_req: NextRequest, { params }: { params: { datasetId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const meta = await loadDatasetMeta(params.datasetId)
    return NextResponse.json(meta.ios ?? [])
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { datasetId: string } }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const { input, expected } = (await req.json()) as {
      input?: unknown
      expected?: unknown
    }
    if (typeof input !== "string" || typeof expected !== "string") {
      return NextResponse.json({ error: "Invalid input/expected" }, { status: 400 })
    }
    const meta = await loadDatasetMeta(params.datasetId)
    const io: WorkflowIO = { id: uuid(), input, expected }
    meta.ios = Array.isArray(meta.ios) ? meta.ios : []
    meta.ios.push(io)
    await saveDatasetMeta(meta)
    return NextResponse.json(io, { status: 201 })
  } catch (e: any) {
    if (e?.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Dataset not found" }, { status: 404 })
    }
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
