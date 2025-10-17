import { loadDatasetMeta, saveDatasetMeta } from "@/app/api/ingestions/_lib/meta"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: { datasetId: string } }) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

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
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 })
  }
}
