export const createAgentPrompt = ({
  includeWaitFor,
  includeHandOffType,
}: {
  includeWaitFor: boolean
  includeHandOffType: boolean
}) => `

this is an example of a very basic agent. you can make it more complex by adding more nodes, and more complex handoffs.

{
    nodeId: string // unique id for the node
    description: string // description of the node.
    systemPrompt: string // system prompt for the node.
    modelName: ModelName // openai/gpt-4.1-mini, google/gemini-2.5-flash-lite, etc. (some are free, some paid, some are more powerful but take longer and cost more)
    mcpTools: MCPToolName[] // mcp tools to use (do not confuse with code tools)
    codeTools: CodeToolName[] // code tools to use.
    handOffs: string[] // node-id
    memory?: Record<string, string> | null
    ${includeWaitFor ? "waitFor?: string[]  // wait for node-id, or more than one node-id to finish" : ""}
    ${includeHandOffType ? "handOffType?: 'conditional' | 'sequential' | 'parallel'" : ""}
}


`
