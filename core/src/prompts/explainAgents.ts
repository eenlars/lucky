import { llmify } from "@core/utils/common/llmify"
import type { AnyModelName } from "@core/utils/spending/models.types"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"

export function explainAgents(
  nodes: WorkflowNodeConfig[],
  easyModelNames: boolean = false
): string {
  return llmify(`
    ${nodes
      .map(
        (node) => `
        # agent ${node.nodeId}
        nodeId: ${node.nodeId}
        description: ${node.description}
        systemPrompt: ${node.systemPrompt}
        modelName: ${easyModelNames ? mapModelNameToEasyName(node.modelName) : node.modelName}
        mcpTools: ${JSON.stringify(node.mcpTools)}
        codeTools: ${JSON.stringify(node.codeTools)}
        handOffs: ${JSON.stringify(node.handOffs)}
        memory: ${JSON.stringify(node.memory)}
        `
      )
      .join("\n")}
  `)
}

export const mapModelNameToEasyName = (
  modelName: AnyModelName
): "low" | "medium" | "high" => {
  if (modelName === "openai/gpt-4.1-nano") return "low"
  if (modelName === "openai/gpt-4.1-mini") return "medium"
  if (modelName === "openai/gpt-4.1") return "high"
  if (modelName === "anthropic/claude-sonnet-4") return "high"
  if (modelName === "anthropic/claude-3-5-haiku") return "medium"
  if (modelName === "google/gemini-2.5-flash-lite") return "high"
  if (modelName === "x-ai/grok-4") return "high"
  if (modelName === "moonshotai/kimi-k2") return "low"

  return "medium"
}
