// Workflow templates for quick start

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  workflow: WorkflowConfig
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "basic",
    name: "Basic Assistant",
    description: "Simple AI assistant workflow",
    workflow: {
      entryNodeId: "assistant",
      nodes: [
        {
          nodeId: "assistant",
          description: "Assistant",
          systemPrompt: "You are a helpful AI assistant.",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          modelName: getDefaultModels().default,
        },
      ],
    },
  },
  {
    id: "recipe",
    name: "Recipe Generator",
    description: "Generate recipes from ingredients",
    workflow: {
      entryNodeId: "ingredient_parser",
      nodes: [
        {
          nodeId: "ingredient_parser",
          description: "Parse ingredients",
          systemPrompt: "You are an expert chef who analyzes ingredients and suggests recipes.",
          mcpTools: [],
          codeTools: [],
          handOffs: ["recipe_generator"],
          modelName: getDefaultModels().default,
        },
        {
          nodeId: "recipe_generator",
          description: "Generate a recipe",
          systemPrompt: "Generate a complete recipe based on parsed ingredients.",
          mcpTools: [],
          codeTools: [],
          handOffs: ["nutrition_analyzer"],
          modelName: getDefaultModels().default,
        },
        {
          nodeId: "nutrition_analyzer",
          description: "Analyze nutrition",
          systemPrompt: "Analyze recipe and provide nutritional information.",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          modelName: getDefaultModels().default,
        },
      ],
    },
  },
]
