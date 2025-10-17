// app/api/evolution-run/[run_id]/route.ts
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ run_id: string }> }) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createClient()
  const { run_id } = await params

  const { data: run, error: runErr } = await supabase.from("EvolutionRun").select("*").eq("run_id", run_id).single()

  if (runErr || !run) {
    return NextResponse.json({ error: runErr?.message ?? `Run ${run_id} not found` }, { status: 404 })
  }

  // Keep payload minimal; generations are fetched via a separate endpoint
  return NextResponse.json(run)
}
