/**
 * Tool mutation operations for evolving node capabilities.
 *
 * This module provides mutations that modify the tools available to workflow
 * nodes. Tools are the primary way nodes interact with external systems and
 * perform actions, making tool mutations critical for capability evolution.
 */

import { EvolutionUtils } from "@core/improvement/gp/resources/utils"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { GENERALIZATION_LIMITS } from "@core/prompts/generalizationLimits"
import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@core/tools/tool.types"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import z from "zod"
import type { Genome } from "../../Genome"
import type { MutationOperator } from "./mutation.types"

const OPERATORS_WITH_FEEDBACK = CONFIG.improvement.flags.operatorsWithFeedback

/**
 * Mutates tool assignments across workflow nodes.
 *
 * Uses AI to intelligently decide how to modify tool availability:
 * adding new capabilities, removing redundant tools, or redistributing
 * tools between nodes for better task specialization.
 *
 * @remarks
 * Tool mutations enable workflows to evolve their interaction patterns
 * with external systems. This includes both MCP (Model Context Protocol)
 * tools and code tools, allowing diverse capability evolution.
 */
export class ToolMutation implements MutationOperator {
  /**
   * Executes tool mutation on the workflow configuration.
   *
   * @param mutatedConfig - The workflow configuration to mutate (modified in-place)
   * @param parent - Parent genome providing context and feedback
   * @param _intensity - Mutation intensity (unused but required by interface)
   * @returns The cost in USD of the AI call for mutation decisions
   *
   * @remarks
   * - Uses AI to decide mutation action: add, remove, or move tools
   * - Can target specific nodes or apply changes globally
   * - Incorporates parent feedback when OPERATORS_WITH_FEEDBACK is enabled
   * - Uses Poisson distribution for randomness in tool selection
   * - Validates tool existence before applying mutations
   */
  async execute(
    mutatedConfig: WorkflowConfig,
    parent: Genome,
    _intensity: number
  ): Promise<number> {
    try {
      // get human-readable workflow description for AI context
      const workflowDescription = parent.toString({
        easyModelNames: true,
      })

      // incorporate evolutionary feedback if enabled
      const feedback = OPERATORS_WITH_FEEDBACK ? parent.getFeedback() : null

      // compile all available tools from both MCP and code tool sets
      const allAvailableTools = [
        ...ACTIVE_MCP_TOOL_NAMES,
        ...ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
      ] as string[]

      // define schema for structured AI output to ensure valid mutations
      const mutationSchema = z.object({
        action: z.enum(["add", "remove", "move"]), // mutation type
        tool: z.string(), // tool name to mutate
        nodeIds: z.array(z.string()), // target nodes for add/remove
        fromNodeId: z.string().optional(), // source node for move
        toNodeId: z.string().optional(), // destination node for move
        allNodes: z.boolean().optional(), // apply to all nodes flag
      })

      // request AI to decide mutation strategy
      const instructions = await sendAI({
        model: getDefaultModels().nano,
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

            What are you choosing? It must make logical sense for that node to use it, but it can be a bit random if this number is > 3: ${EvolutionUtils.poisson(2)} // adds controlled randomness 

            the goal of the workflow is : ${parent.getGoal()}

            ${GENERALIZATION_LIMITS}

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

      // categorize tool type for proper handling
      const isMCPTool = ACTIVE_MCP_TOOL_NAMES.includes(tool as MCPToolName)
      const isCodeTool = ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT.includes(
        tool as CodeToolName
      )

      // execute the mutation on the workflow configuration
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

  /**
   * Applies the tool mutation to the workflow configuration.
   *
   * @param mutatedConfig - Workflow to modify
   * @param action - Type of mutation: add, remove, or move
   * @param tool - Tool name to mutate
   * @param nodeIds - Target nodes for add/remove operations
   * @param fromNodeId - Source node for move operations
   * @param toNodeId - Destination node for move operations
   * @param allNodes - Whether to apply to all nodes
   * @param isMCPTool - Whether tool is an MCP tool
   * @param isCodeTool - Whether tool is a code tool
   *
   * @remarks
   * Modifies the workflow configuration in-place. Handles both MCP and code
   * tools appropriately, ensuring tools aren't duplicated when added and
   * are properly removed from source nodes when moved.
   */
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
