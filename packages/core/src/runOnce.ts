#!/usr/bin/env bun
// src/core/runOnce.ts

import type { ToolExecutionContext } from "@/tools/toolFactory"
import { JSONN } from "@/utils/file-types/json/jsonParse"
import { lgg } from "@/logger"
import { PATHS } from "@/runtime/settings/constants"
import { SELECTED_QUESTION } from "@/runtime/settings/inputs"
import { AggregatedEvaluator } from "@improvement/evaluators/AggregatedEvaluator"
import { WorkflowConfigHandler } from "@workflow/setup/WorkflowLoader"
import { Workflow } from "@workflow/Workflow"
import chalk from "chalk"
import { resolve } from "path"
import { llmify } from "./utils/common/llmify"

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
      SELECTED_QUESTION.expectedOutputSchema
        ? { expectedOutputType: SELECTED_QUESTION.expectedOutputSchema }
        : undefined

    // create workflow
    const runner = Workflow.create({
      config: setup,
      evaluationInput: SELECTED_QUESTION,
      toolContext,
    })

    // set workflow IO with ingestion
    await runner.prepareWorkflow(SELECTED_QUESTION)

    // create evaluator
    const aggregatedEvaluator = new AggregatedEvaluator()

    // run evaluation
    lgg.log("running and evaluating workflow...")
    const {
      success,
      error,
      data: evaluationResult,
    } = await aggregatedEvaluator.evaluate(runner)

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
      `   Average Fitness Score: ${evaluationResult.fitness.score.toFixed(3)}`
    )
    lgg.log(`   Total Cost: $${evaluationResult.cost.toFixed(2)}`)
    lgg.log(
      `   Full trace: ${chalk.blue(`http://flowgenerator.vercel.app/trace/${workflowInvocationId}`)}`
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
Usage: bun run src/core/runOnce.ts [setup-file-path]

Run a workflow setup file once without iterative improvements.

Arguments:
  setup-file-path   Optional path to custom setup file (defaults to setupfile.json)

Examples:
  bun run src/core/runOnce.ts
  bun run src/core/runOnce.ts ./custom-setup.json
  `)
  process.exit(0)
}

// run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runOnce(setupFile)
}

export { runOnce }
