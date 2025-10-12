import { getCoreConfig } from "@core/core-config/coreConfig"
import { toRuntimeContract } from "@core/core-config/validation"
import { llmify } from "@core/utils/common/llmify"

function buildWorkflowRules(): string {
  const config = getCoreConfig()
  const runtime = toRuntimeContract(config)

  const rules = [
    "- every node must be reachable from the first node (there must be a directed path from the first node to every other node in the workflow)",
    `- each node can have at most ${config.tools.maxToolsPerAgent} tools (counting both codeTools and mcpTools combined)`,
    "- the last node must have a handoff to 'end' (the end of the workflow)",
  ]

  if (runtime.workflow.parallelExecution) {
    rules.push(
      "- You can enable parallel execution of nodes by setting a node's handOffType to 'parallel' when it has multiple handOffs, allowing the workflow to branch into multiple simultaneous paths.",
      "- if you want it to be a decision, you should not include handOffType, just multiple handOffs.",
    )
  }

  // asyncExecution is deprecated and always false, removed check

  if (config.tools.uniqueToolsPerAgent) {
    rules.unshift("- each tool can only be assigned to exactly one workflow node (no tool sharing between nodes)")
  }

  if (config.tools.uniqueToolSetsPerAgent) {
    rules.unshift(
      "- each node must have a completely unique combination of tools (no two nodes can have identical tool sets)",
    )
  }

  if (!config.verification.allowCycles && config.coordinationType === "sequential") {
    rules.push("- the workflow must be a directed acyclic graph (no cycles allowed in the node connections)")
  }

  if (config.workflow.maxNodes > 0) {
    rules.push(`- the workflow must have at most ${config.workflow.maxNodes} nodes`)
  }

  return `<rules>\n${rules.join("\n")}\n</rules>`
}

export const WORKFLOW_GENERATION_RULES = llmify(buildWorkflowRules())
