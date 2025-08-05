import { explainAgents } from "@core/prompts/explainAgents"
import { explainSubsetOfTools } from "@core/prompts/explainTools"
import { workflowToAdjacencyList } from "@core/workflow/actions/generate/toAdjacencyList"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { Workflow } from "@core/workflow/Workflow"

export type SimplifyOptions = {
  easyModelNames: boolean
  includeToolExplanations?: boolean
  includeAdjacencyList?: boolean
  includeAgents?: boolean
  includeMemory?: boolean
}

const defaultOptions = {
  includeToolExplanations: true,
  includeAdjacencyList: true,
  includeAgents: false,
  includeMemory: false,
  easyModelNames: false,
}

//toString method for a workflow. has options to include tool explanations, adjacency list, and agents
export function workflowToString(
  workflow: Workflow,
  options: SimplifyOptions
): string {
  const {
    includeToolExplanations = defaultOptions.includeToolExplanations,
    includeAdjacencyList = defaultOptions.includeAdjacencyList,
    includeAgents = defaultOptions.includeAgents,
    includeMemory = defaultOptions.includeMemory,
    easyModelNames = defaultOptions.easyModelNames,
  } = options

  let totalString = ""
  if (includeToolExplanations) {
    totalString += explainSubsetOfTools(
      workflow
        .getConfig()
        .nodes.flatMap((node) => [...node.mcpTools, ...node.codeTools])
    )
  }
  if (includeAdjacencyList)
    totalString += workflowToAdjacencyList(workflow.getConfig())

  if (includeAgents)
    totalString += explainAgents(workflow.getConfig().nodes, easyModelNames)

  if (includeMemory) totalString += JSON.stringify(workflow.getMemory())
  return totalString
}

export function workflowToStringFromConfig(
  config: WorkflowConfig,
  options: SimplifyOptions
): string {
  const {
    includeToolExplanations = defaultOptions.includeToolExplanations,
    includeAdjacencyList = defaultOptions.includeAdjacencyList,
    includeAgents = defaultOptions.includeAgents,
    includeMemory = defaultOptions.includeMemory,
  } = options

  let totalString = ""
  if (includeToolExplanations) {
    totalString += explainSubsetOfTools(
      config.nodes.flatMap((node) => [...node.mcpTools, ...node.codeTools])
    )
  }
  if (includeAdjacencyList) {
    totalString += workflowToAdjacencyList(config)
  }
  if (includeAgents) {
    totalString += explainAgents(config.nodes)
  }
  if (includeMemory) {
    totalString += JSON.stringify(
      config.nodes.reduce(
        (acc, node) => {
          if (node.memory) acc[node.nodeId] = node.memory
          return acc
        },
        {} as Record<string, Record<string, string>>
      )
    )
  }
  return totalString
}
