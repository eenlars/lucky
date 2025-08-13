import type { Database } from "@lucky/shared"
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
import type { NodeInvocationExtended } from "./db/Workflow/fullWorkflow"

export interface FullTraceEntry {
  invocation: NodeInvocationExtended
  nodeDefinition: Tables<"NodeVersion">
  inputs: Tables<"Message">[]
  output: Tables<"Message"> | null
}
