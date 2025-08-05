#!/usr/bin/env bun
// Simple cultural evolution test on random SWE-bench evaluation

import { AggregatedEvaluator } from "@core/improvement/evaluators/AggregatedEvaluator"
import { lgg } from "@core/utils/logging/Logger"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import {
  loadSingleWorkflow,
  saveWorkflowConfig,
} from "@core/workflow/setup/WorkflowLoader"
import { Workflow } from "@core/workflow/Workflow"
import { CONFIG, PATHS } from "@runtime/settings/constants"
import { nanoid } from "nanoid"

// Random SWE-bench IDs
const SWEBENCH_IDS = [
  "django__django-11099",
  "requests__requests-2317",
  "django__django-12453",
  "sympy__sympy-20154",
  "scikit-learn__scikit-learn-13496",
]

async function runCulturalTest() {
  const randomId = SWEBENCH_IDS[Math.floor(Math.random() * SWEBENCH_IDS.length)]

  const evaluationInput: EvaluationInput = {
    type: "swebench",
    swebenchId: randomId,
    goal: "Fix the bug described in the issue",
    workflowId: `swe-bench-${randomId}-${nanoid(6)}`,
  } as any

  lgg.log(`🎲 Testing SWE-bench ID: ${randomId}`)
  lgg.log(
    `🧬 Running ${CONFIG.evolution.culturalIterations} cultural iterations`
  )

  const evaluator = new AggregatedEvaluator()
  let workflowPath = PATHS.setupFile
  const results = []

  for (let i = 1; i <= CONFIG.evolution.culturalIterations; i++) {
    lgg.log(`\n🔄 Iteration ${i}/${CONFIG.evolution.culturalIterations}`)

    const setup = await loadSingleWorkflow(workflowPath)
    const workflow = Workflow.create({
      config: setup,
      evaluationInput,
      toolContext: {},
    })

    await workflow.prepareWorkflow(evaluationInput)
    const result = await evaluator.evaluate(workflow)

    if (!result.success) {
      throw new Error(`Iteration ${i} failed: ${result.error}`)
    }

    const { fitness, cost } = result.data
    results.push({ iteration: i, fitness: fitness.score, cost })

    lgg.log(`✅ Fitness: ${fitness.score}, Cost: $${cost.toFixed(4)}`)

    // Save for next iteration
    const nextPath = `${PATHS.node.logging}/cultural/workflow_${i}.json`
    await saveWorkflowConfig(workflow.getConfig(), nextPath)
    workflowPath = `output/${nextPath}`
  }

  const totalCost = results.reduce((sum, r) => sum + r.cost, 0)
  const bestFitness = Math.max(...results.map((r) => r.fitness))

  lgg.log(`\n🏆 Best fitness: ${bestFitness}`)
  lgg.log(`💰 Total cost: $${totalCost.toFixed(4)}`)
  lgg.log(
    `📈 Progression: ${results.map((r) => r.fitness.toFixed(1)).join(" → ")}`
  )

  return { randomId, results, totalCost, bestFitness }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCulturalTest().catch(console.error)
}
