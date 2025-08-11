import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { AgentDescriptionsNoToolsConfigZod } from "@core/node/schemas/agentNoTools"
import { createAgentPrompt } from "@core/prompts/createAgent"
import { llmify } from "@core/utils/common/llmify"

export const getSelfImprovePrompt = ({
  nodeConfig,
  transcript,
  _memory,
  _fitness,
  goal,
  feedback,
}: {
  nodeConfig: AgentDescriptionsNoToolsConfigZod
  transcript: string
  _memory?: Record<string, string>
  _fitness?: FitnessOfWorkflow
  feedback: string
  goal: string
}) => {
  const memory = _memory
    ? `your current memory is:
    ${JSON.stringify(_memory)}`
    : ""

  const usesSummaries =
    transcript.includes("execution") && transcript.includes("summary:")

  const prompt = llmify(`
  <role>
    you are an expert workflow node developer. 
    you aim to improve the workflow node ${nodeConfig.nodeId} based on ${usesSummaries ? "execution summaries" : "the transcript"} and fitness.
  </role>

  <task>
    ${
      usesSummaries
        ? `analyze the following execution summaries for workflow node ${nodeConfig.nodeId}.
    focus on patterns of success/failure and areas for improvement based on the fitness results:`
        : `for the following inputs and outputs, 
    please comment on what went well for workflow node ${nodeConfig.nodeId} 
    and what could be improved by looking at the fitness results:`
    }
    ${transcript}
  </task>

  <context> 
    your last config was:
    ${JSON.stringify(nodeConfig)}

    the goal of the workflow is: ${goal}.

    the feedback on your last run is: ${feedback}.

    here is an example of what an agent looks like:
  ${createAgentPrompt({
    includeWaitFor: false,
    includeHandOffType: false,
  })}

    your last fitness was:
    ${_fitness?.score} / 100

    ${memory}
  </context>
  
  ${
    usesSummaries
      ? `<guidance>
    when analyzing summaries:
    - look for patterns across multiple executions
    - identify recurring failures or inefficiencies
    - consider cost patterns and optimization opportunities
    - focus on outcomes rather than implementation details
  </guidance>`
      : ""
  }
  `)

  return prompt
}
