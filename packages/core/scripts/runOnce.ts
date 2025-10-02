#!/usr/bin/env bun
// core/scripts/runOnce.ts

import { resolve } from "node:path"
import { PATHS, SELECTED_QUESTION } from "@core/core-config/compat"
import { lgg } from "@core/utils/logging/Logger"
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import chalk from "chalk"

async function runOnce(setupFilePath?: string) {
  try {
    const setupPath = setupFilePath ? resolve(setupFilePath) : PATHS.setupFile
    lgg.log(chalk.green(`🚀 Running workflow once${setupPath ? ` with ${setupPath}` : ""}`))

    const {
      success,
      error,
      data: results,
      usdCost,
    } = await invokeWorkflow({
      filename: setupPath,
      evalInput: SELECTED_QUESTION,
    })

    if (!success || !results) {
      lgg.error(`[RunOnce] Workflow failed: ${error}`)
      process.exit(1)
    }

    // display results
    const firstResult = results[0]
    const workflowInvocationId = firstResult.workflowInvocationId
    const isPromptOnly = SELECTED_QUESTION.type === "prompt-only"

    lgg.log(`\n📊 Results (${results.length} cases):`)
    if (firstResult.fitness) {
      lgg.log(`${isPromptOnly ? "Fitness Score" : "Average Fitness Score"}: ${firstResult.fitness.score.toFixed(3)}`)
    }
    lgg.log(`Total Cost: $${(usdCost || 0).toFixed(4)}`)
    lgg.log(`Full trace: ${chalk.blue(`http://flowgenerator.vercel.app/trace/${workflowInvocationId}`)}`)

    // save minimal results
    const resultsPath = `${PATHS.node.logging}/runOnce/runOnce_results.json`
    await lgg.logAndSave(resultsPath, {
      fitness: firstResult.fitness,
      cost: usdCost || 0,
      feedback: firstResult.feedback,
      finalOutput: firstResult.queueRunResult.finalWorkflowOutput,
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
