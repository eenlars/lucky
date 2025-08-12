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
      nodes: [
        {
          nodeId: "start",
          systemPrompt: "You are a helpful AI assistant.",
          tools: [],
          handoffs: [],
          model: "claude-3.5-sonnet"
        }
      ],
      edges: []
    }
  },
  {
    id: "recipe",
    name: "Recipe Generator",
    description: "Generate recipes from ingredients",
    workflow: {
      nodes: [
        {
          nodeId: "ingredient_parser",
          systemPrompt: "You are an expert chef who analyzes ingredients and suggests recipes. Parse the user's available ingredients and understand dietary restrictions.",
          tools: ["search"],
          handoffs: ["recipe_generator"],
          model: "claude-3.5-sonnet"
        },
        {
          nodeId: "recipe_generator", 
          systemPrompt: "You are a creative chef who creates detailed recipes. Generate a complete recipe with ingredients, instructions, cooking time, and difficulty level based on the parsed ingredients.",
          tools: ["search", "web_scrape"],
          handoffs: ["nutrition_analyzer"],
          model: "claude-3.5-sonnet"
        },
        {
          nodeId: "nutrition_analyzer",
          systemPrompt: "You are a nutrition expert. Analyze the recipe and provide nutritional information, calorie count, and health benefits.",
          tools: ["search"],
          handoffs: [],
          model: "claude-3.5-sonnet"
        }
      ],
      edges: [
        {
          from: "ingredient_parser",
          to: "recipe_generator"
        },
        {
          from: "recipe_generator", 
          to: "nutrition_analyzer"
        }
      ]
    }
  }
]