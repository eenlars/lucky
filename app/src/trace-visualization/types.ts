import type { Tables } from "@lucky/shared"
import type { NodeInvocationExtended } from "./db/Workflow/fullWorkflow"

export interface FullTraceEntry {
  invocation: NodeInvocationExtended
  nodeDefinition: Tables<"NodeVersion">
  inputs: Tables<"Message">[]
  output: Tables<"Message"> | null
}
