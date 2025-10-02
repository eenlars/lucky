/**
 * Single node invocation module - Execute individual workflow nodes.
 *
 * Allows testing and executing single nodes without full workflow infrastructure.
 * Automatically generates required contexts, IDs, and message structures.
 *
 * Useful for:
 * - Node testing and debugging
 * - Simple single-agent tasks
 * - Tool development and validation
 *
 * @module node/invokeNode
 */

import { lgg } from "@core/utils/logging/Logger"

import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import { genShortId } from "@core/utils/common/utils"
import type { OutputSchema } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { ToolExecutionContext } from "@lucky/tools"
import { type NodeInvocationResult, WorkFlowNode } from "./WorkFlowNode"

/**
 * Configuration for single node invocation.
 */
export interface InvokeAgentInput {
  /** Node configuration including ID, model, tools, and prompts */
  nodeConfig: WorkflowNodeConfig
  /** Input prompt/message for the node */
  prompt: string
  /** Optional files available to node tools */
  workflowFiles?: WorkflowFile[]
  /** Expected output format schema */
  expectedOutputType?: OutputSchema
  /** Overall workflow goal for context */
  mainWorkflowGoal?: string
  /** Handoff destinations (default: ["end"]) */
  handOffs?: string[]
  /** Skip database persistence for testing */
  skipDatabasePersistence?: boolean
}

/**
 * Invokes a single workflow node without requiring a full workflow.
 *
 * @param input - Node invocation configuration
 * @returns Node invocation result with output and metadata
 *
 * @throws Error if node creation or invocation fails
 *
 * @example
 * const result = await invokeNode({
 *   nodeConfig: {
 *     nodeId: "analyzer",
 *     model: "claude-3-sonnet",
 *     systemPrompt: "Analyze the input data",
 *     tools: ["codeAnalysis"]
 *   },
 *   prompt: "Analyze this TypeScript function for complexity"
 * })
 *
 * @remarks
 * - Generates synthetic workflow context for standalone execution
 * - Creates initial message from "start" node
 * - Handles tool context creation automatically
 */
export async function invokeAgent(input: InvokeAgentInput): Promise<NodeInvocationResult> {
  const {
    nodeConfig,
    prompt,
    workflowFiles = [],
    expectedOutputType,
    mainWorkflowGoal = prompt,
    handOffs = ["end"],
    skipDatabasePersistence,
  } = input

  // Generate required IDs
  const workflowVersionId = `wf_ver_${genShortId()}`
  const workflowInvocationId = `wf_inv_${genShortId()}`
  const workflowId = `wf_id_${genShortId()}`

  try {
    lgg.log(`[invokeNode] Creating node: ${nodeConfig.nodeId}`)

    // Create node config with updated handoffs for single node invocation
    const nodeConfigWithHandoffs = {
      ...nodeConfig,
      handOffs,
    }

    // Create node
    const node = await WorkFlowNode.create(nodeConfigWithHandoffs, workflowVersionId, skipDatabasePersistence)

    // Create input message
    const message = new WorkflowMessage({
      originInvocationId: null,
      fromNodeId: "start",
      toNodeId: nodeConfig.nodeId,
      seq: 0,
      payload: {
        kind: "sequential",
        berichten: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
      wfInvId: workflowInvocationId,
      skipDatabasePersistence,
    })

    // Create tool execution context
    const toolContext: ToolExecutionContext = {
      workflowInvocationId,
      workflowVersionId,
      workflowFiles,
      expectedOutputType,
      mainWorkflowGoal,
      workflowId,
    }

    lgg.log(`[invokeNode] Invoking node with prompt: ${prompt.slice(0, 100)}...`)

    // Invoke node
    const result = await node.invoke({
      workflowMessageIncoming: message,
      skipDatabasePersistence,
      ...toolContext,
    })

    const outputPreview =
      typeof result.nodeInvocationFinalOutput === "string"
        ? `${result.nodeInvocationFinalOutput.slice(0, 200)}...`
        : `${JSON.stringify(result.nodeInvocationFinalOutput).slice(0, 200)}...`

    lgg.log(`[invokeNode] Node invocation completed. Output: ${outputPreview}`)

    return result
  } catch (error) {
    lgg.error(`[invokeNode] Error invoking node ${nodeConfig.nodeId}:`, error)
    throw error
  }
}
