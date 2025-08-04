/**
 * tool mutation operations
 */

import { sendAI } from "@/messages/api/sendAI"
import { lgg } from "@/utils/logging/Logger"
import { CONFIG, MODELS } from "@/runtime/settings/constants"
import { EvolutionUtils } from "@gp/resources/utils"
import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@tools/tool.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import z from "zod"
import type { Genome } from "../../Genome"
import type { MutationOperator } from "./mutation.types"

const OPERATORS_WITH_FEEDBACK = CONFIG.improvement.flags.operatorsWithFeedback

export class ToolMutation implements MutationOperator {
  async execute(
    mutatedConfig: WorkflowConfig,
    parent: Genome,
    _intensity: number
  ): Promise<number> {
    try {
      // parent toString() -> make sense of what the workflow looks like
      const workflowDescription = parent.toString({
        easyModelNames: true,
      })

      // parent.getFeedback() -> what was the feedback from the last round?
      const feedback = OPERATORS_WITH_FEEDBACK ? parent.getFeedback() : null

      // get available tools (excluding default tools)
      const allAvailableTools = [
        ...ACTIVE_MCP_TOOL_NAMES,
        ...ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
      ] as string[]

      // define schema for structured output
      const mutationSchema = z.object({
        action: z.enum(["add", "remove", "move"]),
        tool: z.string(),
        nodeIds: z.array(z.string()),
        fromNodeId: z.string().optional(),
        toNodeId: z.string().optional(),
        allNodes: z.boolean().optional(),
      })

      // instructions = sendAi () : text ->
      const instructions = await sendAI({
        model: MODELS.nano,
        messages: [
          {
            role: "user",
            content: `You are going to change a tool for the following workflow: ${workflowDescription}

${
  OPERATORS_WITH_FEEDBACK
    ? ` Based on the feedback: ${feedback || "No specific feedback"}`
    : ""
}

You can do one of the following:
- remove a tool from one node
- remove a tool for all nodes
- add a tool for all nodes
- add a tool for one node
- move a tool from one node to another node

What are you choosing? It must make logical sense for that node to use it, but it can be a bit random if this number is > 3: ${EvolutionUtils.poisson(2)} 

the goal of the workflow is : ${parent.getGoal()}

If choosing new tools, these are the available tools you can choose from: ${allAvailableTools.join(", ")}

Your output should include the tool(s), node id(s), and the action.`,
          },
        ],
        mode: "structured",
        schema: mutationSchema,
      })

      // handle error if exists
      if (!instructions.success) {
        lgg.error(
          "Failed to get tool mutation instructions:",
          instructions.error
        )
        return instructions.usdCost ?? 0
      }

      const { action, tool, nodeIds, fromNodeId, toNodeId, allNodes } =
        instructions.data

      // validate tool exists in available tools
      if (!allAvailableTools.includes(tool)) {
        lgg.error(`Invalid tool suggested: ${tool}`)
        return instructions.usdCost ?? 0
      }

      // determine if it's MCP or Code tool
      const isMCPTool = ACTIVE_MCP_TOOL_NAMES.includes(tool as MCPToolName)
      const isCodeTool = ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT.includes(
        tool as CodeToolName
      )

      // apply the mutation to the workflow config
      this.applyToolMutation(
        mutatedConfig,
        action,
        tool,
        nodeIds,
        fromNodeId,
        toNodeId,
        allNodes,
        isMCPTool,
        isCodeTool
      )

      return instructions.usdCost ?? 0
    } catch (error) {
      lgg.error("mutateTool failed:", error)
      return 0
    }
  }

  private applyToolMutation(
    mutatedConfig: WorkflowConfig,
    action: "add" | "remove" | "move",
    tool: string,
    nodeIds: string[] | undefined,
    fromNodeId: string | undefined,
    toNodeId: string | undefined,
    allNodes: boolean | undefined,
    isMCPTool: boolean,
    isCodeTool: boolean
  ): void {
    switch (action) {
      case "add":
        if (allNodes) {
          mutatedConfig.nodes.forEach((node) => {
            if (isMCPTool && !node.mcpTools.includes(tool as MCPToolName)) {
              node.mcpTools.push(tool as MCPToolName)
            } else if (
              isCodeTool &&
              !node.codeTools.includes(tool as CodeToolName)
            ) {
              node.codeTools.push(tool as CodeToolName)
            }
          })
        } else {
          nodeIds?.forEach((nodeId: string) => {
            const node = mutatedConfig.nodes.find((n) => n.nodeId === nodeId)
            if (node) {
              if (isMCPTool && !node.mcpTools.includes(tool as MCPToolName)) {
                node.mcpTools.push(tool as MCPToolName)
              } else if (
                isCodeTool &&
                !node.codeTools.includes(tool as CodeToolName)
              ) {
                node.codeTools.push(tool as CodeToolName)
              }
            }
          })
        }
        break

      case "remove":
        if (allNodes) {
          mutatedConfig.nodes.forEach((node) => {
            if (isMCPTool) {
              node.mcpTools = node.mcpTools.filter((t) => t !== tool)
            } else if (isCodeTool) {
              node.codeTools = node.codeTools.filter((t) => t !== tool)
            }
          })
        } else {
          nodeIds?.forEach((nodeId) => {
            const node = mutatedConfig.nodes.find((n) => n.nodeId === nodeId)
            if (node) {
              if (isMCPTool) {
                node.mcpTools = node.mcpTools.filter((t) => t !== tool)
              } else if (isCodeTool) {
                node.codeTools = node.codeTools.filter((t) => t !== tool)
              }
            }
          })
        }
        break

      case "move":
        if (fromNodeId && toNodeId) {
          const fromNode = mutatedConfig.nodes.find(
            (n) => n.nodeId === fromNodeId
          )
          const toNode = mutatedConfig.nodes.find((n) => n.nodeId === toNodeId)

          if (fromNode && toNode) {
            if (isMCPTool) {
              fromNode.mcpTools = fromNode.mcpTools.filter((t) => t !== tool)
              if (!toNode.mcpTools.includes(tool as MCPToolName)) {
                toNode.mcpTools.push(tool as MCPToolName)
              }
            } else if (isCodeTool) {
              fromNode.codeTools = fromNode.codeTools.filter((t) => t !== tool)
              if (!toNode.codeTools.includes(tool as CodeToolName)) {
                toNode.codeTools.push(tool as CodeToolName)
              }
            }
          }
        }
        break
    }
  }
}
