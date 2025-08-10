import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  toolUsageToString,
  type StrategyResult,
} from "@core/messages/pipeline/agentStepLoop/utils"
import type { SelectToolStrategyOptions } from "@core/messages/pipeline/selectTool/toolstrategy.types"
import { explainTools } from "@core/tools/any/explainTools"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { CONFIG } from "@runtime/settings/constants"
import type { CoreMessage, ToolSet } from "ai"
import chalk from "chalk"
import { z } from "zod"

const verbose = CONFIG.logging.override.Tools
const verboseOverride = true

// TODO-later: if we want to invoke other nodes from this node, this can be part of the strategy.
// this means no message-based system, so it needs thinking.

/**
 * V2: Decides next action: terminate or select one tool with reasoning.
 * @param tools Available tools
 * @param messages Current conversation history
 * @returns {type: 'tool', toolName: keyof T, reasoning: string} or {type: 'terminate', reasoning: string}
 */
export async function selectToolStrategyV2<T extends ToolSet>(
  options: SelectToolStrategyOptions<T>
): Promise<StrategyResult<T>> {
  const {
    tools,
    identityPrompt,
    agentSteps,
    roundsLeft,
    systemMessage,
    model,
  } = options

  if (isNir(tools) || Object.keys(tools).length === 0) {
    // this should never happen.
    lgg.error("No tools available.", { tools, identityPrompt, roundsLeft })
    return { type: "terminate", reasoning: "No tools available.", usdCost: 0 }
  }

  const toolKeys = Object.keys(tools) as (keyof T)[]

  // Define schema for structured output
  const DecisionSchema = z.object({
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
  })

  const agentStepsString = toolUsageToString(agentSteps, 1000)

  // Analysis prompt
  const analysisMessages: CoreMessage[] = [
    {
      role: "system",
      content: `
      #decide
      Decide the next action:
      - If the task is complete or no more tools needed, use {type: "terminate", reasoning: "..."}
      - If a specific tool should be used next, use {type: "tool", toolName: "...", reasoning: "...", plan: "..."} and describe the plan
      
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
      - if you do not want to use it, you should explain in reasoning why you think you should not use it.
      
      #PRIMARY INSTRUCTION (MOST IMPORTANT)
      This is the node's core instruction that MUST be followed:
      ${systemMessage}
      
      CRITICAL: If the primary instruction contains action verbs (ask, find, search, write, create, etc.), 
      you MUST use the appropriate tool. Do NOT terminate if there are explicit action instructions.

      # you are
      ${identityPrompt}

      # the context of the current node

      ${
        !isNir(agentSteps)
          ? `
      #these were the past calls (NOTE: if you see repeated calls, you should either terminate or do something else.):
      ${agentStepsString}`
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
      schema: DecisionSchema,
      debug: true,
      opts: {
        reasoning: true,
      },
    })

    if (success && decision) {
      if (decision.plan && (verbose || verboseOverride)) {
        console.log(chalk.bold("decision:", JSON.stringify(decision, null, 2)))
        // console.log(
        //   chalk.bold(
        //     "analysisMessages:",
        //     JSON.stringify(analysisMessages, null, 2)
        //   )
        // )
        // console.log(chalk.blueBright.bold("plan:", decision.plan))
        // console.log(chalk.blueBright.bold("reasoning:", decision.reasoning))
        // console.log(chalk.blueBright.bold("toolName:", decision.toolName))

        // console.log(chalk.yellow.bold("agentSteps:", agentSteps))
        // console.log(chalk.cyan.bold("model:", model))
        // console.log(chalk.green.bold("tools:", fullToolListWithArgs))
      }

      if (decision.type === "terminate") {
        return {
          type: "terminate",
          reasoning: decision.reasoning,
          usdCost: usdCost ?? 0,
        }
      }

      //likely bug: toolKeys.includes() check may fail due to type casting issues
      if (
        decision.type === "tool" &&
        decision.toolName &&
        String(decision.toolName) in tools
      ) {
        return {
          type: "tool",
          toolName: decision.toolName as keyof T,
          reasoning: decision.reasoning,
          plan: decision.plan || "",
          usdCost: usdCost ?? 0,
        }
      }

      // Invalid toolName
      return {
        type: "terminate",
        reasoning: "Invalid tool selected: " + decision.toolName,
        usdCost: usdCost ?? 0,
      }
    }

    // Handle failed request case
    return {
      type: "error",
      reasoning: error ?? "Unknown error",
      usdCost: usdCost ?? 0,
    }
  } catch (error) {
    console.error("Error in selectToolStrategyV2:", error)
    let message = "Error in strategy selection."
    if (typeof error === "string") {
      message = error
    }
    if (error instanceof Error) {
      message = error.message
    }
    return { type: "error", reasoning: message, usdCost: 0 }
  }
}
