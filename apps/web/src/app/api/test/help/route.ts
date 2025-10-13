import * as fs from "node:fs/promises"
import * as path from "node:path"
import { type NextRequest, NextResponse } from "next/server"

const HELP_STORAGE_PATH = path.join(process.cwd(), "logging_folder", "help")

export interface HelpRequest {
  id: string
  workflowInvocationId: string
  question?: string
  timestamp: number
  status: "pending" | "answered"
  response?: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const helpId = searchParams.get("id")

  if (!helpId) {
    return NextResponse.json({ error: "Missing help ID" }, { status: 400 })
  }

  // SECURITY: Sanitize helpId to prevent path traversal attacks
  const sanitizedHelpId = path.basename(helpId).replace(/[^a-zA-Z0-9_-]/g, "")
  if (!sanitizedHelpId || sanitizedHelpId !== helpId) {
    return NextResponse.json({ error: "Invalid help ID format" }, { status: 400 })
  }

  const requestFilePath = path.join(HELP_STORAGE_PATH, `${sanitizedHelpId}.json`)

  try {
    const requestData = await fs.readFile(requestFilePath, "utf-8")
    const helpRequest: HelpRequest = JSON.parse(requestData)

    return NextResponse.json(helpRequest)
  } catch (error) {
    console.error("Error reading help request:", error)
    return NextResponse.json({ error: "Help request not found or expired" }, { status: 404 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, response } = body

    if (!id || typeof response !== "string") {
      return NextResponse.json({ error: "Missing id or response" }, { status: 400 })
    }

    // SECURITY: Sanitize id to prevent path traversal attacks
    const sanitizedId = path.basename(id).replace(/[^a-zA-Z0-9_-]/g, "")
    if (!sanitizedId || sanitizedId !== id) {
      return NextResponse.json({ error: "Invalid help ID format" }, { status: 400 })
    }

    console.log(`[Help API] Received POST for helpId: ${sanitizedId}`)

    const requestFilePath = path.join(HELP_STORAGE_PATH, `${sanitizedId}.json`)

    let helpRequest: HelpRequest
    try {
      const requestData = await fs.readFile(requestFilePath, "utf-8")
      helpRequest = JSON.parse(requestData)
    } catch (error) {
      console.error(`[Help API] Error reading help file for id ${sanitizedId}:`, error)
      return NextResponse.json({ error: "Help request not found" }, { status: 404 })
    }

    if (helpRequest.status !== "pending") {
      console.log(`[Help API] Request ${sanitizedId} already processed. Status: ${helpRequest.status}`)
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }

    helpRequest.status = "answered"
    helpRequest.response = response

    try {
      await fs.writeFile(requestFilePath, JSON.stringify(helpRequest, null, 2))
      console.log(`[Help API] Successfully updated helpId ${sanitizedId} to status 'answered'`)
    } catch (error) {
      console.error(`[Help API] Error writing help file for id ${sanitizedId}:`, error)
      return NextResponse.json({ success: false, error: "Failed to save response" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Response submitted successfully",
    })
  } catch (error) {
    console.error("Error in help route:", error)
    return NextResponse.json({ success: false, error: "Failed to process request" }, { status: 500 })
  }
}
