import { NextRequest, NextResponse } from "next/server"
import type { RS } from "@core/utils/types"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import type {
  AfterGenerationOptions,
  GenerationOptions,
} from "@core/workflow/actions/generate/generateWF.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, options } = body as {
      prompt: string
      options: GenerationOptions & AfterGenerationOptions
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing prompt parameter" },
        { status: 400 }
      )
    }

    const result: RS<WorkflowConfig> = await formalizeWorkflow(prompt, options)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to formalize workflow",
        data: null,
      },
      { status: 500 }
    )
  }
}
