import { llmify } from "@utils/common/llmify"
import { getSettings } from "@utils/config/runtimeConfig"

function buildWorkflowRules(): string {
  const rules = [
    "- every node must be reachable from the first node (there must be a directed path from the first node to every other node in the workflow)",
    `- each node can have at most ${getSettings().tools.maxToolsPerAgent} tools (counting both codeTools and mcpTools combined)`,
    "- the last node must have a handoff to 'end' (the end of the workflow)",
  ]

  if (getSettings().workflow.parallelExecution) {
    rules.push(
      "- You can enable parallel execution of nodes by setting a node's handOffType to 'parallel' when it has multiple handOffs, allowing the workflow to branch into multiple simultaneous getPaths().",
      "- if you want it to be a decision, you should not include handOffType, just multiple handOffs."
    )
  }

  if (
    getSettings().workflow.asyncExecution &&
    getSettings().workflow.parallelExecution
  ) {
    rules.push(
      "- you can do async execution of nodes. it only works if the async receiving node has the key 'waitFor' = ['node-id-1', 'node-id-2', ...] and those nodes are incoming nodes of the async receiving node.",
      "- for async execution, the node that receives the input must have a handoff to the node that sends the output."
    )
  }

  if (getSettings().tools.uniqueToolsPerAgent) {
    rules.unshift(
      "- each tool can only be assigned to exactly one workflow node (no tool sharing between nodes)"
    )
  }

  if (getSettings().tools.uniqueToolSetsPerAgent) {
    rules.unshift(
      "- each node must have a completely unique combination of tools (no two nodes can have identical tool sets)"
    )
  }

  if (
    !getSettings().verification.allowCycles &&
    getSettings().coordinationType === "sequential"
  ) {
    rules.push(
      "- the workflow must be a directed acyclic graph (no cycles allowed in the node connections)"
    )
  }

  if (getSettings().workflow.maxNodes > 0) {
    rules.push(
      `- the workflow must have at most ${getSettings().workflow.maxNodes} nodes`
    )
  }

  return `<rules>\n${rules.join("\n")}\n</rules>`
}

export const WORKFLOW_GENERATION_RULES = llmify(buildWorkflowRules())
