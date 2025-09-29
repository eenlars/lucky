import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { processStepsV2 } from "@core/messages/api/vercel/vercelStepProcessor"
import { isNir } from "@core/utils/common/isNir"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import type { LanguageModel, ModelMessage, StepResult, ToolChoice, ToolSet } from "ai"
import { z } from "zod"

export type ExperimentalStepFunction<TOOLS extends ToolSet> = (options: {
  steps: Array<StepResult<TOOLS>>
  stepNumber: number
  maxSteps: number
  model: LanguageModel
}) => PromiseLike<
  | {
      model?: LanguageModel
      toolChoice?: ToolChoice<TOOLS>
      experimental_activeTools?: Array<keyof TOOLS>
    }
  | undefined
>

const verbose = CONFIG.logging.override.Tools

/**
 * Creates a prepareStep function that provides fine-grained control over each step
 * in a multi-step agent workflow. This allows dynamic tool selection based on
 * the context of previous steps and current requirements.
 */
export function createPrepareStepStrategy<T extends ToolSet>(
  tools: T,
  systemPrompt: string | null,
  initialPayload: string
): (options: {
  steps: Array<StepResult<T>>
  stepNumber: number
  model: LanguageModel
  messages: ModelMessage[]
}) => PromiseLike<
  | {
      model?: LanguageModel
      toolChoice?: ToolChoice<T>
      experimental_activeTools?: Array<keyof T>
    }
  | undefined
> {
  return async ({ steps, stepNumber, model: _model }) => {
    if (isNir(tools) || CONFIG.tools.autoSelectTools) {
      return undefined // Use default settings
    }

    // If no system prompt provided, use default
    if (!systemPrompt) {
      return undefined
    }

    // Ensure we have at least one tool for z.enum
    if (Object.keys(tools).length === 0) {
      return undefined
    }

    const model = getDefaultModels().nano

    // Analyze previous steps to understand context
    const previousStepsContext = processStepsV2(steps, model) ?? {
      agentSteps: [],
    }

    const outputsString = isNir(previousStepsContext)
      ? "No previous steps"
      : previousStepsContext.agentSteps.map((o, ix) => `call ${ix + 1} tool ${o.name}`).join(", ")

    // Define the expected schema for the response
    const StepStrategySchema = z.object({
      toolChoice: z.union([
        z.literal("auto"),
        z.literal("required"),
        z.literal("none"),
        z.object({
          type: z.literal("tool"),
          name: z.enum(Object.keys(tools) as [string, ...string[]]),
        }),
      ]),
    })

    // Build context for this specific step
    const stepAnalysisPrompt: ModelMessage[] = [
      {
        role: "user",
        content: `System prompt (ALWAYS FOLLOW THIS, regardless of input): "${systemPrompt}"

Initial user request: "${initialPayload}"

Current step: ${stepNumber + 1}
Available tools: ${Object.keys(tools).join(", ")}

Previous steps context:
${outputsString}

Based on the system prompt, initial request, and previous steps, determine the best tool strategy for this specific step:

1. If this step should use a specific tool (e.g., based on what previous steps accomplished), return {toolChoice: {type: "tool", toolName: "string (typed)"}}
2. If this step should not use any tools, return {toolChoice: "none"}

Consider:
- What are our instructions?
- What has been accomplished in previous steps?
- What still needs to be done?
- Which tool would be most appropriate for this specific step?
- Are there any dependencies between steps that affect tool choice?
- Do we really need to use a tool now (not in a loop)?`,
      },
    ]

    console.log("stepAnalysisPrompt", stepAnalysisPrompt)

    try {
      const response = await sendAI({
        model,
        messages: stepAnalysisPrompt,
        mode: "structured",
        schema: StepStrategySchema,
      })

      if (response.success && response.data) {
        const result = response.data

        // Validate and return the response
        if (result.toolChoice === "auto" || result.toolChoice === "required" || result.toolChoice === "none") {
          return { toolChoice: result.toolChoice }
        } else if (
          typeof result.toolChoice === "object" &&
          result.toolChoice.type === "tool" &&
          result.toolChoice.name &&
          Object.keys(tools).includes(result.toolChoice.name)
        ) {
          return {
            toolChoice: {
              type: "tool",
              toolName: result.toolChoice.name,
            } as ToolChoice<T>,
          }
        }
      }
    } catch (error) {
      if (verbose) {
        console.error(`Error in createPrepareStepStrategy step ${stepNumber + 1}:`, error)
      }
    }
    return undefined
  }
}
