import { lgg } from "@/logger"
import { networkMonitor } from "@/runtime/code_tools/browser-automation/network"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }
  try {
    const result = await networkMonitor({
      url,
      waitTime: 5000,
      maxRequests: 100,
      maxResponseSize: 1000000,
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    lgg.error(error)
    return NextResponse.json(
      { error: "Failed to monitor network" },
      { status: 500 }
    )
  }
}
