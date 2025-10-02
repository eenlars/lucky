import { CONFIG, isLoggingEnabled } from "@core/core-config/compat"
import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { truncater } from "@core/utils/common/llmify"
import { JSONN } from "@core/utils/json"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import type { ModelMessage } from "ai"
import type { z } from "zod"

// the response is already malformed, but we want to try to repair it
export const repairAIRequest = async <T extends z.ZodTypeAny>(response: string, schema: T): Promise<RS<z.infer<T>>> => {
  if (isLoggingEnabled("API")) {
    lgg.log(
      `⚠️  [repairAIRequest] we need to repair this response: ${truncater(JSON.stringify(response, null, 2), 500)}`,
    )
  }
  const messages: ModelMessage[] = [
    {
      role: "system",
      content: `You are a helpful assistant that can repair malformed JSON responses. 
      You cannot change the content of the response, you can only repair the JSON structure.
      Return ONLY valid JSON, no additional text or explanation.`,
    },
    {
      role: "user",
      content: `my malformed JSON response is: ${response}`,
    },
  ]
  const result = await sendAI({
    messages,
    model: getDefaultModels().nano,
    mode: "text", // avoid circular dependency with structured mode
    retries: 1, // limit retries for repair
  })

  if (!result.success) {
    lgg.error(`[repairAIRequest] failed to repair the response: ${result.error}`)
    return R.error(`failed to repair the response: ${result.error}`, result.usdCost ?? 0)
  }

  // Extract and parse JSON from text response
  const extractedJson = JSONN.extract(result.data.text)
  if (!extractedJson) {
    return R.error(`No valid JSON found in response: ${JSONN.show(result.data.text)}`, result.usdCost ?? 0)
  }

  // Validate against schema
  const validationResult = schema.safeParse(extractedJson)
  if (!validationResult.success) {
    return R.error(`JSON validation failed: ${validationResult.error.message}`, result.usdCost ?? 0)
  }

  return R.success(validationResult.data, result.usdCost ?? 0)
}
