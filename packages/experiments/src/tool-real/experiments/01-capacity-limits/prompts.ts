/**
 * prompts.ts - Test scenarios for tool capacity experiment
 * Defines prompts that require specific tools. This experiment is strictly about
 * selecting the correct tool — no output validation.
 */

export interface Prompt {
  id: string
  content: string
  expects: {
    tool: string // the ONLY tool that should be selected
  }
}

/** minimal but enough to test behaviour */
export const prompts: Prompt[] = [
  {
    id: "simple-add",
    content: "What is 2 plus 2? Use a tool to calculate this.",
    expects: {
      tool: "always_right",
    },
  },
  {
    id: "confusing",
    content: "Using α=3 and β=4, what is α+β? Use the appropriate tool.",
    expects: {
      tool: "confusing_but_right",
    },
  },
  {
    id: "salmon-specific",
    content: "Choose the tool that can best catch a salmon.",
    expects: {
      tool: "catch_salmon",
    },
  },
  {
    id: "find-albert-heijn-nl",
    content: "Find Albert Heijn stores in the Netherlands within given bounds; use the search tool for places.",
    expects: {
      tool: "search_google_maps",
    },
  },
  {
    id: "find-salmon-in-the-world-with-high-success-rate",
    content: "Get a tool that will get you a salmon. it must be extremely good at getting salmons.",
    expects: {
      tool: "unclear_getter",
    },
  },
]
