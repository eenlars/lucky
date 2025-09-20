/**
 * Test Data Builders - Creates consistent, realistic test data
 *
 * Following the Builder pattern for flexible test data creation
 */

import type { WorkflowEvent } from "@core/utils/observability/events/WorkflowEvents"
import type { InvocationInput, RunResult } from "@core/workflow/runner/types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"

export class WorkflowEventBuilder {
  private event: Partial<WorkflowEvent> = {}

  static create() {
    return new WorkflowEventBuilder()
  }

  workflowStarted(overrides: Partial<any> = {}) {
    this.event = {
      event: "workflow:started",
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      nodeCount: 3,
      entryNodeId: "entry-node",
      goal: "Test workflow execution",
      ...overrides,
    }
    return this
  }

  nodeExecutionStarted(overrides: Partial<any> = {}) {
    this.event = {
      event: "node:execution:started",
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      nodeId: "test-node-001",
      nodeType: "transform-node",
      attempt: 1,
      ...overrides,
    }
    return this
  }

  nodeExecutionCompleted(overrides: Partial<any> = {}) {
    this.event = {
      event: "node:execution:completed",
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      nodeId: "test-node-001",
      nodeType: "transform-node",
      duration: 1500,
      cost: 0.001,
      status: "success",
      ...overrides,
    }
    return this
  }

  workflowCompleted(overrides: Partial<any> = {}) {
    this.event = {
      event: "workflow:completed",
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      duration: 5000,
      totalCost: 0.005,
      nodeInvocations: 3,
      status: "success",
      ...overrides,
    }
    return this
  }

  messageQueued(overrides: Partial<any> = {}) {
    this.event = {
      event: "message:queued",
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      fromNodeId: "node-1",
      toNodeId: "node-2",
      messageSeq: 1,
      messageType: "workflow-message",
      ...overrides,
    }
    return this
  }

  build(): WorkflowEvent {
    return this.event as WorkflowEvent
  }
}

export class WorkflowConfigBuilder {
  private config: Partial<WorkflowConfig> = {}

  static create() {
    return new WorkflowConfigBuilder()
  }

  withBasicConfig(overrides: Partial<WorkflowConfig> = {}) {
    this.config = {
      entryNodeId: "entry-node",
      nodes: [
        {
          nodeId: "entry-node",
          description: "Entry node for testing",
          systemPrompt: "You are a test node",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["transform-node"],
        },
        {
          nodeId: "transform-node",
          description: "Transform node for testing",
          systemPrompt: "Transform the input",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: ["output-node"],
        },
        {
          nodeId: "output-node",
          description: "Output node for testing",
          systemPrompt: "Generate final output",
          modelName: getDefaultModels().default,
          mcpTools: [],
          codeTools: [],
          handOffs: [],
        },
      ],
      ...overrides,
    }
    return this
  }

  build(): WorkflowConfig {
    return this.config as WorkflowConfig
  }
}

export class InvocationInputBuilder {
  private input: Partial<InvocationInput> = {}

  static create() {
    return new InvocationInputBuilder()
  }

  withTextInput(overrides: Partial<any> = {}) {
    this.input = {
      evalInput: {
        type: "text",
        question: "Test input for workflow",
        workflowId: "test-workflow-001",
        goal: "Test workflow execution",
        answer: "Expected test output",
        ...overrides,
      },
      dslConfig: WorkflowConfigBuilder.create().withBasicConfig().build(),
    }
    return this
  }

  withPromptOnlyInput(overrides: Partial<any> = {}) {
    this.input = {
      evalInput: {
        type: "prompt-only",
        goal: "Test prompt-only workflow execution",
        workflowId: "test-workflow-001",
        ...overrides,
      },
      dslConfig: WorkflowConfigBuilder.create().withBasicConfig().build(),
    }
    return this
  }

  build(): InvocationInput {
    return this.input as InvocationInput
  }
}

export class RunResultBuilder {
  private result: Partial<RunResult> = {}

  static create() {
    return new RunResultBuilder()
  }

  withSuccessfulRun(overrides: Partial<RunResult> = {}) {
    this.result = {
      workflowInvocationId: "test-invocation-001",
      queueRunResult: {
        success: true,
        agentSteps: [],
        finalWorkflowOutput: "Test workflow completed successfully",
        totalTime: 5000,
        totalCost: 0.005,
      },
      ...overrides,
    }
    return this
  }

  withFailedRun(overrides: Partial<RunResult> = {}) {
    this.result = {
      workflowInvocationId: "test-invocation-001",
      queueRunResult: {
        success: false,
        agentSteps: [],
        finalWorkflowOutput: "",
        error: "Test workflow execution failed",
        totalTime: 2000,
        totalCost: 0.002,
      },
      ...overrides,
    }
    return this
  }

  build(): RunResult {
    return this.result as RunResult
  }
}

/**
 * Context builders for testing observability
 */
export interface TestContext {
  wfId: string
  wfVersionId: string
  invocationId: string
  nodeId?: string
}

export class ContextBuilder {
  private context: Partial<TestContext> = {}

  static create() {
    return new ContextBuilder()
  }

  withWorkflowContext(overrides: Partial<TestContext> = {}) {
    this.context = {
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      ...overrides,
    }
    return this
  }

  withNodeContext(nodeId: string, overrides: Partial<TestContext> = {}) {
    this.context = {
      wfId: "test-workflow-001",
      wfVersionId: "v1.0.0",
      invocationId: "test-invocation-001",
      nodeId,
      ...overrides,
    }
    return this
  }

  build(): TestContext {
    return this.context as TestContext
  }
}

/**
 * Utilities for testing async operations
 */
export class AsyncTestUtils {
  /**
   * Wait for a condition to become true, with timeout
   */
  static async waitFor(
    condition: () => boolean | Promise<boolean>,
    timeoutMs = 5000,
    checkIntervalMs = 10
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, checkIntervalMs))
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`)
  }

  /**
   * Collect events from an async iterator for testing
   */
  static async collectEvents<T>(
    iterator: AsyncIterable<T>,
    maxEvents = 10,
    timeoutMs = 5000
  ): Promise<T[]> {
    const events: T[] = []
    const startTime = Date.now()

    try {
      for await (const event of iterator) {
        events.push(event)

        if (events.length >= maxEvents) break
        if (Date.now() - startTime > timeoutMs) break
      }
    } catch (error) {
      // Iterator closed or timed out
    }

    return events
  }

  /**
   * Create a mock SSE EventSource for testing
   */
  static createMockEventSource(url: string): {
    eventSource: EventTarget
    sendEvent: (type: string, data: any) => void
    close: () => void
  } {
    const eventSource = new EventTarget()
    let closed = false

    const sendEvent = (type: string, data: any) => {
      if (closed) return

      const event = new MessageEvent(type, {
        data: typeof data === "string" ? data : JSON.stringify(data),
      })
      eventSource.dispatchEvent(event)
    }

    const close = () => {
      closed = true
      eventSource.dispatchEvent(new Event("close"))
    }

    return { eventSource, sendEvent, close }
  }
}
