/**
 * Tool selection strategy V3 with mutation awareness and diagnostic capabilities.
 * 
 * This module implements an advanced AI-driven tool selection algorithm that:
 * - Tracks environmental mutations to ensure proper observation sequences
 * - Provides diagnostic reasoning for parameter adjustments
 * - Outputs structured decisions with execution plans
 * - Defines success criteria for validation
 * - Prevents infinite loops and redundant tool calls
 * 
 * The strategy is the core decision-making component in multi-step agent loops,
 * determining whether to continue with another tool or terminate execution.
 */

import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"
import type {
  SelectToolStrategyOptions,
  StrategyResult,
} from "@core/messages/pipeline/selectTool/toolstrategy.types"
import { explainTools } from "@core/tools/any/explainTools"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { obs } from "@core/utils/observability/obs"
import { CONFIG } from "@runtime/settings/constants"
import type { CoreMessage, ToolSet } from "ai"
import chalk from "chalk"
import { createHash } from "crypto"
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
  const {
    tools,
    identityPrompt,
    agentSteps,
    roundsLeft,
    systemMessage,
    model,
  } = options

  // utility to create short hash for debugging and observability
  const shortHash = (s: string) =>
    createHash("sha256").update(s).digest("hex").slice(0, 8)

  return obs.span(
    "strategy.selectTool.v3",
    { model: String(model), rounds_left: roundsLeft ?? 0 },
    async () => {
      if (isNir(tools) || Object.keys(tools).length === 0) {
        // this should never happen.
        lgg.error("No tools available.", { tools, identityPrompt, roundsLeft })
        const result: StrategyResult<T> = {
          type: "terminate",
          reasoning: "No tools available.",
          usdCost: 0,
        }
        obs.event("strategy.selectTool:decision", {
          type: result.type,
          cost_usd: result.usdCost,
        })
        return { strategyResult: result, debugPrompt: "" }
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
      if (agentSteps && agentSteps.length > 0) {
        const lastReasoningLog = agentSteps.findLast(
          (log) => log.type === "reasoning"
        )
        if (lastReasoningLog?.return.includes("[EXPECTS_MUTATION]")) {
          previousToolExpectedMutation = true
        }
      }

      const agentStepsString = !isNir(agentSteps)
        ? toolUsageToString(agentSteps, 1000)
        : "no past calls"

      // Analysis prompt
      const analysisMessages: CoreMessage[] = [
        {
          role: "system",
          content: `
      DECIDE NEXT ACTION
      - Output must be JSON and match the schema (see "Structured Output Rules").
      - Choose exactly one: {type: "tool"} or {type: "terminate"}.

      OBJECTIVE
      - Follow the Primary Instruction strictly.

      PRIMARY INSTRUCTION
      ${primaryInstruction}

      CONTEXT
      - Rounds left: ${roundsLeft}
      - Conversation history:
      ${identityPrompt}
      - Past calls:
      ${agentStepsString}
      ${
        previousToolExpectedMutation
          ? `
          - Note: previous tool expected mutation. Prefer an observation tool next.
            Only skip if observation is already present or unnecessary, and justify.
          `
          : ""
      }

      GUIDELINES
      - Use a tool for actionable requests (ask/search/get/find/write/etc.).
      - Do not repeat the same tool with the same intent unless something changed
        or a new observation is strictly required.
      - Select only ONE tool when using a tool.
      - Provide clear reasoning.
      - Provide a concrete plan with explicit parameters.
      - If a read/check step already happened, choose a write/create tool next.

      DIAGNOSE & ADAPT (GENERIC)
      - From recent outputs/logs, infer likely issues:
        range constraints, required fields, type mismatches, quota/rate,
        auth/state, or other.
      - If a constraint is suspected, prefer one of:
        (a) parameter-tuning with concrete argument changes,
        (b) decomposition into smaller subgoals,
        (c) observation/validation,
        (d) termination with reasoning.
      - Do not guess hidden values; base parameter changes on evidence.

      STRUCTURED OUTPUT RULES
      - Respond ONLY with raw JSON matching the schema.
      - No wrappers (e.g., <json>).
      - No commentary.
      - No extra fields.
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
      obs.event("strategy.selectTool:prompt", {
        length: debugPrompt.length,
        hash: shortHash(debugPrompt),
      })

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
            reasoning: false,
          },
        })

        if (success && decision) {
          if (decision.plan && (verbose || verboseOverride)) {
            console.log(
              chalk.bold("decision:", JSON.stringify(decision, null, 2))
            )
            // console.log(chalk.blueBright.bold("plan:", decision.plan))
            // console.log(chalk.blueBright.bold("reasoning:", decision.reasoning))
            // console.log(chalk.blueBright.bold("toolName:", decision.toolName))

            // console.log(chalk.yellow.bold("agentSteps:", agentSteps))
            // console.log(chalk.cyan.bold("model:", model))
            // console.log(chalk.green.bold("tools:", fullToolListWithArgs))
          }

          if (decision.type === "terminate") {
            const result: StrategyResult<T> = {
              type: "terminate",
              reasoning: decision.reasoning,
              usdCost: usdCost ?? 0,
            }
            obs.event("strategy.selectTool:decision", {
              type: result.type,
              cost_usd: result.usdCost,
            })
            return { strategyResult: result, debugPrompt }
          }

          //likely bug: toolKeys.includes() check may fail due to type casting issues
          if (
            decision.type === "tool" &&
            decision.toolName &&
            String(decision.toolName) in tools
          ) {
            const result: StrategyResult<T> = {
              type: "tool",
              toolName: decision.toolName as keyof T,
              reasoning: decision.reasoning,
              plan: decision.plan || "",
              check: decision.check || undefined,
              expectsMutation: decision.expectsMutation,
              usdCost: usdCost ?? 0,
            }
            obs.event("strategy.selectTool:decision", {
              type: result.type,
              tool: (result as any).toolName,
              cost_usd: (result as any).usdCost ?? 0,
            })
            return { strategyResult: result, debugPrompt }
          }

          // Invalid toolName
          {
            const result: StrategyResult<T> = {
              type: "terminate",
              reasoning: "Invalid tool selected: " + decision.toolName,
              usdCost: usdCost ?? 0,
            }
            obs.event("strategy.selectTool:decision", {
              type: result.type,
              cost_usd: result.usdCost,
            })
            return { strategyResult: result, debugPrompt }
          }
        }

        // Handle failed request case
        {
          const result: StrategyResult<T> = {
            type: "error",
            reasoning: error ?? "Unknown error",
            usdCost: usdCost ?? 0,
          }
          obs.event("strategy.selectTool:decision", {
            type: result.type,
            cost_usd: result.usdCost,
          })
          return { strategyResult: result, debugPrompt }
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
        const result: StrategyResult<T> = {
          type: "error",
          reasoning: message,
          usdCost: 0,
        }
        obs.event("strategy.selectTool:decision", {
          type: result.type,
          cost_usd: result.usdCost,
        })
        return { strategyResult: result, debugPrompt }
      }
    }
  )
}
