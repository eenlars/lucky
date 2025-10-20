import { alrighty, fail } from "@/lib/api/server"
import { lgg } from "@lucky/core/utils/logging/Logger"
import { networkMonitor } from "@lucky/examples/definitions/browser-automation/network"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url) {
    return fail("network", "URL is required", { code: "MISSING_URL", status: 400 })
  }
  try {
    const result = await networkMonitor({
      url,
      waitTime: 5000,
      maxRequests: 100,
      maxResponseSize: 1000000,
    })
    return alrighty("network", result)
  } catch (error) {
    lgg.error(error)
    return fail("network", "Failed to monitor network", { code: "NETWORK_MONITOR_ERROR", status: 500 })
  }
}
