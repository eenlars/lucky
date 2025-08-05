import { lgg } from "@utils/logging/Logger"
import { WebArenaLoader } from "../WebArenaLoader"

/**
 * example usage of WebArenaLoader to fetch WebArena benchmark tasks
 * and convert them to WorkflowIO format for evaluation
 */
async function main() {
  try {
    lgg.info("🌐 WebArena Benchmark Example")

    // fetch a specific task by ID
    lgg.info("\n📋 Fetching specific task...")
    const specificTask = await WebArenaLoader.fetchById(0)
    lgg.info(`Task ${specificTask.task_id}: ${specificTask.intent}`)
    lgg.info(`Sites: ${specificTask.sites.join(", ")}`)
    lgg.info(`Requires login: ${specificTask.require_login}`)
    lgg.info(`Evaluation types: ${specificTask.eval.eval_types.join(", ")}`)

    // fetch tasks for specific sites
    lgg.info("\n🛍️ Fetching shopping-related tasks...")
    const shoppingTasks = await WebArenaLoader.fetchBySites(["shopping"], 3)
    lgg.info(`Found ${shoppingTasks.length} shopping tasks:`)
    shoppingTasks.forEach((task) => {
      lgg.info(`  - Task ${task.task_id}: ${task.intent}`)
    })

    // fetch tasks as WorkflowIO for evaluation
    lgg.info("\n🔄 Converting tasks to WorkflowIO format...")
    const workflowTasks = await WebArenaLoader.fetchAsWorkflowIO(5)
    lgg.info(`Converted ${workflowTasks.length} tasks to WorkflowIO format`)

    workflowTasks.forEach((workflow, index) => {
      lgg.info(`\n--- WorkflowIO ${index + 1} ---`)
      lgg.info("Input:")
      lgg.info(workflow.workflowInput.substring(0, 200) + "...")
      lgg.info("Expected Output:")
      lgg.info(workflow.expectedWorkflowOutput.substring(0, 200) + "...")
    })

    // fetch tasks filtered by specific sites
    lgg.info("\n🌍 Fetching reddit and gitlab tasks...")
    const filteredTasks = await WebArenaLoader.fetchAsWorkflowIO(5, [
      "reddit",
      "gitlab",
    ])
    lgg.info(`Found ${filteredTasks.length} tasks for reddit and gitlab`)

    filteredTasks.forEach((workflow, index) => {
      lgg.info(`\n--- Reddit/Gitlab Task ${index + 1} ---`)
      lgg.info(workflow.workflowInput.substring(0, 150) + "...")
    })
  } catch (error) {
    lgg.error("❌ Error in WebArena example:", error)
  }
}

// run the example
if (require.main === module) {
  main()
}
