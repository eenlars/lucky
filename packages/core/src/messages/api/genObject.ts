import type { ModelMessage } from "ai"
import { z } from "zod"

import { getDefaultModels, isLoggingEnabled } from "@core/core-config/coreConfig"
import { repairAIRequest } from "@core/messages/api/repairAIRequest"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { llmify, truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"

import { zodToJson } from "@core/utils/validation/zodToJson"
import { JSONN, R, type RS, isNir } from "@lucky/shared"

export const addReasoning = <S extends z.ZodTypeAny>(schema: S) => {
  return z.object({
    value: schema, // original payload goes here
    findings: z.string(), // new field
  })
}

export const genObject = async <T extends z.ZodSchema>({
  messages,
  schema,
  model,
  opts = {},
}: {
  messages: ModelMessage[]
  schema: T
  model?: string
  opts?: {
    retries?: number
    repair?: boolean
  }
}): Promise<RS<{ value: z.infer<T>; summary: string }>> => {
  let usdCost = 0
  console.log("[genObject] start", {
    model,
    retries: opts?.retries ?? 2,
  })
  // extend the schema with one more field: "reasoning"
  // const extendedSchema = addReasoning(schema)

  const jsonSchema = zodToJson(schema)

  // the summaries tend to get very generalized. therefore we do:
  // important: this helps to keep the data structure consistent.
  // we use two types, because otherwise we get lots of errors. it seems stupid, but it works.
  const systemMessage: ModelMessage = {
    role: "system",
    content: `You are an AI assistant that strictly returns JSON data. Your response MUST be a single, valid JSON object enclosed in <json> and </json> tags.
Do NOT include any explanatory text, markdown, or any characters outside of the JSON object itself.
Your response must conform to this JSON Schema:
${JSON.stringify(jsonSchema)}

CORRECT EXAMPLE:
input: { 'memory': { 'stores': [] } }
output:
<json>
{
    "memory": {
        "stores": []
    }
}
</json>`,
  }

  const result = await sendAI({
    mode: "text", // do not change this!
    messages: [systemMessage, ...messages],
    model,
    retries: opts?.retries ?? 2,
  })

  if (!result.success) {
    console.warn("[genObject] sendAI failed", { error: result.error })
    return R.error(`genObject failed: ${result.error}`, usdCost)
  }

  usdCost += result.usdCost ?? 0

  const extractedJson = JSONN.extract(result.data.text)
  if (!extractedJson) {
    console.warn("[genObject] no JSON in response")
    return R.error(`No valid JSON found in response: ${JSONN.show(result.data.text)}`, usdCost)
  }

  // Validate the extracted JSON against the schema
  const { success, data, error } = schema.safeParse(extractedJson)
  if (!success) {
    console.warn("[genObject] validation failed", { error: error.message })
    if (opts?.repair) {
      if (isLoggingEnabled("API")) {
        lgg.warn(
          "repairing",
          error.message,
          JSON.stringify(extractedJson, null, 2),
          JSON.stringify(messages, null, 2),
          JSON.stringify(jsonSchema, null, 2),
        )
      }
      const { success, data, usdCost: repairedUsdCost } = await repairAIRequest(JSON.stringify(extractedJson), schema)
      usdCost += repairedUsdCost ?? 0
      return success
        ? R.success(data, usdCost)
        : R.error(`Failed to repair JSON: ${llmify(truncater(error.message, 400))}`, usdCost)
    }
    return R.error(`JSON validation failed: ${error.message}`, usdCost)
  }

  console.log("[genObject] success")
  return R.success(
    {
      value: data,
      summary: await quickSummary(data),
    },
    usdCost,
  )
}

export const quickSummary = async (input: string): Promise<string> => {
  if (isNir(input)) return ""
  try {
    const { data } = await sendAI({
      mode: "text",
      messages: [
        {
          role: "user",
          content: `Give a small and concise summary about this data: ${JSON.stringify(input)}`,
        },
      ],
      model: getDefaultModels().summary,
    })
    if (!isNir(data?.text)) return data.text
    return ""
  } catch (error) {
    lgg.error("quickSummary failed", error)
    return ""
  }
}

export const quickSummaryNull = async (
  input: string,
  retries = 1,
  outputLength = "1-2 sentences",
): Promise<string | null> => {
  if (isNir(input)) return null
  try {
    const { data } = await sendAI({
      mode: "text",
      messages: [
        {
          role: "user",
          content: `Give a small and concise summary about this data: ${JSON.stringify(input)}. output length: ${outputLength}`,
        },
      ],
      model: getDefaultModels().summary,
      retries,
    })
    if (!isNir(data?.text)) return data.text
    return null
  } catch (error) {
    lgg.error("quickSummaryNull failed", error)
    return null
  }
}

export const askLLM = async (
  input: string,
  retries = 1,
  outputInstruction = "output length 1-2 sentences",
): Promise<string | null> => {
  if (isNir(input)) return null
  try {
    const { data } = await sendAI({
      mode: "text",
      messages: [
        {
          role: "user",
          content: `${llmify(input)}. output: ${llmify(outputInstruction)}`,
        },
      ],
      model: getDefaultModels().summary,
      retries,
    })
    if (!isNir(data?.text)) return data.text
    return null
  } catch (error) {
    lgg.error("askLLM failed", error)
    return null
  }
}
