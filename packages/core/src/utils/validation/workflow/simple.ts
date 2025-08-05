import type { VerificationErrors } from "@utils/validation/workflow/verify.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

// must have at least one node
export const verifyAtLeastOneNode = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  if (config.nodes.length === 0) {
    return ["no nodes found—check node config"]
  }
  return []
}
