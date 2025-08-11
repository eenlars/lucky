#!/usr/bin/env bun
// core/scripts/runOnce.ts

import { AggregatedEvaluator } from "@core/improvement/evaluators/AggregatedEvaluator"
import { NoEvaluator } from "@core/improvement/evaluators/NoEvaluator"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { lgg } from "@core/utils/logging/Logger"
import { WorkflowConfigHandler } from "@core/workflow/setup/WorkflowLoader"
import { Workflow } from "@core/workflow/Workflow"
import { PATHS } from "@runtime/settings/constants"
import { SELECTED_QUESTION } from "@runtime/settings/inputs"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import chalk from "chalk"
import { resolve } from "path"
import { llmify } from "../src/utils/common/llmify"

async function runOnce(setupFilePath?: string) {
  try {
    // use provided setup file or default
    const setupPath = setupFilePath ? resolve(setupFilePath) : PATHS.setupFile
    lgg.log(
      chalk.green(
        `🚀 Running workflow once${setupPath ? ` with ${setupPath}` : ""}`
      )
    )

    // load workflow setup
    const setup = await WorkflowConfigHandler.getInstance().loadSingleWorkflow(
      setupFilePath ?? PATHS.setupFile
    )

    lgg.log(JSONN.show(setup, 2))

    const toolContext: Partial<ToolExecutionContext> | undefined =
      SELECTED_QUESTION.outputSchema
        ? { expectedOutputType: SELECTED_QUESTION.outputSchema }
        : undefined

    // create workflow
    const runner = Workflow.create({
      config: setup,
      evaluationInput: SELECTED_QUESTION,
      toolContext,
    })

    // set workflow IO with ingestion
    await runner.prepareWorkflow(SELECTED_QUESTION, "none")

    // choose evaluator: for prompt-only, skip evaluation and AI enhancements
    const isPromptOnly = SELECTED_QUESTION.type === "prompt-only"
    const evaluator = isPromptOnly
      ? new NoEvaluator()
      : new AggregatedEvaluator()

    // run (and optionally evaluate)
    lgg.log(
      isPromptOnly
        ? "running workflow (prompt-only: NoEvaluator, no correctness evaluation)"
        : "running and evaluating workflow..."
    )
    const {
      success,
      error,
      data: evaluationResult,
    } = await evaluator.evaluate(runner)

    if (!success) {
      lgg.error(
        `[RunOnce] Evaluation failed for workflow ${runner.getWorkflowVersionId()}: ${error}`
      )
      process.exit(1)
    }

    // display results
    const workflowInvocationId = runner.getWorkflowInvocationId()
    lgg.log(`\n📊 Results (aggregated ${runner.getWorkflowIO().length} cases):`)
    lgg.log(
      `${isPromptOnly ? "Fitness Score" : "Average Fitness Score"}: ${evaluationResult.fitness.score.toFixed(3)}`
    )
    lgg.log(`Total Cost: $${evaluationResult.cost.toFixed(4)}`)
    lgg.log(
      `Full trace: ${chalk.blue(`http://flowgenerator.vercel.app/trace/${workflowInvocationId}`)}`
    )

    // save minimal results
    const resultsPath = `${PATHS.node.logging}/runOnce/runOnce_results.json`
    await lgg.logAndSave(resultsPath, {
      fitness: evaluationResult.fitness,
      cost: evaluationResult.cost,
      feedback: llmify(evaluationResult.feedback),
    })

    lgg.log(`\n✅ Results saved to: ${resultsPath}`)

    process.exit(0)
  } catch (err) {
    lgg.error("❌ Run failed:", err)
    if (err instanceof Error) {
      lgg.error("Stack trace:", err.stack)
    }
    process.exit(1)
  }
}

// handle command line args
const args = process.argv.slice(2)
const setupFile = args[0]

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: bun run scripts/runOnce.ts [setup-file-path]

Run a workflow setup file once without iterative improvements.

Arguments:
  setup-file-path   Optional path to custom setup file (defaults to setupfile.json)

Examples:
  bun run scripts/runOnce.ts
  bun run scripts/runOnce.ts ./custom-setup.json
  `)
  process.exit(0)
}

// run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnce(setupFile)
}

export { runOnce }
