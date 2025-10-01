/* eslint-disable no-restricted-imports */
import * as fs from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import * as path from "path"

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

  const requestFilePath = path.join(HELP_STORAGE_PATH, `${helpId}.json`)

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
    console.log(`[Help API] Received POST for helpId: ${id}`)

    const requestFilePath = path.join(HELP_STORAGE_PATH, `${id}.json`)

    let helpRequest: HelpRequest
    try {
      const requestData = await fs.readFile(requestFilePath, "utf-8")
      helpRequest = JSON.parse(requestData)
    } catch (error) {
      console.error(`[Help API] Error reading help file for id ${id}:`, error)
      return NextResponse.json({ error: "Help request not found" }, { status: 404 })
    }

    if (helpRequest.status !== "pending") {
      console.log(`[Help API] Request ${id} already processed. Status: ${helpRequest.status}`)
      return NextResponse.json({ error: "Request already processed" }, { status: 400 })
    }

    helpRequest.status = "answered"
    helpRequest.response = response

    try {
      await fs.writeFile(requestFilePath, JSON.stringify(helpRequest, null, 2))
      console.log(`[Help API] Successfully updated helpId ${id} to status 'answered'`)
    } catch (error) {
      console.error(`[Help API] Error writing help file for id ${id}:`, error)
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
