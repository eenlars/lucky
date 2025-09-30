#!/usr/bin/env bun

import { writeFileSync } from "fs"
import { join } from "path"
import { createEvolutionVisualizationData } from "../lib/evolution-utils"
import { traceWorkflowEvolution } from "./workflow-evolution-tracer"

async function generateEvolutionGraph(invocationId: string) {
  console.log(`🔍 Tracing evolution for invocation: ${invocationId}`)

  const graph = await traceWorkflowEvolution(invocationId)

  if (!graph) {
    console.error("❌ Failed to trace evolution")
    process.exit(1)
  }

  console.log(`✅ Successfully traced evolution with ${graph.allNodes.length} nodes`)

  const visualization = createEvolutionVisualizationData(graph)

  // save the complete data
  const outputPath = join(process.cwd(), `src/results/evolution-graph-${invocationId}.json`)
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        invocationId,
        generatedAt: new Date().toISOString(),
        graph,
        visualization,
      },
      null,
      2,
    ),
  )

  console.log(`💾 Evolution graph saved to: ${outputPath}`)

  // print summary
  console.log("\n📊 EVOLUTION SUMMARY")
  console.log("===================")
  console.log(`🎯 Target Accuracy: ${visualization.summary.targetAccuracy}%`)
  console.log(`📈 Peak Accuracy: ${visualization.summary.peakAccuracy}%`)
  console.log(`🔄 Total Iterations: ${visualization.summary.totalIterations}`)
  console.log(`✅ Success Rate: ${visualization.summary.successRate}%`)
  console.log(`💰 Total Cost: $${visualization.summary.totalCost}`)
  console.log(`⏱️  Duration: ${visualization.summary.evolutionDuration} hours`)
  console.log(`🏁 Milestones: ${visualization.milestones.length}`)

  console.log("\n🎯 KEY MILESTONES")
  console.log("=================")
  visualization.milestones.forEach((milestone: any, _i: number) => {
    const emoji = milestone.isTarget ? "🎯" : "📍"
    console.log(`${emoji} ${milestone.accuracy}% - ${milestone.invocationId}`)
  })

  console.log("\n📋 EVOLUTION GOAL")
  console.log("=================")
  console.log(visualization.summary.evolutionGoal.trim())

  return { graph, visualization }
}

// run with command line argument or default
const invocationId = process.argv[2] || "b463376e"
generateEvolutionGraph(invocationId)
  .then(() => {
    console.log("\n🎉 Generation complete!")
  })
  .catch(err => {
    console.error("❌ Generation failed:", err)
    process.exit(1)
  })
