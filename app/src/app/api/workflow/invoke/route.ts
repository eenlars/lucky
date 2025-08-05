import {
  invokeWorkflow,
  type InvocationInput,
} from "@core/workflow/runner/invokeWorkflow"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = body as InvocationInput

    if (!input) {
      return NextResponse.json(
        { error: "Invalid invocation input" },
        { status: 400 }
      )
    }

    const result = await invokeWorkflow(input)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Workflow Invocation API Error:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
