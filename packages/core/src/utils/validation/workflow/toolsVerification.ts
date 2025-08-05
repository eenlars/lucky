import { isNir } from "@utils/common/isNir"
import type { VerificationErrors } from "@utils/validation/workflow/verify.types"
import { ALL_ACTIVE_TOOL_NAMES, INACTIVE_TOOLS } from "@tools/tool.types"
import { getSettings } from "@utils/config/runtimeConfig"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

// check that each tool is used by only one workflow node
export const verifyToolsUnique = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const nodes = config.nodes
  // Create a map to track which tools are used by which workflow nodes
  const toolUsageMap = new Map<string, string[]>()

  // Collect all tool usages
  for (const node of nodes) {
    if (!node.codeTools && !node.mcpTools) continue

    // Handle codeTools safely
    if (node.codeTools) {
      for (const tool of node.codeTools) {
        if (!toolUsageMap.has(tool)) {
          toolUsageMap.set(tool, [])
        }
        toolUsageMap.get(tool)?.push(node.nodeId)
      }
    }

    // Handle mcpTools safely
    if (node.mcpTools) {
      for (const tool of node.mcpTools) {
        if (!toolUsageMap.has(tool)) {
          toolUsageMap.set(tool, [])
        }
        toolUsageMap.get(tool)?.push(node.nodeId)
      }
    }
  }

  // Check for duplicate tool usage
  const duplicateTools: string[] = []
  toolUsageMap.forEach((nodeNames, toolName) => {
    if (nodeNames.length > 1) {
      duplicateTools.push(
        `tool "${toolName}" is used by multiple nodes: ${nodeNames.join(", ")}`
      )
    }
  })

  // Return error messages instead of throwing
  if (duplicateTools.length > 0 && getSettings().tools.uniqueToolsPerAgent) {
    return [
      `setup verification failed. each tool must be unique to one node:\n${duplicateTools.join("\n")}`,
    ]
  }

  return []
}

// check that all tools are active (exist in the available tools list)
export const verifyAllToolsAreActive = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const nodes = config.nodes
  const inactiveToolsUsed: string[] = []
  const unknownToolsUsed: string[] = []

  // collect all tools used across all nodes
  for (const node of nodes) {
    const allNodeTools = [...(node.codeTools || []), ...(node.mcpTools || [])]

    // check if any used tools are inactive or unknown
    for (const tool of allNodeTools) {
      if (INACTIVE_TOOLS.has(tool)) {
        inactiveToolsUsed.push(
          `node "${node.nodeId}" uses inactive tool "${tool}"`
        )
      } else if (getSettings().tools.defaultTools.has(tool)) {
        // skip default tools, they are always active, but do not appear on the all active tools list,
        // because they shouldn't be assigned while creating a workflow. (they are assigned by default)
      } else if (!ALL_ACTIVE_TOOL_NAMES.includes(tool)) {
        unknownToolsUsed.push(
          `node "${node.nodeId}" uses unknown tool "${tool}" (not in available tools list)`
        )
      }
    }
  }

  const errors: string[] = []

  if (inactiveToolsUsed.length > 0) {
    errors.push(
      `setup verification failed. inactive tools are being used:\n${inactiveToolsUsed.join("\n")}`
    )
  }

  if (unknownToolsUsed.length > 0) {
    errors.push(
      `setup verification failed. unknown tools are being used:\n${unknownToolsUsed.join("\n")}`
    )
  }

  return errors
}

// check that each node has a unique tool set
export const verifyToolSetEachNodeIsUnique = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  if (!getSettings().tools.uniqueToolSetsPerAgent) return [] // skip if disabled

  const nodes = config.nodes
  const toolSetUsage = new Map<string, string[]>()

  for (const node of nodes) {
    const allNodeTools = [...(node.codeTools || []), ...(node.mcpTools || [])]

    // check for duplicate tools within the same node
    const uniqueTools = new Set(allNodeTools)
    if (uniqueTools.size !== allNodeTools.length) {
      return [`node "${node.nodeId}" has duplicate tools in its own tool set`]
    }

    const toolSet = Array.from(uniqueTools).sort().join(", ")

    // skip empty tool sets - they're allowed and don't need uniqueness checks
    if (isNir(toolSet)) {
      continue
    }

    if (!toolSetUsage.has(toolSet)) {
      toolSetUsage.set(toolSet, [])
    }
    toolSetUsage.get(toolSet)!.push(node.nodeId)
  }

  // check for nodes with identical tool sets
  for (const [toolSet, nodeIds] of toolSetUsage.entries()) {
    if (nodeIds.length > 1) {
      return [
        `nodes "${nodeIds.join(", ")}" use the same tool set (a tool set must be unique to one node): ${toolSet}`,
      ]
    }
  }

  return []
}

export const verifyMaxToolsPerAgent = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const errors: VerificationErrors = []

  const defaultToolsCount = getSettings().tools.defaultTools.size
  for (const node of config.nodes) {
    const mcpToolsCount = node.mcpTools?.length ?? 0
    const codeToolsCount = node.codeTools?.length ?? 0

    if (
      mcpToolsCount >
      getSettings().tools.maxToolsPerAgent + defaultToolsCount
    ) {
      errors.push(
        `node "${node.nodeId}" has ${mcpToolsCount} mcp tools, exceeding the limit of ${getSettings().tools.maxToolsPerAgent}`
      )
    }

    if (
      codeToolsCount >
      getSettings().tools.maxToolsPerAgent + defaultToolsCount
    ) {
      errors.push(
        `node "${node.nodeId}" has ${codeToolsCount} code tools, exceeding the limit of ${getSettings().tools.maxToolsPerAgent}`
      )
    }
  }

  return errors
}
