/**
 * Integration example showing how to use the resilience framework
 * This demonstrates the full power of the framework in action
 */

import {
  applyResiliencePreset,
  CircuitBreakerFactory,
  recordWorkflowComplete,
  recordWorkflowStart,
  registerHealthCheck,
  serveDashboard,
  showDashboard,
  startDashboard,
  startHealthMonitoring,
  updateResilienceConfig,
  WorkflowCheckpoint,
  type SystemMetrics,
} from "@core/resilience"
import { lgg } from "@core/utils/logging/Logger"
import { Workflow } from "@core/workflow/Workflow"
import { resilientQueueRun } from "@core/workflow/runner/resilientQueueRun"

async function main() {
  // 1. configure resilience for production
  applyResiliencePreset("production")

  // 2. customize specific settings
  updateResilienceConfig({
    checkpointing: {
      enabled: true,
      autoCheckpointIntervalMs: 30000, // checkpoint every 30s
      maxCheckpoints: 10,
      resumeFromCheckpointByDefault: true,
    },
    retry: {
      maxAttempts: 5,
      initialDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitterFactor: 0.2,
    },
  })

  // 3. register custom health checks
  registerHealthCheck("openai-api", async () => {
    try {
      // check if OpenAI API is accessible
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      return {
        success: response.ok,
        metadata: { status: response.status },
      }
    } catch (error) {
      return {
        success: false,
        message: (error as Error).message,
      }
    }
  })

  registerHealthCheck("database", async () => {
    // simulate database health check
    const latency = Math.random() * 100
    return {
      success: latency < 90,
      metadata: { latencyMs: latency },
    }
  })

  // 4. start monitoring services
  startHealthMonitoring()
  startDashboard(5000) // refresh every 5s

  // 5. optionally serve dashboard on HTTP
  serveDashboard(3001) // http://localhost:3001

  // 6. create and run workflow with full resilience
  const workflow = await createExampleWorkflow()
  const workflowId = `wf_${Date.now()}`

  // record workflow start
  recordWorkflowStart(workflowId)
  const startTime = Date.now()

  try {
    // check if we can resume from checkpoint
    const checkpoint = new WorkflowCheckpoint(workflowId)
    const canResume = await checkpoint.exists()

    if (canResume) {
      lgg.info("Found existing checkpoint, resuming workflow...")
    }

    // run with full resilience
    const result = await resilientQueueRun({
      workflow,
      workflowInput: "Analyze the environmental impact of renewable energy",
      workflowInvocationId: workflowId,
      resumeFromCheckpoint: canResume,
      enableCheckpointing: true,
      enableHealthMonitoring: true,
    })

    // record completion
    const duration = Date.now() - startTime
    recordWorkflowComplete(workflowId, duration, result.totalCost)

    lgg.info("Workflow completed successfully!")
    lgg.info(`Total time: ${duration}ms`)
    lgg.info(`Total cost: $${result.totalCost}`)
    lgg.info(`Checkpoint used: ${result.checkpointUsed}`)

    if (result.nodeFailures) {
      lgg.warn("Node failures encountered:")
      result.nodeFailures.forEach((count, nodeId) => {
        lgg.warn(`  ${nodeId}: ${count} failures`)
      })
    }

    // 7. show circuit breaker stats
    const cbStats = CircuitBreakerFactory.getAllStats()
    lgg.info("\nCircuit Breaker Status:")
    Object.entries(cbStats).forEach(([name, stats]) => {
      lgg.info(
        `  ${name}: ${stats.state} (failures: ${stats.totalFailures}, success rate: ${((1 - stats.failureRate) * 100).toFixed(1)}%)`
      )
    })

    // 8. show final dashboard
    showDashboard()
  } catch (error) {
    lgg.error("Workflow failed:", error)
    recordWorkflowComplete(workflowId, Date.now() - startTime, 0)
  }
}

async function createExampleWorkflow(): Promise<Workflow> {
  // create a workflow that demonstrates resilience features
  const setup = {
    name: "resilient-research-workflow",
    nodes: [
      {
        nodeId: "researcher",
        role: "orchestrator",
        systemPrompt:
          "You are a research coordinator. Break down complex queries and delegate to specialists.",
        model: "gpt-4",
        tools: ["web_search", "delegate_task"],
      },
      {
        nodeId: "analyst",
        role: "worker",
        systemPrompt:
          "You are a data analyst. Analyze information and provide insights.",
        model: "gpt-3.5-turbo",
        tools: ["calculate", "create_chart"],
      },
      {
        nodeId: "writer",
        role: "worker",
        systemPrompt:
          "You are a technical writer. Synthesize information into clear reports.",
        model: "gpt-3.5-turbo",
        tools: ["format_document"],
      },
      {
        nodeId: "reviewer",
        role: "worker",
        systemPrompt:
          "You are a quality reviewer. Check work for accuracy and completeness.",
        model: "gpt-3.5-turbo",
        tools: ["check_facts"],
        waitingFor: ["analyst", "writer"], // waits for multiple inputs
      },
    ],
    connections: [
      { from: "start", to: "researcher" },
      { from: "researcher", to: "analyst" },
      { from: "researcher", to: "writer" },
      { from: "analyst", to: "reviewer" },
      { from: "writer", to: "reviewer" },
      { from: "reviewer", to: "end" },
    ],
  }

  // Create a minimal evaluation input compatible with the current API
  const evaluationInput = {
    type: "prompt-only" as const,
    goal: "research question",
    workflowId: "resilient-research-workflow",
  }

  return Workflow.create({
    // Example config structure is for demonstration; cast for typing compatibility
    config: setup as any,
    evaluationInput,
    toolContext: undefined,
  })
}

// monitoring dashboard endpoints
function getMetricsSnapshot(): SystemMetrics {
  const { getCurrentMetrics } = require("@core/resilience/monitoring")
  return getCurrentMetrics()
}

// graceful shutdown
process.on("SIGINT", () => {
  lgg.info("\nShutting down gracefully...")

  // stop monitoring
  const { stopHealthMonitoring, stopDashboard } = require("@core/resilience")
  stopHealthMonitoring()
  stopDashboard()

  // reset circuit breakers
  CircuitBreakerFactory.reset()

  process.exit(0)
})

// run the example
if (require.main === module) {
  main().catch((error) => {
    lgg.error("Example failed:", error)
    process.exit(1)
  })
}

export { createExampleWorkflow, getMetricsSnapshot, main }
