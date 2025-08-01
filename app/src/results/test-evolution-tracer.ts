"use server"

import { traceWorkflowEvolution } from "./workflow-evolution-tracer"
import { createEvolutionVisualizationData } from "../lib/evolution-utils"
import { writeFileSync } from "fs"
import { join } from "path"

async function testEvolutionTracer() {
  console.log("Testing evolution tracer with b463376e...")

  const graph = await traceWorkflowEvolution("b463376e")

  if (!graph) {
    console.error("Failed to trace evolution")
    return
  }

  console.log("\n=== EVOLUTION GRAPH SUMMARY ===")
  console.log("Target Node:", {
    invocationId: graph.targetNode.invocationId,
    accuracy: graph.targetNode.accuracy,
    fitnessScore: graph.targetNode.fitnessScore,
    status: graph.targetNode.status,
  })

  console.log("\nEvolution Run:", {
    runId: graph.evolutionRun.runId,
    status: graph.evolutionRun.status,
    goal: graph.evolutionRun.goalText.substring(0, 100) + "...",
  })

  console.log("\nStatistics:", graph.stats)

  console.log("\nAccuracy Progression (first 10):")
  graph.accuracyProgression.slice(0, 10).forEach((point, i) => {
    console.log(
      `${i + 1}. ${point.invocationId}: ${point.accuracy}% at ${point.timestamp}`
    )
  })

  // create visualization data
  const vizData = createEvolutionVisualizationData(graph)

  console.log("\n=== VISUALIZATION DATA ===")
  console.log("Summary:", vizData.summary)
  console.log("Timeline points:", vizData.timeline.length)
  console.log("Milestones:", vizData.milestones.length)

  console.log("\nKey Milestones:")
  vizData.milestones.forEach((milestone: any, i: number) => {
    console.log(`${i + 1}. ${milestone.invocationId}: ${milestone.description}`)
  })

  // save to JSON file for visualization
  const outputPath = join(
    process.cwd(),
    "src/results/evolution-graph-b463376e.json"
  )
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        graph,
        visualization: vizData,
      },
      null,
      2
    )
  )

  console.log(`\nEvolution graph saved to: ${outputPath}`)

  return { graph, vizData }
}

// run the test
testEvolutionTracer()
  .then(() => {
    console.log("\n=== TEST COMPLETE ===")
  })
  .catch((err) => {
    console.error("Test failed:", err)
  })
