import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { WorkflowEvolutionPrompts } from "@core/prompts/improveWorkflow.p"
import { R, type RS } from "@core/utils/types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowNodeConfigSchema } from "@core/workflow/schema/workflowSchema"
import { Workflow } from "@core/workflow/Workflow"
import { getDefaultModels } from "@runtime/settings/models"
import z from "zod"

export async function adjustWorkflowOneNode(
  workflow: WorkflowConfig,
  feedback: string,
  fitness: FitnessOfWorkflow
): Promise<RS<WorkflowConfig>> {
  const prompt = WorkflowEvolutionPrompts.mechanicAdvisorOneNode(workflow, fitness, feedback)

  const response = await sendAI({
    model: getDefaultModels().reasoning, // good model.
    messages: prompt,
    mode: "structured",
    schema: z.object({
      action: z.enum(["addNode", "removeNode", "modifyNode", "doNothing", "customOperation"]),
      explanation: z.string(),
      // For addNode
      newNode: WorkflowNodeConfigSchema.optional(),
      predecessors: z
        .array(z.string())
        .optional()
        .describe("Only if action is addNode. The node IDs of the nodes that should be connected to the new node."),
      // For removeNode and modifyNode
      nodeId: z
        .string()
        .optional()
        .describe("Only if action is removeNode or modifyNode. The node ID to remove or modify."),
      // For modifyNode
      modifiedNode: z
        .string()
        .optional()
        .describe("Only if action is modifyNode. Describe what needs to be changed, in detail."),
      // For customOperation
      customOperation: z
        .string()
        .optional()
        .describe("Only if action is customOperation. The custom operation to perform."),
    }),
  })

  if (!response.success || !response.data) {
    return R.error(response.error || "Failed to get response from AI", response.usdCost)
  }

  const { action, nodeId, newNode, modifiedNode, predecessors, customOperation } = response.data

  // Build a natural-language instruction for the workflow formalizer
  let instruction: string
  switch (action) {
    case "addNode": {
      if (!newNode) {
        return R.error("newNode is required for addNode action", response.usdCost)
      }
      const predecessorsList = (predecessors || []).join(", ") || "no predecessors specified"
      const newNodeJson = typeof newNode === "string" ? newNode : JSON.stringify(newNode, null, 2)
      instruction = `
      Add ONE node to the existing workflow. Use this node configuration:
      ${newNodeJson}
      Connect this new node to these predecessor nodes: ${predecessorsList}. 
      Update the handOffs of the predecessor nodes to point to this new node.`
      break
    }
    case "removeNode": {
      if (!nodeId) {
        return R.error("nodeId is required for removeNode action", response.usdCost)
      }
      instruction = `
      Remove the node with nodeId "${nodeId}". 
      Update all handOffs in other nodes to remove references to "${nodeId}". 
      Do NOT remove the entry node. Ensure the graph remains connected from entry to end.`
      break
    }
    case "modifyNode": {
      if (!nodeId || !modifiedNode) {
        return R.error("nodeId and modifiedNode are required for modifyNode action", response.usdCost)
      }
      instruction = `Modify the node with nodeId "${nodeId}" as follows: ${modifiedNode}. 
      Ensure all handOffs and tools remain valid.`
      break
    }
    case "customOperation": {
      if (!customOperation) {
        return R.error("customOperation is required", response.usdCost)
      }
      instruction = `Perform the following workflow-level change: ${customOperation}`
      break
    }
    case "doNothing": {
      instruction = `No changes should be made. Keep the workflow configuration identical to the base.`
      break
    }
    default: {
      const _exhaustiveCheck: never = action as never
      void _exhaustiveCheck
      return R.error(`Unknown action: ${action}`, response.usdCost)
    }
  }

  // Formalize the advisor instruction into a real workflow config
  const formalized = await Workflow.formalizeWorkflow(instruction, {
    workflowConfig: workflow,
    verifyWorkflow: "normal",
    repairWorkflowAfterGeneration: true,
  })

  const totalCost = (response.usdCost || 0) + (formalized.usdCost || 0)

  if (!formalized.success) {
    return R.error(formalized.error, totalCost)
  }
  return R.success(formalized.data, totalCost)
}
