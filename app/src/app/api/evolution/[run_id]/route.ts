// app/api/evolution-run/[run_id]/route.ts
import { supabase } from "@/core/utils/clients/supabase/client"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ run_id: string }> }
) {
  const { run_id } = await params

  const { data: run, error: runErr } = await supabase
    .from("EvolutionRun")
    .select("*")
    .eq("run_id", run_id)
    .single()

  if (runErr || !run) {
    return NextResponse.json(
      { error: runErr?.message ?? `Run ${run_id} not found` },
      { status: 404 }
    )
  }

  const { data: generations, error: genErr } = await supabase
    .from("Generation")
    .select(
      `
      generation_id,
      number,
      comment,
      start_time,
      end_time,

      best_workflow_version:WorkflowVersion!fk_generation_best_wfv (
        wf_version_id,
        commit_message,
        operation,
        iteration_budget,
        created_at,
        updated_at,

        workflow:Workflow (
          wf_id,
          description,
          created_at,
          updated_at
        )
      ),

      workflow_invocations:WorkflowInvocation!fk_wfi_generation (
        wf_invocation_id,
        wf_version_id,
        start_time,
        end_time,
        status,
        usd_cost,
        fitness,
        metadata,
        extras,

        node_invocations:NodeInvocation (
          node_invocation_id,
          node_id,
          wf_version_id,
          status,
          start_time,
          end_time,
          usd_cost,
          summary,
          output,

          node_version:NodeVersion (
            version,
            llm_model,
            description,
            system_prompt,
            tools,
            created_at,
            updated_at
          ),

          messages:Message!Message_target_invocation_id_fkey (
            msg_id,
            role,
            seq,
            created_at,
            payload
          )
        )
      )
    `
    )
    .eq("run_id", run_id)
    .order("number")

  if (genErr) {
    return NextResponse.json({ error: genErr.message }, { status: 500 })
  }

  // Debug logging to verify workflow versions are properly linked
  if (generations && generations.length > 0) {
    console.log(`[Evolution API] Run ${run_id} debug info:`)
    generations.forEach((gen: any) => {
      console.log(`  Generation ${gen.number}:`)
      console.log(
        `    Best workflow version: ${gen.best_workflow_version?.wf_version_id || "none"}`
      )
      if (gen.workflow_invocations && gen.workflow_invocations.length > 0) {
        console.log(
          `    Workflow invocations: ${gen.workflow_invocations.length}`
        )
        gen.workflow_invocations.forEach((inv: any) => {
          console.log(`      Invocation ${inv.wf_invocation_id}:`)
          console.log(`        Version: ${inv.wf_version_id}`)
          console.log(
            `        Node invocations: ${inv.node_invocations?.length || 0}`
          )
          if (inv.node_invocations && inv.node_invocations.length > 0) {
            const versions = new Set(
              inv.node_invocations.map((ni: any) => ni.wf_version_id)
            )
            console.log(
              `        Unique workflow versions in nodes: ${Array.from(versions).join(", ")}`
            )
          }
        })
      }
    })
  }

  const payload = {
    ...run,
    generations: generations ?? [],
  }

  return NextResponse.json(payload)
}
