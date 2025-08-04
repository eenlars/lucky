import {
  isErrorProcessed,
  isTextProcessed,
  isToolProcessed,
  type ProcessedResponse,
} from "@/messages/api/processResponse.types"

/**
 * Extracts tool logs from a ProcessedResponse in a format suitable for makeLearning
 * Handles different response types consistently
 */
export const extractToolLogs = (
  processedResponse: ProcessedResponse
): string => {
  if (isTextProcessed(processedResponse)) {
    return processedResponse.content
  }

  if (isToolProcessed(processedResponse) && processedResponse.toolUsage) {
    return processedResponse.toolUsage.outputs
      .map((o) => `${o.type}: ${o.return}`)
      .join("\n")
  }

  if (isErrorProcessed(processedResponse)) {
    return `Error: ${processedResponse.message}`
  }

  return ""
}
