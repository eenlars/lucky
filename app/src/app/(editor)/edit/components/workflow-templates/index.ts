// Workflow templates for quick start

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

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
          modelName: "openai/gpt-4o-mini",
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
          systemPrompt:
            "You are an expert chef who analyzes ingredients and suggests recipes.",
          mcpTools: [],
          codeTools: [],
          handOffs: ["recipe_generator"],
          modelName: "openai/gpt-4o-mini",
        },
        {
          nodeId: "recipe_generator",
          description: "Generate a recipe",
          systemPrompt:
            "Generate a complete recipe based on parsed ingredients.",
          mcpTools: [],
          codeTools: [],
          handOffs: ["nutrition_analyzer"],
          modelName: "openai/gpt-4o-mini",
        },
        {
          nodeId: "nutrition_analyzer",
          description: "Analyze nutrition",
          systemPrompt: "Analyze recipe and provide nutritional information.",
          mcpTools: [],
          codeTools: [],
          handOffs: [],
          modelName: "openai/gpt-4o-mini",
        },
      ],
    },
  },
]
