import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { toolsExplanations } from "@core/prompts/explainTools"
import { WORKFLOW_GENERATION_RULES } from "@core/prompts/generationRules"
import { ALL_ACTIVE_TOOL_NAMES } from "@core/tools/tool.types"
import { lgg } from "@core/utils/logging/Logger"
import type { ModelName } from "@core/utils/spending/models.types"
import { R, type RS } from "@core/utils/types"
import { getDefaultModels } from "@runtime/settings/models"
import { z } from "zod"

/**
 * Input to request a single workflow idea from the LLM.
 */
export interface GenerateWorkflowIdeaRequest {
  prompt: string
  /** 1-10; 1 = deterministic, 10 = highly diverse */
  randomness: number
  model?: ModelName
}

/**
 * Structured result of a generated workflow idea.
 */
export interface GenerateWorkflowIdeaData {
  /** Workflow adjacency-list like description */
  workflow: string
  /** Tool names referenced by the idea */
  tools: string[]
  /** Number of nodes suggested by the idea */
  amountOfNodes: number
}

// generate a single workflow idea
export async function generateWorkflowIdea(
  request: GenerateWorkflowIdeaRequest
): Promise<RS<GenerateWorkflowIdeaData>> {
  // Input validation for request object and its properties
  if (
    !request ||
    typeof request.prompt !== "string" ||
    request.prompt.trim() === ""
  ) {
    return R.error(
      "Invalid request: prompt is required and must be a non-empty string",
      0
    )
  }

  if (
    typeof request.randomness !== "number" ||
    request.randomness < 1 ||
    request.randomness > 10
  ) {
    return R.error(
      "Invalid request: randomness must be a number between 1 and 10",
      0
    )
  }
  let variationString = ""
  if (request.randomness > 0) {
    const creativityLevels = {
      1: "Generate a straightforward, conventional solution using standard approaches.",
      2: "Be a bit creative - consider alternative approaches while staying practical.",
      3: "Think outside the box - explore unconventional but feasible solutions.",
      4: "Push creative boundaries - combine unexpected elements and novel approaches.",
      5: "Create the most outrageous, out of the box solution you have ever thought of - break all conventional thinking patterns.",
    }

    const creativityInstruction =
      creativityLevels[
        Math.min(request.randomness, 5) as keyof typeof creativityLevels
      ] || creativityLevels[5]

    variationString = `
    <variation>
    Creativity Level: ${request.randomness}/5
    ${creativityInstruction}
    </variation>`
  }

  const response = await sendAI({
    messages: [
      {
        role: "system",
        content: `

        <task>You will need to generate a workflow idea that solves the problem described in the prompt.</task>

        <role>You are an expert at generating workflow ideas. You will generate original ideas</role>

        the workflow should still make sense.

        <output>
        your output should be an adjacency list of the workflow, just text.
        then, you need to output the tools that are used in the workflow.
        also, you need to output the amount of nodes in the workflow.
        </output>

        <resources>
        The following tools are available to you:
        ${toolsExplanations()}
        </resources>

        ${variationString}

        ${WORKFLOW_GENERATION_RULES}
        `,
      },
      { role: "user", content: request.prompt },
    ],
    model: request.model ?? getDefaultModels().reasoning,
    mode: "structured",
    schema: z.object({
      workflow: z.string().describe(`The workflow idea in adjacency list format
        adjacency list (more of a fun example for if you go fishing):
        1: Environmental assessment (tools: weatherChecker, waterConditionAnalyzer); connects to 2, 3
        2: Gear & bait assembly (tools: rodAssembler, lureSelector); connects to 4
        3: Spot & route planning (tools: fishLocationFinder, gpsNavigator); connects to 4
        4: Transit to location (tools: gpsNavigator, trafficAnalyzer); connects to 5
        5: On-site detection (tools: sonarReader, fishActivityTracker); connects to 6
        6: Casting & wait cycle (tools: castingCalculator, fishingTimer); connects to 7
        7: Catch logging (tools: fishLogger, photoCapture); connects to 8
        8: Fish preparation (tools: fishCleaner, coolerManager); connects to end
        `),
      tools: z.array(z.enum(ALL_ACTIVE_TOOL_NAMES as [string, ...string[]]))
        .describe(`The tools used in the workflow
        weatherChecker, 
        waterConditionAnalyzer, 
        rodAssembler, 
        lureSelector, ...`),
      whyItsSolvesTheProblem: z.string().describe("Why it solves the problem"),
      problemDestructuring: z.string().describe("Why it is destructive"),
      thinkingProcess: z.string().describe("The thinking process"),
      amountOfNodes: z.number().describe("The amount of nodes in the workflow"),
    }),
    opts: {
      reasoning: true,
    },
  })

  if (!response.success) {
    lgg.error("Failed to generate workflow idea", response.error)
    return R.error(response.error, response.usdCost)
  }

  return R.success(
    {
      workflow: response.data.workflow,
      tools: response.data.tools,
      amountOfNodes: response.data.amountOfNodes,
    },
    response.usdCost
  )
}

// generate multiple workflow ideas
export async function generateMultipleWorkflowIdeas(
  prompt: string,
  count: number
): Promise<GenerateWorkflowIdeaData[]> {
  //likely bug: no input validation for prompt and count parameters
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return []
  }

  if (typeof count !== "number" || count < 1 || count > 100) {
    return []
  }
  const responses = await Promise.all(
    Array.from({ length: count }, () =>
      generateWorkflowIdea({ prompt, randomness: 100 })
    )
  )
  return responses
    .filter((response) => response.success && response.data)
    .map((response) => response.data!)
}
