import { isNir } from "@utils/common/isNir"
import { getModelSettings } from "@utils/config/runtimeConfig"
import { pricing } from "@utils/models/models"
import {
  everyNodeIsConnectedToStartNode,
  startNodeIsConnectedToEndNode,
} from "@utils/validation/workflow/connectionVerification"
import { verifyAtLeastOneNode } from "@utils/validation/workflow/simple"
import {
  verifyAllToolsAreActive,
  verifyMaxToolsPerAgent,
  verifyToolSetEachNodeIsUnique,
  verifyToolsUnique,
} from "@utils/validation/workflow/toolsVerification"
import type {
  ValidationOptions,
  VerificationErrors,
  VerificationResult,
} from "@utils/validation/workflow/verify.types"
import { verifyNoCycles } from "@utils/validation/workflow/verifyDirectedGrapht"
import { verifyHierarchicalStructure } from "@utils/validation/workflow/verifyHierarchical"
import { verifyNodes } from "@utils/validation/workflow/verifyOneNode"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

// verify that each node has a modelname that exists
export const verifyModelNameExists = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const errors: string[] = []
  for (const node of config.nodes) {
    if (!node.modelName) {
      errors.push(`Node '${node.nodeId}' is missing a modelName`)
    } else if (!pricing[node.modelName]) {
      errors.push(
        `Node '${node.nodeId}' has an invalid modelName: ${node.modelName}`
      )
    }
  }
  return errors
}

// verify that each node does not have duplicate handoffs
export const verifyNoDuplicateHandoffs = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const errors: string[] = []
  for (const node of config.nodes) {
    const handOffSet = new Set(node.handOffs)
    if (handOffSet.size !== node.handOffs.length) {
      errors.push(`Node '${node.nodeId}' has duplicate handoffs`)
    }
  }
  return errors
}

// verify that each node does not use inactive models
export const verifyModelsAreActive = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const errors: string[] = []
  for (const node of config.nodes) {
    if (node.modelName && getModelSettings().inactive.has(node.modelName)) {
      errors.push(
        `Node '${node.nodeId}' uses inactive model: ${node.modelName}`
      )
    }
  }
  return errors
}

// main Verification Function
export const verifyWorkflowConfig = async (
  config: WorkflowConfig,
  options: ValidationOptions
): Promise<VerificationResult> => {
  const errors: string[] = []
  try {
    // collect all validation errors
    const verificationFunctions = [
      verifyNodes,
      verifyToolsUnique,
      verifyAllToolsAreActive,
      verifyAtLeastOneNode,
      everyNodeIsConnectedToStartNode,
      startNodeIsConnectedToEndNode,
      verifyToolSetEachNodeIsUnique,
      verifyModelNameExists,
      verifyModelsAreActive,
      verifyNoDuplicateHandoffs,
      verifyMaxToolsPerAgent,
      verifyNoCycles,
      verifyHierarchicalStructure, // Added hierarchical validation
    ]

    for (const verify of verificationFunctions) {
      const result = await verify(config)
      errors.push(...result)
    }
  } catch (e) {
    errors.push((e as Error).message)
    if (options.throwOnError) {
      throw new Error((e as Error).message)
    }
    return {
      isValid: false,
      errors,
    }
  }

  if (options.verbose && !isNir(errors)) {
    // do not change the console.log to lgg.log
    errors.forEach((error) => console.log(`Error: ${error}`))
  }

  if (config.nodes.length === 1) {
    // do not change the console.warn to lgg.warn
    console.warn(
      "only one node found—check node getSettings(). consider adding more nodes."
    )
  }

  const isValid = errors.length === 0

  if (!isValid && options.throwOnError) {
    throw new Error(errors.join("\n"))
  }

  return {
    isValid,
    errors,
  }
}

// throws errors immediately if workflow config is invalid
export const verifyWorkflowConfigStrict = async (
  config: WorkflowConfig
): Promise<void> => {
  await verifyWorkflowConfig(config, { throwOnError: true })
}
