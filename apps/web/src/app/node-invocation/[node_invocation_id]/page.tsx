import { supabase } from "@/lib/supabase"
import { NodeInvocation } from "@/trace-visualization/components"
import type { FullTraceEntry } from "@/trace-visualization/types"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{
    node_invocation_id: string
  }>
}

async function getNodeInvocationData(nodeInvocationId: string): Promise<FullTraceEntry> {
  const { data: nodeInvocation, error } = await supabase
    .from("NodeInvocation")
    .select(
      `
      *,
      NodeVersion (*),
      inputs:Message!Message_target_invocation_id_fkey (*),
      outputs:Message!Message_origin_invocation_id_fkey (*)
    `,
    )
    .eq("node_invocation_id", nodeInvocationId)
    .single()

  if (error || !nodeInvocation) {
    throw new Error("Node invocation not found")
  }

  const { NodeVersion: nodeDefinition, inputs = [], outputs = [], ...invocation } = nodeInvocation

  return {
    invocation: {
      ...invocation,
      node: nodeDefinition,
      inputs,
      outputs,
    },
    nodeDefinition,
    inputs,
    output: outputs[0] || null,
  }
}

export default async function NodeInvocationPage({ params }: PageProps) {
  try {
    const { node_invocation_id } = await params
    const entry = await getNodeInvocationData(node_invocation_id)

    return <NodeInvocation entry={entry} />
  } catch (error) {
    console.error("Failed to load node invocation:", error)
    notFound()
  }
}
