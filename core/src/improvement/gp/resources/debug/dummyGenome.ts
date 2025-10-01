import { Genome } from "@core/improvement/gp/Genome"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import { getActiveTools, type CodeToolName, type MCPToolName } from "@lucky/tools"
import { getDefaultModels } from "@core/core-config/compat"
import { TOOLS } from "@core/core-config/compat"

// function to get a random element from an array
const getRandomElement = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)]
}

// function to get a random subset of elements from an array
const getRandomSubset = <T>(arr: T[], count: number): T[] => {
  const shuffled = arr.sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(count, arr.length))
}

// function to generate a random string
const getRandomString = (length: number) => {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789 "
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

export const createDummySurvivors = (parents: Genome[], offspring: Genome[]): Genome[] => {
  const survivors = parents.map(parent =>
    createDummyGenome(parent.genome.parentWorkflowVersionIds, parent.getEvolutionContext()),
  )

  return survivors
}

export const createDummyGenome = (parentWorkflowVersionIds: string[], _evolutionContext: EvolutionContext): Genome => {
  const entryNodeId = "start-node"
  const secondNodeId = "process-node"
  const thirdNodeId = "end-node"

  const defaultModels = getDefaultModels()
  const randomModel1 = getRandomElement(Object.values(defaultModels))
  const randomModel2 = getRandomElement(Object.values(defaultModels))
  const randomModel3 = getRandomElement(Object.values(defaultModels))

  const activeMcpTools = Object.keys(getActiveTools(TOOLS.mcp)) as MCPToolName[]
  const activeCodeTools = Object.keys(getActiveTools(TOOLS.code)) as CodeToolName[]

  const randomMcpTools1 = getRandomSubset<MCPToolName>(activeMcpTools, Math.floor(Math.random() * 2) + 1)
  const randomCodeTools1 = getRandomSubset<CodeToolName>(activeCodeTools, Math.floor(Math.random() * 2) + 1)
  const randomMcpTools2 = getRandomSubset<MCPToolName>(activeMcpTools, Math.floor(Math.random() * 2) + 1)
  const randomCodeTools2 = getRandomSubset<CodeToolName>(activeCodeTools, Math.floor(Math.random() * 2) + 1)
  const randomMcpTools3 = getRandomSubset<MCPToolName>(activeMcpTools, Math.floor(Math.random() * 2) + 1)
  const randomCodeTools3 = getRandomSubset<CodeToolName>(activeCodeTools, Math.floor(Math.random() * 2) + 1)

  return new Genome(
    {
      _evolutionContext,
      parentWorkflowVersionIds,
      createdAt: new Date().toISOString(),
      evaluationResults: {
        workflowVersionId: "dummy-workflow-version-id",
        hasBeenEvaluated: true,
        evaluatedAt: new Date().toISOString(),
        fitness: {
          score: 0.7,
          accuracy: 70,
          totalCostUsd: 0.01,
          totalTimeSeconds: 2.0,
        },
        costOfEvaluation: 0,
        errors: [],
        feedback: "dummy feedback from evaluation",
      },
      entryNodeId: entryNodeId,
      nodes: [
        {
          nodeId: entryNodeId,
          description: `initial data collection: ${getRandomString(20)}`,
          systemPrompt: `you are an agent that collects initial data. ${getRandomString(50)}`,
          modelName: randomModel1,
          mcpTools: randomMcpTools1,
          codeTools: randomCodeTools1,
          handOffs: [secondNodeId],
          memory: {
            "input-data": "initial query",
          },
        },
        {
          nodeId: secondNodeId,
          description: `data processing and analysis: ${getRandomString(20)}`,
          systemPrompt: `you are an agent that processes and analyzes data. ${getRandomString(50)}`,
          modelName: randomModel2,
          mcpTools: randomMcpTools2,
          codeTools: randomCodeTools2,
          handOffs: [thirdNodeId],
          memory: {
            "processed-data": "intermediate result",
          },
        },
        {
          nodeId: thirdNodeId,
          description: `final report generation: ${getRandomString(20)}`,
          systemPrompt: `you are an agent that generates a final report. ${getRandomString(50)}`,
          modelName: randomModel3,
          mcpTools: randomMcpTools3,
          codeTools: randomCodeTools3,
          handOffs: [],
          memory: {
            "final-report": "summary of findings",
          },
        },
      ],
    },
    {
      type: "text",
      question: "dummy-question",
      answer: "dummy-answer",
      goal: "dummy-goal",
      workflowId: "dummy-workflow-id",
    },
    _evolutionContext,
  )
}
