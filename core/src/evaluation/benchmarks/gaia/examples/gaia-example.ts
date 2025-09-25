import { IngestionLayer } from "@core/workflow/ingestion/IngestionLayer"
import type { EvaluationInput, WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { GAIALocalLoader } from "../GAIALocalLoader"

/**
 * example: using GAIA benchmark for workflow evaluation
 *
 * GAIA (General AI Assistants) is a comprehensive benchmark that tests
 * AI capabilities including reasoning, multi-modality handling, web browsing,
 * and tool-use proficiency across three difficulty levels.
 */

async function runGAIAExample() {
  console.log("GAIA Benchmark Example")
  console.log("======================\n")

  // check if GAIA data is available locally
  if (!GAIALocalLoader.isDataAvailable()) {
    console.log("❌ GAIA data not found!")
    console.log("Please run: python download_gaia.py")
    console.log("Make sure to set HF_TOKEN environment variable first")
    return
  }

  console.log("✅ GAIA data found locally\n")

  // example 1: get dataset statistics
  const stats = GAIALocalLoader.getStats()
  console.log("Dataset Statistics:")
  console.log("- Total tasks:", stats.total)
  console.log("- By level:", stats.byLevel)
  console.log("- Tasks with files:", stats.hasFile)
  console.log()

  // example 2: fetch tasks by difficulty level
  const level1Tasks = GAIALocalLoader.fetchByLevel(1, "validation", 3)
  console.log(`Found ${level1Tasks.length} level 1 tasks:`)

  for (const task of level1Tasks) {
    console.log(`- Task ${task.task_id}: ${task.Question.substring(0, 80)}...`)
    console.log(`Level: ${task.Level}, Has file: ${!!task.file_name}`)
  }
  console.log()

  // example 3: convert first task to workflow format
  if (level1Tasks.length > 0) {
    const firstTask = level1Tasks[0]
    console.log(`Converting task ${firstTask.task_id} to workflow format:`)

    const gaiaEvaluation: EvaluationInput = {
      type: "gaia",
      taskId: firstTask.task_id,
      level: 1,
      split: "validation",
      goal: "Solve this GAIA benchmark task accurately",
      workflowId: "gaia-solver-workflow",
    }

    // convert GAIA evaluation to WorkflowIO format
    const workflowCases: WorkflowIO[] = await IngestionLayer.convert(gaiaEvaluation)

    console.log("✅ Successfully converted to workflow format")
    console.log("Input keys:", Object.keys(workflowCases[0].workflowInput))
    console.log("Expected output keys:", Object.keys(workflowCases[0].workflowOutput))
    console.log()
  }

  // example 4: get random tasks for testing
  const randomTasks = GAIALocalLoader.fetchRandom(2, "validation")
  console.log(`Random tasks for testing:`)
  for (const task of randomTasks) {
    console.log(`- ${task.task_id} (Level ${task.Level}): ${task.Question.substring(0, 60)}...`)
  }
}

// important notes:
// 1. GAIA is a gated dataset on Hugging Face - you need to request access
// 2. Set HF_TOKEN environment variable for authentication
// 3. Some GAIA tasks include file attachments (images, spreadsheets)
// 4. Answer format varies: strings, numbers, or comma-separated lists
// 5. The benchmark has 466 total questions across 3 difficulty levels

// to run with authentication:
// HF_TOKEN=your_token_here bun run flow

if (require.main === module) {
  runGAIAExample()
}

export { runGAIAExample }
