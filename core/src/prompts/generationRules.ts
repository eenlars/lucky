import { llmify } from "@core/utils/common/llmify"
import { CONFIG } from "@core/core-config/compat"

function buildWorkflowRules(): string {
  const rules = [
    "- every node must be reachable from the first node (there must be a directed path from the first node to every other node in the workflow)",
    `- each node can have at most ${CONFIG.tools.maxToolsPerAgent} tools (counting both codeTools and mcpTools combined)`,
    "- the last node must have a handoff to 'end' (the end of the workflow)",
  ]

  if (CONFIG.workflow.parallelExecution) {
    rules.push(
      "- You can enable parallel execution of nodes by setting a node's handOffType to 'parallel' when it has multiple handOffs, allowing the workflow to branch into multiple simultaneous paths.",
      "- if you want it to be a decision, you should not include handOffType, just multiple handOffs.",
    )
  }

  if (CONFIG.workflow.asyncExecution && CONFIG.workflow.parallelExecution) {
    rules.push(
      "- you can do async execution of nodes. it only works if the async receiving node has the key 'waitFor' = ['node-id-1', 'node-id-2', ...] and those nodes are incoming nodes of the async receiving node.",
      "- for async execution, the node that receives the input must have a handoff to the node that sends the output.",
    )
  }

  if (CONFIG.tools.uniqueToolsPerAgent) {
    rules.unshift("- each tool can only be assigned to exactly one workflow node (no tool sharing between nodes)")
  }

  if (CONFIG.tools.uniqueToolSetsPerAgent) {
    rules.unshift(
      "- each node must have a completely unique combination of tools (no two nodes can have identical tool sets)",
    )
  }

  if (!CONFIG.verification.allowCycles && CONFIG.coordinationType === "sequential") {
    rules.push("- the workflow must be a directed acyclic graph (no cycles allowed in the node connections)")
  }

  if (CONFIG.workflow.maxNodes > 0) {
    rules.push(`- the workflow must have at most ${CONFIG.workflow.maxNodes} nodes`)
  }

  return `<rules>\n${rules.join("\n")}\n</rules>`
}

export const WORKFLOW_GENERATION_RULES = llmify(buildWorkflowRules())
