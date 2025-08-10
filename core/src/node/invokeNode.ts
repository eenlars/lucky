import { lgg } from "@core/utils/logging/Logger"

import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { WorkflowFile } from "@core/tools/context/contextStore.types"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { genShortId } from "@core/utils/common/utils"
import type { ExpectedOutputSchema } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { type NodeInvocationResult, WorkFlowNode } from "./WorkFlowNode"

export interface InvokeNodeInput {
  nodeConfig: WorkflowNodeConfig
  prompt: string
  workflowFiles?: WorkflowFile[]
  expectedOutputType?: ExpectedOutputSchema
  mainWorkflowGoal?: string
  handOffs?: string[]
  skipDatabasePersistence?: boolean
}

/**
 * Invoke a single node without needing a full workflow.
 * Generates required contexts and IDs automatically.
 */
export async function invokeNode(
  input: InvokeNodeInput
): Promise<NodeInvocationResult> {
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
  const workflowVersionId = `node-${genShortId()}`
  const workflowInvocationId = genShortId()
  const workflowId = `single-node-${genShortId()}`

  try {
    lgg.log(`[invokeNode] Creating node: ${nodeConfig.nodeId}`)

    // Create node config with updated handoffs for single node invocation
    const nodeConfigWithHandoffs = {
      ...nodeConfig,
      handOffs,
    }

    // Create node
    const node = await WorkFlowNode.create(
      nodeConfigWithHandoffs,
      workflowVersionId,
      skipDatabasePersistence
    )

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

    lgg.log(
      `[invokeNode] Invoking node with prompt: ${prompt.slice(0, 100)}...`
    )

    // Invoke node
    const result = await node.invoke({
      workflowMessageIncoming: message,
      skipDatabasePersistence,
      ...toolContext,
    })

    const outputPreview =
      typeof result.nodeInvocationFinalOutput === "string"
        ? result.nodeInvocationFinalOutput.slice(0, 200) + "..."
        : JSON.stringify(result.nodeInvocationFinalOutput).slice(0, 200) + "..."

    lgg.log(`[invokeNode] Node invocation completed. Output: ${outputPreview}`)

    return result
  } catch (error) {
    lgg.error(`[invokeNode] Error invoking node ${nodeConfig.nodeId}:`, error)
    throw error
  }
}
