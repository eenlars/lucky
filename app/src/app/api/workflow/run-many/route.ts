import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dslConfig, cases, goal } = body as {
      dslConfig: WorkflowConfig
      cases: { workflowInput: string; workflowOutput: any }[]
      goal?: string
    }

    if (!dslConfig || !Array.isArray(cases) || cases.length === 0) {
      return NextResponse.json(
        { error: "Missing dslConfig or cases" },
        { status: 400 }
      )
    }

    // We’ll run one by one and return results array (with fitness)
    const results: any[] = []

    for (const c of cases) {
      const evalInput: EvaluationInput = {
        type: "text",
        question: c.workflowInput,
        answer:
          typeof c.workflowOutput === "string"
            ? c.workflowOutput
            : JSON.stringify(c.workflowOutput),
        goal:
          goal && typeof goal === "string" && goal.trim().length > 0
            ? goal
            : "UI batch run",
        workflowId: "adhoc-ui",
      }

      const res = await invokeWorkflow({ dslConfig, evalInput })
      if (!res.success) {
        results.push({ success: false, error: res.error })
      } else {
        results.push({ success: true, data: res.data })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
