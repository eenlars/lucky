// app/api/evolution-run/[run_id]/route.ts
import { supabase } from "@core/utils/clients/supabase/client"
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ run_id: string }> }) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  const { run_id } = await params

  const { data: run, error: runErr } = await supabase.from("EvolutionRun").select("*").eq("run_id", run_id).single()

  if (runErr || !run) {
    return NextResponse.json({ error: runErr?.message ?? `Run ${run_id} not found` }, { status: 404 })
  }

  // Keep payload minimal; generations are fetched via a separate endpoint
  return NextResponse.json(run)
}
