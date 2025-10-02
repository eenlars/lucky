/**
 * Example usage of the GAIA benchmark dataset loader
 *
 * GAIA (General AI Assistants) is a benchmark for evaluating AI systems
 * on complex, multi-step reasoning tasks that often require tool use.
 */

import { GAIALoader } from "../GAIALoader"
import { GAIALocalLoader } from "../GAIALocalLoader"

async function demonstrateGAIAUsage() {
  console.log("=== GAIA Dataset Usage Examples ===\n")

  // 1. Get dataset statistics
  console.log("1. Dataset Statistics:")
  const stats = GAIALocalLoader.getStats()
  console.log(`Total instances: ${stats.total}`)
  console.log(`Level 1 (easy): ${stats.byLevel[1]}`)
  console.log(`Level 2 (medium): ${stats.byLevel[2]}`)
  console.log(`Level 3 (hard): ${stats.byLevel[3]}`)
  console.log(`Instances with files: ${stats.hasFile}`)

  // 2. Fetch specific instance by ID
  console.log("\n2. Fetch specific instance:")
  const instance = await GAIALoader.fetchById("c61d22de-5f6c-4958-a7f6-5e9707bd3466")
  console.log(`Task ID: ${instance.task_id}`)
  console.log(`Question: ${instance.Question}`)
  console.log(`Level: ${instance.Level}`)
  console.log(`Answer: ${instance["Final answer"]}`)

  // 3. Fetch instances by difficulty level
  console.log("\n3. Fetch by difficulty level:")
  const easyTasks = await GAIALoader.fetchByLevel(1, "validation", 3)
  console.log(`Found ${easyTasks.length} easy tasks:`)
  easyTasks.forEach(task => {
    console.log(`- ${task.Question.substring(0, 80)}...`)
  })

  // 4. Get random instances for testing
  console.log("\n4. Random instances for testing:")
  const randomTasks = GAIALocalLoader.fetchRandom(3, "validation")
  randomTasks.forEach(task => {
    console.log(`- Level ${task.Level}: ${task.Question.substring(0, 60)}...`)
  })

  // 5. Check for instances with file attachments
  console.log("\n5. Instances with file attachments:")
  const withFiles = await GAIALoader.fetchByLevel(2, "validation", 50)
  const fileInstances = withFiles.filter(t => t.file_name)
  console.log(`Found ${fileInstances.length} instances with files:`)
  fileInstances.slice(0, 3).forEach(task => {
    console.log(`- ${task.task_id}: ${task.file_name}`)
  })

  // 6. Example of using GAIA in a workflow
  console.log("\n6. Example workflow usage:")
  const testInstance = await GAIALoader.fetchById("5d0080cb-90d7-4712-bc33-848150e917d3")
  console.log(`Question: "${testInstance.Question}"`)
  console.log(`Expected answer: "${testInstance["Final answer"]}"`)
  console.log("This would be passed to an AI agent for solving...")
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateGAIAUsage().catch(console.error)
}

export { demonstrateGAIAUsage }
