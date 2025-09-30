import { askLLM } from "@core/messages/api/genObject"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"
import type { SelectToolStrategyOptions, StrategyResult } from "@core/messages/pipeline/selectTool/toolstrategy.types"
import { explainTools } from "@core/tools/any/explainTools"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { obs } from "@core/utils/observability/obs"
import { CONFIG, isLoggingEnabled } from "@core/core-config/compat"
import type { ModelMessage, ToolSet } from "ai"
import chalk from "chalk"
import { createHash } from "crypto"
import { z } from "zod"

const verbose = isLoggingEnabled("Tools")
const verboseOverride = true

// TODO-later: if we want to invoke other nodes from this node, this can be part of the strategy.

/**
 * V3: Decides next action: terminate or select one tool with reasoning.
 * @param tools Available tools
 * @param identityPrompt Current conversation history
 * @returns {type: 'tool', toolName: keyof T, reasoning: string} or {type: 'terminate', reasoning: string}
 */
export async function selectToolStrategyV3<T extends ToolSet>(
  options: SelectToolStrategyOptions<T>,
): Promise<{
  strategyResult: StrategyResult<T> // the result of the strategy
  debugPrompt: string // debugprompt is to check what has been sent to the model.
}> {
  const { tools, identityPrompt, agentSteps, roundsLeft, systemMessage, model } = options

  const shortHash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 8)

  return obs.span("strategy.selectTool.v3", { model: String(model), rounds_left: roundsLeft ?? 0 }, async () => {
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

    let agentStepsString = ""
    let agentStepsAnalysis: string | null = null

    if (!isNir(agentSteps)) {
      agentStepsString = toolUsageToString(agentSteps, 1000, {
        includeArgs: true,
      })
      agentStepsAnalysis = await askLLM(
        `
          # role
          you are the trace observer.
          - you talk as if you are talking to someone who has no idea what is going on.
          - you explain what you see in concise words.
          
          # task:
          - Analyze the following data: ${agentStepsString}
          - explain which steps already happened, what our assumptions are.
        
          # context
          this was the identity prompt, which must have been strictly followed.
          <identity_prompt>
          ${identityPrompt}
          </identity_prompt>

          # limitations
          never do more than observing. you are the observer, and you do not synthesize or decide, and never advice.
          do the output in the same format as the style in the example.
          
          # output
          the following is a good output *example* of when the trace is not going well (the things in brackets help guide you):

          input: identity prompt: 'you must find a recipe from italy, do one tool call max'.

          trace until now (organize it in logical steps - it doesn't have to follow the exact schema, it needs to follow logical steps):
          1. we called the GetRecipe tool because we need to get a good recipe
          2. it returned an error, our request asked for asian recipes.
          3. we ran it again, and it showed us a recipe that showed promise
          4. since our objective is to continue searching, we used another tool: doGoogleSearch
          5. it returned empty

          the observations from looking at the trace:
          1. Until now, the agent trace has shown misalignment of the identity prompt. (observation)
            - the prompt said to check for italy, but it looked for asian recipes. (specific explanation what happened)
          2. We see that the tool call to 'doGoogleSearch' was done, even though not allowed. (observation)
            - from the instructions, it says we can only find a recipe from italy (specific explanation)
          `,
        1,
        `
          first show the full trace until now. 
          then do a maximum 2 observations that would aid in next tool calls to make a good decision,
          keep it as concise and dense as possible
          `,
      )
    } else {
      agentStepsString = "no past calls"
    }

    const toolKeys = Object.keys(tools) as (keyof T)[]

    // Use provided system message as primary directive
    const primaryInstruction = systemMessage

    // Define schema for structured output (V3 with mutation observer support)
    // Require toolName when type === "tool" to avoid invalid selections
    const DecisionSchemaV3 = z.discriminatedUnion("type", [
      z.object({
        type: z.literal("terminate"),
        reasoning: z.string(),
        plan: z.string().optional(),
        check: z.string().nullable().optional(),
        expectsMutation: z.boolean().optional(),
      }),
      z.object({
        type: z.literal("tool"),
        toolName: toolKeys.length > 0 ? z.enum(toolKeys as [string, ...string[]]) : z.string(),
        reasoning: z.string(),
        plan: z.string().optional(),
        check: z.string().nullable().optional(),
        expectsMutation: z.boolean().optional(),
      }),
    ])

    // Check if previous reasoning indicated mutation expectation
    let previousToolExpectedMutation = false
    if (agentSteps && agentSteps.length > 0) {
      const lastReasoningLog = agentSteps.findLast(log => log.type === "reasoning")
      if (lastReasoningLog?.return.includes("[EXPECTS_MUTATION]")) {
        previousToolExpectedMutation = true
      }
    }

    // Analysis prompt
    const analysisMessages: ModelMessage[] = [
      {
        role: "system",
        content: `
      OBJECTIVE
      - You should make the optimal decision on how to go forward to get closer to achieving our task.
      - Follow the Primary Instruction strictly.
      - Use the tools to achieve the objective. Do not over-use tools. use them intelligently.

      DECIDE NEXT ACTION
      - Output must be JSON and match the schema (see "Structured Output Rules").
      - Choose exactly one: {type: "tool"} or {type: "terminate"}.

      PRIMARY INSTRUCTION
      ${primaryInstruction}

      ${
        agentStepsAnalysis
          ? `
        PAST TRACE OBSERVATIONS
        these are the past trace observations. These should aid you in decision making.
        <past_trace_observations>${agentStepsAnalysis}</past_trace_observations>`
          : ""
      }

      CONTEXT
      - Rounds left: ${roundsLeft} (if 0, terminate)
      - you are:
      ${identityPrompt}
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
      - NEVER run the same tool twice with the same intent.

      DIAGNOSE & ADAPT
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

    const debugPrompt = analysisMessages.map(m => m.content).join("\n")
    obs.event("strategy.selectTool:prompt", {
      length: debugPrompt.length,
      hash: shortHash(debugPrompt),
    })

    console.log(debugPrompt)

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
          console.log(chalk.bold("decision:", JSON.stringify(decision, null, 2)))
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
        if (decision.type === "tool" && decision.toolName && String(decision.toolName) in tools) {
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

      // Handle failed request case
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
  })
}
