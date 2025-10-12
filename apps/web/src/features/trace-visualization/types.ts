import type { Tables } from "@lucky/shared/client"
import type { MessageMetadata, NodeInvocationExtended } from "./db/Workflow/nodeInvocations"

export interface FullTraceEntry {
  invocation: NodeInvocationExtended
  nodeDefinition: Tables<"NodeVersion">
  inputs: MessageMetadata[]
  output: MessageMetadata | null
}
