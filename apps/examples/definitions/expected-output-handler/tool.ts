import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { ModelName } from "@core/utils/spending/models.types"
import { zodToJson } from "@core/utils/zod/zodToJson"
import { JSONN } from "@lucky/shared"
import { Tools } from "@lucky/shared"
import { type CodeToolResult, defineTool } from "@lucky/tools"
import { MODELS } from "@lucky/tools/config/runtime"
import { z } from "zod"
/**
 * Simple tool for handling LLM requests with expected output validation
 * Takes a prompt and expected output schema, validates the LLM response against it
 */
const expectedOutputHandler = defineTool({
  name: "expectedOutputHandler",
  params: z.object({
    dataToTransform: z.string().describe("All the data that needs to be transformed to the right format."),
    strictness: z.enum(["strict", "lenient"]).default("lenient"),
  }),
  async execute(params, context): Promise<CodeToolResult<typeof expectedOutput | { success: false; reason: string }>> {
    const expectedOutput = context.expectedOutputType
    const { dataToTransform, strictness } = params

    if (!expectedOutput) {
      return Tools.createFailure("expectedOutputHandler", {
        location: "expectedOutputHandler",
        error: "No expected output type provided",
      })
    }

    // select model
    const selectedModel = MODELS.fitness as ModelName

    const systemPrompt =
      strictness === "strict"
        ? `You are an expert at transforming data to the right format. You must transform the data to EXACTLY match the expected schema. If the data cannot be transformed to perfectly match the schema, you must return an object with "success": false and "reason": "<explanation of why transformation failed>". Do not attempt partial transformations in strict mode.`
        : "You are an expert at transforming data to the right format. Transform the data to match the expected format. Optional fields can be omitted if data is not available."

    try {
      // make the AI request with structured output validation
      const response = await sendAI({
        mode: "text",
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\n${llmify(JSONN.show(zodToJson(expectedOutput)))}\n\nThe data to transform is: ${dataToTransform}`,
          },
          {
            role: "user",
            content: llmify(dataToTransform),
          },
        ],
      })

      if (!response.success) {
        return Tools.createFailure("expectedOutputHandler", {
          location: "expectedOutputHandler no success",
          error: response.error,
        })
      }

      const extractedResponse = JSONN.extract(response.data.text)

      // handle strict mode failure responses
      if (
        strictness === "strict" &&
        extractedResponse &&
        // validate the extracted response against the expected output
        expectedOutput.safeParse(extractedResponse).success === false
      ) {
        return Tools.createFailure("expectedOutputHandler", {
          location: "expectedOutputHandler strict mode failure",
          error: "Extracted response does not match expected output",
        })
      }

      return Tools.createSuccess("expectedOutputHandler", JSONN.extract(response.data.text) as any)
    } catch (error) {
      lgg.error("error in expectedOutputHandler", error)
      return Tools.createFailure("expectedOutputHandler", {
        location: "expectedOutputHandler",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  },
})

export const tool = expectedOutputHandler
