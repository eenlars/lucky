export const createWorkflowPrompt = `

this is an example of a very basic workflow. you can make it more complex by adding more nodes, and more complex handoffs.

{
  "entryNodeId": "workflow-node-starter",
  "nodes": [
    {
        nodeId: string // unique id for the node
        description: string // description of the node.
        systemPrompt: string // system prompt for the node.
        modelName: ModelName // openai/gpt-4.1-mini, google/gemini-2.5-flash-lite, etc. (some are free, some paid, some are more powerful but take longer and cost more)
        mcpTools: MCPToolName[] // mcp tools to use (do not confuse with code tools)
        codeTools: CodeToolName[] // code tools to use.
        handOffs: string[] // node-id
        memory?: Record<string, string> | null
        waitFor?: string[]  // wait for node-id, or more than one node-id to finish: important: if you're aggregating this needs to be set!
        handOffType?: "conditional" | "sequential" | "parallel"
    }
  ]
    
  - every node must be reachable from the first node (there must be a directed path from the first node to every other node in the workflow)
  - the last node must have a handoff to 'end' (the end of the workflow)
  - the workflow must be a directed acyclic graph (no cycles allowed in the node connections)
  - the workflow must have at most 10 nodes
`.trim()
