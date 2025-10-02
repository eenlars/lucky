import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { llmify, truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import z from "zod"

const validationSchema = z.object({
  taskFulfillment: z.object({
    score: z.number().min(0).max(10),
    reasoning: z.string(),
    criticalIssues: z.array(z.string()),
  }),
  systemPromptCompliance: z.object({
    score: z.number().min(0).max(10),
    reasoning: z.string(),
    deviations: z.array(z.string()),
  }),
  outputQuality: z.object({
    score: z.number().min(0).max(10),
    reasoning: z.string(),
    improvements: z.array(z.string()),
  }),
  recommendation: z.enum(["proceed", "retry", "escalate"]),
  overallScore: z.number().min(0).max(10),
})

export type ValidationResult = z.infer<typeof validationSchema>

export async function validateNodeOutput({
  nodeOutput,
  originalTask,
  systemPrompt,
  nodeId,
}: {
  nodeOutput: string
  originalTask: string
  systemPrompt: string
  nodeId: string
}): Promise<{
  validation: ValidationResult | null
  error: string | null
  usdCost: number
}> {
  const prompt = llmify(`
<role>
You are a precise output validator for autonomous workflow nodes. Your job is to rigorously analyze whether a node's output fulfills its assigned task and follows its system prompt.
</role>

<task>
Analyze the node output against three criteria:
1. Task Fulfillment - Did it actually complete what was asked?
2. System Prompt Compliance - Did it follow its behavioral instructions?
3. Output Quality - Is the output useful, complete, and well-structured?
</task>

<context>
Node ID: ${nodeId}
Original Task: ${originalTask}
System Prompt: ${systemPrompt}
Node Output: ${truncater(nodeOutput, 1000)}
</context>

<instructions>
Be extremely critical and thorough. Look for:
- Incomplete task execution
- Ignored instructions from system prompt
- Poor output quality or structure
- Missing critical information
- Logical inconsistencies
- Failure to use required tools or follow processes

Score each criteria 0-10 (0=complete failure, 10=perfect execution).
Only recommend "proceed" if all scores are ≥7.
Recommend "retry" for fixable issues (scores 4-6).
Recommend "escalate" for fundamental failures (scores <4).
</instructions>
`)

  try {
    const { data, error, usdCost } = await sendAI({
      messages: [{ role: "user", content: prompt }],
      model: getDefaultModels().nano,
      mode: "structured",
      schema: validationSchema,
      output: "object",
    })

    if (error) {
      lgg.error("validateNodeOutput error", error)
      return {
        validation: null,
        error,
        usdCost: usdCost ?? 0,
      }
    }

    return {
      validation: data,
      error: null,
      usdCost: usdCost ?? 0,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    lgg.error("validateNodeOutput exception", errorMessage)
    return {
      validation: null,
      error: errorMessage,
      usdCost: 0,
    }
  }
}
