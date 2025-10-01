export const createWorkflowPrompt = `Create a workflow as a directed acyclic graph (DAG). You can make it more complex by adding nodes and handoffs.

## Structure

{
  "entryNodeId": "workflow-node-starter",
  "nodes": [
    {
      "nodeId": "string",                    // unique id; MUST NOT be "end"
      "description": "string",               // description of the node
      "systemPrompt": "string",              // system prompt for the node
      "modelName": "ModelName",              // e.g. openai/gpt-4.1-mini, google/gemini-2.5-flash-lite
      "mcpTools": ["MCPToolName"],           // mcp tools to use (not code tools)
      "codeTools": ["CodeToolName"],         // code tools to use
      "handOffs": ["string"],                // next targets by node-id; MAY include "end" (except for parallel; see below)
      "memory": {},                          // optional: per-node initial state/config (no auto merging)
      "waitFor": ["string"],                 // optional: predecessors that MUST succeed before this node may run
      "handOffType": "conditional"           // optional: how successors are triggered
    }
  ]
}

## Execution

- Start at entryNodeId. Each node runs at most once → success or failure
- Edges defined by handOffs (ignore "end"; it's a terminal sink, not a node)

## Handoffs (when current node succeeds)

**Sequential** → trigger successors **in array order**; only move to next if previous **succeeded**. Stop on first failure.

**Parallel** → trigger **all** listed successors **at once**. **Parallel branches are isolated:** they do not see each other's outputs or state; they only meet again at a join node. Do not include "end" in parallel handOffs; including "end" disables parallel behavior and falls back to single-target selection.

**Conditional** → trigger **exactly one** successor. Current runtime selects a single successor via the same selection mechanism as sequential (model-based routing); memory.next is not used.

## Joins (waitFor)

- Multiple incoming edges MUST declare waitFor listing **all** expected predecessors
- Eligible only when **all** listed predecessors **succeed**
- waitFor does **not** create edges; predecessors must also list this node in handOffs
- No implicit joins: multiple predecessors **without** waitFor is invalid

## Eligibility

**With waitFor:** run only after **all** listed predecessors succeed
**Without waitFor:** exactly **one** predecessor that succeeded; more than one → invalid

## Termination

- Every maximal path must end with handoff to "end"
- Leaves must include "end" in handOffs

## Defaults & Rules

**HandOffType omitted:**
- handOffs.length === 1 → treat as sequential
- handOffs.length > 1 → treated as sequential selection (model chooses one)

**Other:**
- parallel requires handOffs.length ≥ 2 and must not include "end"
- Node failure: no successors triggered; waitFor nodes never run

## Validation (reject if any fail)

- All nodes reachable from entryNodeId
- Graph is acyclic
- Every leaf hands off to "end"
- Unique nodeIds; none equal "end"
- Every handOffs target exists or is "end"
- At most **10** nodes (not counting "end")
- No implicit joins; waitFor must match actual inbound edges

## Data/Memory

memory is **per-node**. No automatic cross-node context. **Parallel branches do not share context**; aggregation must be done explicitly at join node.`
