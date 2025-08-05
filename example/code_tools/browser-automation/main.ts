import type { CodeToolResult } from "@core/tools/code/output.types"
import Tools from "@core/tools/code/output.types"
import { lgg } from "@core/utils/logging/Logger"

import type { ProxyResponse } from "@/code_tools/googlescraper/main"
import {
  inputSchemaNetworkMonitor,
  networkMonitor,
  type NetworkMonitorInput,
} from "./network"

type OutputType = {
  url: string
  success: boolean
  requestCount: number
  requests: any[]
  sessionId?: string
  statistics: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    cachedRequests: number
    redirectedRequests: number
    averageResponseTime: number
    totalSize: number
    resourceTypes: Record<string, number>
    statusCodes: Record<string, number>
  }
  error?: string
}

const toolName = "browserAutomation"

export const inputSchemaBrowserAutomation = inputSchemaNetworkMonitor

export type InputType = NetworkMonitorInput

export async function browserAutomation(
  input: InputType,
  proxy?: ProxyResponse
): Promise<CodeToolResult<OutputType>> {
  try {
    const result = await networkMonitor(input, proxy)
    return Tools.createSuccess(toolName, result)
  } catch (error) {
    lgg.error(
      "error in browserAutomation (networkMonitor)",
      error instanceof Error ? error.message : String(error)
    )
    return Tools.createFailure(toolName, {
      location: "browserAutomation",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
