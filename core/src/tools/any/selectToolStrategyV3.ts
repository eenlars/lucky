import { sendAI } from "@core/messages/api/sendAI"
import {
  toolUsageToString,
  type StrategyResult,
} from "@core/node/strategies/utils"
import { explainTools } from "@core/tools/any/explainTools"
import type { SelectToolStrategyOptions } from "@core/tools/any/selectToolStrategyV2"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { CONFIG } from "@runtime/settings/constants"
import type { CoreMessage, ToolSet } from "ai"
import chalk from "chalk"
import { z } from "zod"

const verbose = CONFIG.logging.override.Tools
const verboseOverride = true

// TODO-later: if we want to invoke other nodes from this node, this can be part of the strategy.

/**
 * V3: Decides next action: terminate or select one tool with reasoning.
 * @param tools Available tools
 * @param messages Current conversation history
 * @returns {type: 'tool', toolName: keyof T, reasoning: string} or {type: 'terminate', reasoning: string}
 */
export async function selectToolStrategyV3<T extends ToolSet>(
  options: SelectToolStrategyOptions<T>
): Promise<{
  strategyResult: StrategyResult<T> // the result of the strategy
  debugPrompt: string // debugprompt is to check what has been sent to the model.
}> {
  const { tools, messages, nodeLogs, roundsLeft, systemMessage, model } =
    options

  if (isNir(tools) || Object.keys(tools).length === 0) {
    // this should never happen.
    lgg.error("No tools available.", { tools, messages, roundsLeft })
    return {
      strategyResult: {
        type: "terminate",
        reasoning: "No tools available.",
        usdCost: 0,
      },
      debugPrompt: "",
    }
  }

  const toolKeys = Object.keys(tools) as (keyof T)[]

  // Use provided system message as primary directive
  const primaryInstruction = systemMessage

  // Define schema for structured output (V3 with mutation observer support)
  const DecisionSchemaV3 = z.object({
    type: z.enum(["tool", "terminate"]),
    toolName:
      toolKeys.length > 0
        ? z
            .enum(toolKeys as [string, ...string[]])
            .optional()
            .describe("only if using a tool")
        : z.string().optional().describe("only if using a tool"),
    reasoning: z.string(),
    plan: z.string().optional().describe("only if using a tool"),
    check: z
      .string()
      .nullable()
      .optional()
      .describe("What will I look for to know I succeeded?"),
    expectsMutation: z
      .boolean()
      .optional()
      .describe(
        "Will this tool change the environment in a way that needs observation before taking more action?"
      ),
  })

  // Check if previous reasoning indicated mutation expectation
  let previousToolExpectedMutation = false
  if (nodeLogs && nodeLogs.length > 0) {
    const lastReasoningLog = nodeLogs.findLast(
      (log) => log.type === "reasoning"
    )
    if (lastReasoningLog?.return.includes("[EXPECTS_MUTATION]")) {
      previousToolExpectedMutation = true
    }
  }

  // Analysis prompt
  const analysisMessages: CoreMessage[] = [
    {
      role: "system",
      content: `
      #decide
      Decide the next action:
      - If the task is complete or no more tools needed, use {type: "terminate", reasoning: "..."}
      - If a specific tool should be used next, use {type: "tool", toolName: "...", reasoning: "...", plan: "..."} and describe the plan
      
      #progress
      Rounds left: ${roundsLeft}. Do not call the same tool twice in a row with the same intent unless the environment has changed or a new observation is strictly required.

      #action-oriented tasks
      Consider these as actionable tasks that require tools:
      - Any instruction containing action verbs (ask, search, write, get, find, etc.) requires tool usage

      #plan
      In the plan, show what you want to do with the tool, and specifically how you want to use the tool.
      you are given the the parameters of the tool, use them to plan your next action and say how you want to use the tool.
      be very specific in your plan. think: would it be good to do a plan if i already tried it and it did not work?

      #reasoning
      In the reasoning, explain why you chose the tool and the plan.
      Choose ONLY ONE tool if needed. Provide clear reasoning.

      #tool calls
      never run tool calls that are duplicate, or don't add value. you can also stop if you think it is necessary.
      - if you have never used a tool before, you should probably use it
      - if you do not want to use it, you should explain in reasoning why you think you should not use it
      
      #PRIMARY INSTRUCTION (MOST IMPORTANT)
      This is the node's core instruction that MUST be followed:
      ${primaryInstruction}
      
      CRITICAL: If the primary instruction contains action verbs (ask, find, search, write, create, etc.), 
      you MUST use the appropriate tool. Do NOT terminate if there are explicit action instructions.
      
      If the primary instruction includes a sequence like "read/check THEN write/create", and you have already performed the read/check step (see past calls), you should select a write/create tool next to make progress.

      RULE X: If the immediately preceding tool had sideEffect 'mutate', your next explicit choice should almost always be an 'observe' tool unless you can prove the observation is already in messages or there is no reason to observe.
      ${previousToolExpectedMutation ? "\n      IMPORTANT: The previous tool execution indicated it would mutate the environment. You should strongly consider using an observation tool next to check the state before proceeding with further actions." : ""}

      #conversation history (supporting context)
      ${JSON.stringify(messages, null, 2)}

      # the context of the current node
      ${
        !isNir(nodeLogs)
          ? `
      #these were the past calls (NOTE: if you see repeated calls, you should either terminate or do something else.):
      ${toolUsageToString(nodeLogs, 1000)}`
          : "no past calls"
      }
    `,
    },
    {
      role: "user",
      content: `
      Available tools:\n${explainTools(tools)}
    `,
    },
  ]

  const debugPrompt = analysisMessages.map((m) => m.content).join("\n")

  try {
    const {
      success,
      data: decision,
      usdCost,
      error,
    } = await sendAI({
      model,
      messages: analysisMessages,
      mode: "structured",
      schema: DecisionSchemaV3,
      opts: {
        reasoning: true,
      },
    })

    if (success && decision) {
      if (decision.plan && (verbose || verboseOverride)) {
        console.log(chalk.bold("decision:", JSON.stringify(decision, null, 2)))
        // console.log(chalk.blueBright.bold("plan:", decision.plan))
        // console.log(chalk.blueBright.bold("reasoning:", decision.reasoning))
        // console.log(chalk.blueBright.bold("toolName:", decision.toolName))

        // console.log(chalk.yellow.bold("toolUsage:", toolUsage))
        // console.log(chalk.cyan.bold("model:", model))
        // console.log(chalk.green.bold("tools:", fullToolListWithArgs))
      }

      if (decision.type === "terminate") {
        return {
          strategyResult: {
            type: "terminate",
            reasoning: decision.reasoning,
            usdCost: usdCost ?? 0,
          },
          debugPrompt,
        }
      }

      //likely bug: toolKeys.includes() check may fail due to type casting issues
      if (
        decision.type === "tool" &&
        decision.toolName &&
        String(decision.toolName) in tools
      ) {
        return {
          strategyResult: {
            type: "tool",
            toolName: decision.toolName as keyof T,
            reasoning: decision.reasoning,
            plan: decision.plan || "",
            check: decision.check || undefined,
            expectsMutation: decision.expectsMutation,
            usdCost: usdCost ?? 0,
          },
          debugPrompt,
        }
      }

      // Invalid toolName
      return {
        strategyResult: {
          type: "terminate",
          reasoning: "Invalid tool selected: " + decision.toolName,
          usdCost: usdCost ?? 0,
        },
        debugPrompt,
      }
    }

    // Handle failed request case
    return {
      strategyResult: {
        type: "error",
        reasoning: error ?? "Unknown error",
        usdCost: usdCost ?? 0,
      },
      debugPrompt,
    }
  } catch (error) {
    lgg.error("Error in selectToolStrategyV3:", error)
    let message = "Error in strategy selection."
    if (typeof error === "string") {
      message = error
    }
    if (error instanceof Error) {
      message = error.message
    }
    return {
      strategyResult: { type: "error", reasoning: message, usdCost: 0 },
      debugPrompt,
    }
  }
}
