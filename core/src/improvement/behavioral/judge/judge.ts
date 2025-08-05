import { sendAI } from "@core/messages/api/sendAI"
import { spliceNode2 } from "@core/node/splice"
import { WorkflowEvolutionPrompts } from "@core/prompts/improveWorkflow.p"
import { R, type RS } from "@core/utils/types"
import type { FitnessOfWorkflow } from "@core/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowNodeConfigSchema } from "@core/workflow/schema/workflowSchema"
import { Workflow } from "@core/workflow/Workflow"
import { MODELS } from "@runtime/settings/constants"
import z from "zod"

export async function judge(
  workflow: WorkflowConfig,
  feedback: string,
  fitness: FitnessOfWorkflow
): Promise<RS<WorkflowConfig>> {
  const prompt = WorkflowEvolutionPrompts.judgeOnlyNode(
    workflow,
    fitness,
    feedback
  )

  const response = await sendAI({
    model: MODELS.reasoning,
    messages: prompt,
    mode: "structured",
    schema: z.object({
      action: z.enum([
        "addNode",
        "removeNode",
        "modifyNode",
        "doNothing",
        "customOperation",
      ]),
      explanation: z.string(),
      // For addNode
      newNode: WorkflowNodeConfigSchema.optional(),
      predecessors: z
        .array(z.string())
        .optional()
        .describe(
          "Only if action is addNode. The node IDs of the nodes that should be connected to the new node."
        ),
      // For removeNode and modifyNode
      nodeId: z
        .string()
        .optional()
        .describe(
          "Only if action is removeNode or modifyNode. The node ID to remove or modify."
        ),
      // For modifyNode
      modifiedNode: z
        .string()
        .describe(
          "Only if action is modifyNode. You are allowed to modify the configuration of one node at most. Describe what needs to be changed, in detail."
        ),
      // For customOperation
      customOperation: z
        .string()
        .optional()
        .describe(
          "Only if action is customOperation. The custom operation to perform."
        ),
    }),
  })

  if (!response.success || !response.data) {
    return R.error(
      response.error || "Failed to get response from AI",
      response.usdCost
    )
  }

  const {
    action,
    nodeId,
    newNode,
    modifiedNode,
    predecessors,
    customOperation,
  } = response.data

  switch (action) {
    case "addNode":
      if (!newNode) {
        return R.error(
          "newNode is required for addNode action",
          response.usdCost
        )
      }

      try {
        const newNodeConfig = WorkflowNodeConfigSchema.parse(newNode)
        const nodePredecessors = predecessors || []

        // Use splice functionality to add the node and set up connections
        spliceNode2(nodePredecessors, newNodeConfig, workflow.nodes)

        return {
          data: workflow,
          success: true,
          error: undefined,
          usdCost: response.usdCost,
        }
      } catch (error) {
        return R.error(`Failed to add node: ${error}`, response.usdCost)
      }

    case "removeNode":
      if (!nodeId) {
        return R.error(
          "nodeId is required for removeNode action",
          response.usdCost
        )
      }

      try {
        // Find the node to remove
        const nodeToRemove = workflow.nodes.find((n) => n.nodeId === nodeId)
        if (!nodeToRemove) {
          return R.error(`Node with ID ${nodeId} not found`, response.usdCost)
        }

        // Don't allow removal of the entry node
        if (nodeId === workflow.entryNodeId) {
          return R.error("Cannot remove the entry node", response.usdCost)
        }

        // Remove references to this node from other nodes' handOffs
        workflow.nodes.forEach((node) => {
          node.handOffs = node.handOffs.filter((handOff) => handOff !== nodeId)
        })

        // Remove the node itself
        workflow.nodes = workflow.nodes.filter((node) => node.nodeId !== nodeId)

        return R.success(workflow, response.usdCost)
      } catch (error) {
        return R.error(`Failed to remove node: ${error}`, response.usdCost)
      }

    case "modifyNode":
      if (!nodeId || !modifiedNode) {
        return R.error(
          "nodeId and modifiedNode are required for modifyNode action",
          response.usdCost
        )
      }

      try {
        // Find the node to modify
        const nodeIndex = workflow.nodes.findIndex((n) => n.nodeId === nodeId)
        if (nodeIndex === -1) {
          return R.error(`Node with ID ${nodeId} not found`, response.usdCost)
        }

        const { success, data, error, usdCost } =
          await Workflow.formalizeWorkflow(modifiedNode, {
            workflowConfig: workflow,
            verifyWorkflow: "normal",
            repairWorkflowAfterGeneration: true,
          })

        if (!success || !data) {
          return R.error(error, usdCost)
        }

        // Replace the workflow
        workflow = data as unknown as WorkflowConfig

        return R.success(workflow, response.usdCost)
      } catch (error) {
        return R.error(`Failed to modify node: ${error}`, response.usdCost)
      }

    case "customOperation":
      if (!customOperation) {
        return R.error("customOperation is required", response.usdCost)
      }
      // todo-customOperation: implement custom operation
      const { success, data, error, usdCost } =
        await Workflow.formalizeWorkflow(customOperation, {
          workflowConfig: workflow,
          verifyWorkflow: "normal",
          repairWorkflowAfterGeneration: true,
        })

      if (!success || !data) {
        return R.error(error, usdCost)
      }

      return R.success(data, usdCost)

    case "doNothing":
      return R.success(workflow, response.usdCost)

    default:
      return R.error(`Unknown action: ${action}`, response.usdCost)
  }
}
