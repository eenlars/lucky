import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"
import { defineTool } from "@lucky/tools"
import { z } from "zod"

const runInspector = defineTool({
  name: "runInspector",
  description:
    "Inspect and analyze the current workflow invocation logs. Provides comprehensive information about what happened in the workflow so far, including node invocations, messages, execution status, costs, and errors. Use this to debug workflows, understand execution flow, or get detailed logs for analysis.",
  params: z.object({
    action: z
      .enum(["full_log", "summary", "nodes", "messages", "costs", "errors"])
      .describe(
        "The type of information to retrieve: 'full_log' for complete workflow details, 'summary' for basic info, 'nodes' for node invocations, 'messages' for inter-node messages, 'costs' for USD costs, 'errors' for error analysis",
      ),
    query: z
      .string()
      .optional()
      .describe(
        "Optional specific question or filter for the logs (e.g., 'show me all errors', 'what happened with node X', 'cost breakdown')",
      ),
  }),
  async execute(params, context) {
    const { action, query } = params
    const { workflowInvocationId } = context

    lgg.info(`runInspector: ${action} for workflow ${workflowInvocationId}`, {
      query,
    })

    try {
      // Get basic workflow information
      const { data: workflowData, error: workflowError } = await supabase
        .from("WorkflowInvocation")
        .select(
          `
          *,
          WorkflowVersion (
            *,
            Workflow ( * )
          )
        `,
        )
        .eq("wf_invocation_id", workflowInvocationId)
        .single()

      if (workflowError || !workflowData) {
        return {
          success: false,
          error: `Failed to retrieve workflow data: ${workflowError?.message || "Not found"}`,
          data: null,
        }
      }

      // Get node invocations
      const { data: nodeInvocations, error: nodeError } = await supabase
        .from("NodeInvocation")
        .select(
          `
          *,
          NodeVersion ( * )
        `,
        )
        .eq("wf_invocation_id", workflowInvocationId)
        .order("start_time", { ascending: true })

      if (nodeError) {
        return {
          success: false,
          error: `Failed to retrieve node invocations: ${nodeError.message}`,
          data: null,
        }
      }

      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from("Message")
        .select("*")
        .eq("wf_invocation_id", workflowInvocationId)
        .order("created_at", { ascending: true })

      if (messagesError) {
        return {
          success: false,
          error: `Failed to retrieve messages: ${messagesError.message}`,
          data: null,
        }
      }

      // Process based on action type
      switch (action) {
        case "full_log":
          return {
            success: true,
            data: {
              workflow: {
                id: workflowData.wf_invocation_id,
                status: workflowData.status,
                start_time: workflowData.start_time,
                end_time: workflowData.end_time,
                total_cost: workflowData.usd_cost,
                fitness: workflowData.fitness,
                run_id: workflowData.run_id,
                generation_id: workflowData.generation_id,
                workflow_input: workflowData.workflow_input,
                workflow_output: workflowData.workflow_output,
                version: workflowData.WorkflowVersion,
              },
              node_invocations:
                nodeInvocations?.map(node => ({
                  id: node.node_invocation_id,
                  node_id: node.node_id,
                  status: node.status,
                  start_time: node.start_time,
                  end_time: node.end_time,
                  cost: node.usd_cost,
                  summary: node.summary,
                  output: node.output,
                  model: node.model,
                  files: node.files,
                  node_version: node.NodeVersion,
                  extras: node.extras,
                })) || [],
              messages:
                messages?.map(msg => ({
                  id: msg.msg_id,
                  from_node: msg.from_node_id,
                  to_node: msg.to_node_id,
                  role: msg.role,
                  sequence: msg.seq,
                  created_at: msg.created_at,
                  payload: msg.payload,
                  origin_invocation_id: msg.origin_invocation_id,
                  target_invocation_id: msg.target_invocation_id,
                })) || [],
              statistics: {
                total_nodes: nodeInvocations?.length || 0,
                total_messages: messages?.length || 0,
                total_cost: workflowData.usd_cost,
                execution_time: workflowData.end_time
                  ? new Date(workflowData.end_time).getTime() - new Date(workflowData.start_time).getTime()
                  : Date.now() - new Date(workflowData.start_time).getTime(),
                failed_nodes: nodeInvocations?.filter(n => n.status === "failed").length || 0,
                completed_nodes: nodeInvocations?.filter(n => n.status === "completed").length || 0,
              },
            },
            error: null,
          }

        case "summary":
          return {
            success: true,
            data: {
              workflow_id: workflowData.wf_invocation_id,
              status: workflowData.status,
              start_time: workflowData.start_time,
              end_time: workflowData.end_time,
              total_cost: workflowData.usd_cost,
              nodes_executed: nodeInvocations?.length || 0,
              messages_sent: messages?.length || 0,
              current_stage: workflowData.status === "running" ? "In Progress" : "Completed",
              latest_node: nodeInvocations?.length ? nodeInvocations[nodeInvocations.length - 1]?.node_id : null,
              fitness: workflowData.fitness,
              run_id: workflowData.run_id,
              generation_id: workflowData.generation_id,
            },
            error: null,
          }

        case "nodes":
          return {
            success: true,
            data: {
              node_invocations:
                nodeInvocations?.map(node => ({
                  id: node.node_invocation_id,
                  node_id: node.node_id,
                  status: node.status,
                  start_time: node.start_time,
                  end_time: node.end_time,
                  cost: node.usd_cost,
                  summary: node.summary,
                  model: node.model,
                  system_prompt: node.NodeVersion?.system_prompt,
                  tools: node.NodeVersion?.tools,
                  output_preview:
                    typeof node.output === "string"
                      ? node.output.substring(0, 200) + (node.output.length > 200 ? "..." : "")
                      : `${JSON.stringify(node.output).substring(0, 200)}...`,
                })) || [],
              total_nodes: nodeInvocations?.length || 0,
              total_cost: nodeInvocations?.reduce((sum, node) => sum + (node.usd_cost || 0), 0) || 0,
            },
            error: null,
          }

        case "messages":
          return {
            success: true,
            data: {
              messages:
                messages?.map(msg => ({
                  id: msg.msg_id,
                  from_node: msg.from_node_id,
                  to_node: msg.to_node_id,
                  role: msg.role,
                  sequence: msg.seq,
                  created_at: msg.created_at,
                  payload_type: (msg.payload as any)?.kind || "unknown",
                  payload_preview: `${JSON.stringify(msg.payload).substring(0, 200)}...`,
                  origin_invocation_id: msg.origin_invocation_id,
                  target_invocation_id: msg.target_invocation_id,
                })) || [],
              message_flow:
                messages?.map(msg => `${msg.from_node_id} -> ${msg.to_node_id} (${msg.role})`).join(" | ") || "",
              total_messages: messages?.length || 0,
            },
            error: null,
          }

        case "costs": {
          const nodeCosts =
            nodeInvocations?.map(node => ({
              node_id: node.node_id,
              node_invocation_id: node.node_invocation_id,
              cost: node.usd_cost || 0,
              model: node.model,
              start_time: node.start_time,
              end_time: node.end_time,
            })) || []

          return {
            success: true,
            data: {
              workflow_total_cost: workflowData.usd_cost,
              node_costs: nodeCosts,
              cost_breakdown: nodeCosts.reduce(
                (acc, node) => {
                  acc[node.node_id] = (acc[node.node_id] || 0) + node.cost
                  return acc
                },
                {} as Record<string, number>,
              ),
              most_expensive_node:
                nodeCosts.length > 0 ? nodeCosts.reduce((max, node) => (node.cost > max.cost ? node : max)) : null,
              average_cost_per_node:
                nodeCosts.length > 0 ? nodeCosts.reduce((sum, node) => sum + node.cost, 0) / nodeCosts.length : 0,
            },
            error: null,
          }
        }

        case "errors": {
          const failedNodes = nodeInvocations?.filter(node => node.status === "failed") || []
          const errorMessages =
            messages?.filter(msg => {
              const payload = msg.payload as any
              return payload?.type === "error" || payload?.error
            }) || []

          return {
            success: true,
            data: {
              workflow_status: workflowData.status,
              failed_nodes: failedNodes.map(node => ({
                node_id: node.node_id,
                node_invocation_id: node.node_invocation_id,
                start_time: node.start_time,
                end_time: node.end_time,
                summary: node.summary,
                output: node.output,
                extras: node.extras,
              })),
              error_messages: errorMessages.map(msg => ({
                message_id: msg.msg_id,
                from_node: msg.from_node_id,
                to_node: msg.to_node_id,
                created_at: msg.created_at,
                payload: msg.payload,
              })),
              total_errors: failedNodes.length + errorMessages.length,
              has_errors: failedNodes.length > 0 || errorMessages.length > 0,
            },
            error: null,
          }
        }

        default: {
          const _exhaustiveCheck: never = action
          void _exhaustiveCheck
          return {
            success: false,
            error: `Unknown action: ${action}`,
            data: null,
          }
        }
      }
    } catch (error) {
      lgg.error("runInspector error:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        data: null,
      }
    }
  },
})

export const tool = runInspector
