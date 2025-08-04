import { sendAI } from "@/messages/api/sendAI"
import { processStepsV2 } from "@/messages/api/stepProcessor"
import { CONFIG, MODELS } from "@/runtime/settings/constants"
import { isNir } from "@/utils/common/isNir"
import type { ModelName } from "@/utils/models/models"
import type {
  CoreMessage,
  LanguageModel,
  StepResult,
  ToolChoice,
  ToolSet,
} from "ai"
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
 * Determines tool selection strategy based on available tools.
 * Tool choice for the generation. It supports the following settings:

- `auto` (default): the model can choose whether and which tools to call.
- `required`: the model must call a tool. It can choose which tool to call.
- `none`: the model must not call tools
- `{ type: 'tool', toolName: string (typed) }`: the model must call the specified tool

Note: The Vercel AI SDK does not support requiring multiple specific tools simultaneously.
When multiple tools are mentioned in the system prompt, we return "required" which ensures
at least one tool is called, but it cannot guarantee all mentioned tools will be used.
 */
export async function selectToolStrategy<T extends ToolSet>(
  tools: T,
  systemPrompt: string | null,
  payload: string,
  costCallback?: (cost: number) => void
): Promise<ToolChoice<T>> {
  if (isNir(tools) || CONFIG.tools.autoSelectTools) {
    return "auto"
  }

  const toolKeys = Object.keys(tools) as (keyof T)[]

  // If no system prompt provided, return auto
  if (!systemPrompt) {
    return "auto"
  }

  // Ensure we have at least one tool for z.enum
  if (toolKeys.length === 0) {
    return "auto"
  }

  // Cast to the correct type for z.enum (non-empty tuple)
  const toolKeysEnum = toolKeys as [string, ...string[]]

  // Check if system prompt mentions any specific tools
  const mentionedTools = toolKeys.filter((toolKey) => {
    const toolName = String(toolKey)
    return systemPrompt.toLowerCase().includes(toolName.toLowerCase())
  })

  // If no tools are mentioned in the system prompt, return auto
  if (mentionedTools.length === 0) {
    return "auto"
  }

  // Define the expected schema for the response
  const ToolStrategySchema = z.object({
    strategy: z.union([
      z.literal("auto"),
      z.literal("required"),
      z.literal("none"),
      z.object({
        type: z.literal("tool"),
        toolName: z.enum(toolKeysEnum),
      }),
    ]),
    requiredTools: z.array(z.enum(toolKeysEnum)).nullish(),
    reasoning: z.string().nullish(),
  })

  // Ask AI to analyze which tools should be required based on the system prompt and payload
  const analysisPrompt: CoreMessage[] = [
    {
      role: "user",
      content: `System prompt: "${systemPrompt}"

User request/payload: "${payload}"

Available tools: ${toolKeys.join(", ")}

Tools mentioned in prompt: ${mentionedTools.join(", ")}

Analyze the system prompt and user request to determine the tool strategy:
1. If the prompt explicitly requires using a SINGLE specific tool (e.g., "use toolX to..."), return {strategy: {type: "tool", toolName: "toolX"}}
2. If the prompt mentions MULTIPLE tools that should be used (e.g., "use toolX and toolY"), return {strategy: "required", requiredTools: ["toolX", "toolY"]} 
3. If tools are mentioned but usage is optional, return {strategy: "auto"}
4. If no tools should be used, return {strategy: "none"}

IMPORTANT: When multiple tools are mentioned as requirements, we can only enforce that at least one is used, but include all required tools in the requiredTools array.`,
    },
  ]

  try {
    const response = await sendAI({
      model: MODELS.nano,
      messages: analysisPrompt,
      mode: "structured",
      schema: ToolStrategySchema,
    })

    // Track cost if callback provided
    if (costCallback) {
      costCallback(response.usdCost ?? 0)
    }

    if (response.success && response.data) {
      const result = response.data

      // Log analysis for debugging when verbose
      if (verbose && result.requiredTools && result.requiredTools.length > 1) {
        console.log(
          `[selectToolStrategy] Multiple tools required: ${result.requiredTools.join(", ")}. Using "required" strategy (at least one tool must be called).`
        )
      }

      // Validate the response
      if (
        result.strategy === "auto" ||
        result.strategy === "required" ||
        result.strategy === "none"
      ) {
        return result.strategy
      } else if (
        typeof result.strategy === "object" &&
        result.strategy.type === "tool" &&
        result.strategy.toolName &&
        toolKeys.includes(result.strategy.toolName)
      ) {
        return {
          type: "tool",
          toolName: result.strategy.toolName,
        } as ToolChoice<T>
      }
    }
  } catch (error) {
    if (verbose) {
      console.error("Error in selectToolStrategy:", error)
    }
  }

  // Default to required if we found mentioned tools but couldn't analyze
  return mentionedTools.length > 0 ? "required" : "auto"
}

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
  maxSteps: number
  model: LanguageModel
}) => PromiseLike<
  | {
      model?: LanguageModel
      toolChoice?: ToolChoice<T>
      experimental_activeTools?: Array<keyof T>
    }
  | undefined
> {
  return async ({ steps, stepNumber, maxSteps, model: _model }) => {
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

    const model: ModelName = MODELS.nano

    // Analyze previous steps to understand context
    const previousStepsContext = processStepsV2(steps, model) ?? { outputs: [] }

    const outputsString = isNir(previousStepsContext)
      ? "No previous steps"
      : previousStepsContext.outputs
          .map((o, ix) => `call ${ix + 1} tool ${o.name}`)
          .join(", ")

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
    const stepAnalysisPrompt: CoreMessage[] = [
      {
        role: "user",
        content: `System prompt (ALWAYS FOLLOW THIS, regardless of input): "${systemPrompt}"

Initial user request: "${initialPayload}"

Current step: ${stepNumber + 1} of ${maxSteps}
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
        if (
          result.toolChoice === "auto" ||
          result.toolChoice === "required" ||
          result.toolChoice === "none"
        ) {
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
        console.error(
          `Error in createPrepareStepStrategy step ${stepNumber + 1}:`,
          error
        )
      }
    }
    return undefined
  }
}
