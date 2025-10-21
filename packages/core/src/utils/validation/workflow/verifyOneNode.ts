import type { VerificationErrors } from "@core/utils/validation/workflow/verify.types"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"

export async function verifyNodes(config: WorkflowConfig): Promise<VerificationErrors> {
  const errors: string[] = []

  for (const node of config.nodes) {
    const nodeErrors = await verifyOneNode(node)
    errors.push(...nodeErrors)
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"))
  }

  return []
}

export async function verifyOneNode(node: WorkflowNodeConfig): Promise<VerificationErrors> {
  const missingFields: string[] = []

  // check required fields are present
  if (!node.nodeId) {
    missingFields.push("nodeId")
  }

  if (!node.description) {
    missingFields.push("description")
  }

  if (!node.systemPrompt) {
    missingFields.push("systemPrompt")
  }

  if (!node.gatewayModelId) {
    missingFields.push("gatewayModelId")
  }

  if (!node.mcpTools) {
    missingFields.push("mcpTools")
  }

  if (!node.codeTools) {
    missingFields.push("codeTools")
  }

  if (!node.handOffs) {
    missingFields.push("handOffs")
  }

  // memory is optional, so we don't check it

  if (missingFields.length > 0) {
    const nodeIdentifier = node.nodeId || "unknown node"
    return [`node '${nodeIdentifier}' is missing required fields: ${missingFields.join(", ")}`]
  }

  return []
}
