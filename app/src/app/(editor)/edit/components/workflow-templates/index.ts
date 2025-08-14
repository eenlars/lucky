// Workflow templates for quick start

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  workflow: object
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
          modelName: "gpt-4o-mini",
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
          mcpTools: ["search"],
          codeTools: [],
          handOffs: ["recipe_generator"],
          modelName: "gpt-4o-mini",
        },
        {
          nodeId: "recipe_generator",
          description: "Generate a recipe",
          systemPrompt:
            "Generate a complete recipe based on parsed ingredients.",
          mcpTools: ["search", "web_scrape"],
          codeTools: [],
          handOffs: ["nutrition_analyzer"],
          modelName: "gpt-4o-mini",
        },
        {
          nodeId: "nutrition_analyzer",
          description: "Analyze nutrition",
          systemPrompt: "Analyze recipe and provide nutritional information.",
          mcpTools: ["search"],
          codeTools: [],
          handOffs: [],
          modelName: "gpt-4o-mini",
        },
      ],
    },
  },
]
