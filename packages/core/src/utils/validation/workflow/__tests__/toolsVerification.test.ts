import { CONFIG, getDefaultModels } from "@core/core-config/compat"
import { getCoreConfig, initCoreConfig } from "@core/core-config/coreConfig"
import type { CoreToolsConfig } from "@core/core-config/types"
import type { AllowedModelName } from "@core/utils/spending/models.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  verifyAllToolsAreActive,
  verifyMaxToolsPerAgent,
  verifyToolSetEachNodeIsUnique,
  verifyToolsUnique,
} from "../toolsVerification"
import { verifyModelNameExists, verifyModelsAreActive, verifyNoDuplicateHandoffs } from "../verifyWorkflow"

// Mock the constants module
vi.mock("@examples/settings/constants", () => ({
  CONFIG: {
    tools: {
      uniqueToolsPerAgent: true,
      uniqueToolSetsPerAgent: true,
      maxToolsPerAgent: 3,
      defaultTools: new Set(["urlToMarkdown", "csvReader"]),
      inactive: new Set(["readFileLegacy"]),
    },
    models: {
      inactive: new Set(["inactive-model"]),
    },
  },
}))

// Mock the tool types
vi.mock("@core/tools/tool.types", () => ({
  ALL_ACTIVE_TOOL_NAMES: [
    "searchGoogleMaps",
    "saveFileLegacy",
    "readFileLegacy",
    "verifyLocation",
    "locationDataManager",
    "locationDataInfo",
    "browserAutomation",
    "firecrawlAPI",
    "urlToMarkdown",
    "csvReader",
    "csvInfo",
    "csvWriter",
    "csvFilter",
    "contextHandler",
    "contextList",
    "contextGet",
    "contextSet",
    "contextManage",
    "csvRowProcessor",
    "todoRead",
    "todoWrite",
    "expectedOutputHandler",
    "memoryManager",
    "humanApproval",
    "humanHelp",
    "runInspector",
    "jsExecutor",
    // MCP
    "proxy",
    "tavily",
    "filesystem",
    "firecrawl",
    "browserUse",
    "googleScholar",
    "playwright",
    "serpAPI",
  ],
  INACTIVE_TOOLS: new Set(["readFileLegacy", "deprecatedTool"]),
}))

const applyToolOverrides = (overrides: Partial<CoreToolsConfig>) => {
  const baseTools = getCoreConfig().tools
  const nextTools = { ...baseTools, ...overrides } as CoreToolsConfig
  initCoreConfig({ tools: nextTools })
}

const _validModel = getDefaultModels().medium
const wrongExample: WorkflowConfig = {
  entryNodeId: "planning-node",
  nodes: [
    {
      nodeId: "planning-node",
      description:
        "Planning Node – Generates a comprehensive task list based on the request, ensuring data completeness and providing actionable next steps.",
      systemPrompt: "",
      modelName: getDefaultModels().medium,
      mcpTools: [],
      codeTools: [],
      handOffs: ["google-maps-scraper", "enhanced-store-extractor", "store-data-automation"],
      memory: {},
    },
    {
      nodeId: "google-maps-scraper",
      description:
        "Google Maps Node – Efficiently locates businesses in the area with improved accuracy, utilizing optimized search parameters.",
      systemPrompt: "",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: ["searchGoogleMaps"],
      handOffs: ["file-saver-1"],
      memory: {
        search_accuracy: "Need to improve the thoroughness of store extraction to include all locations.",
        verification: "Implement better cross-referencing to ensure list completeness.",
        efficiency: "Reduce search time by optimizing query parameters and response handling.",
      },
    },
    {
      nodeId: "file-saver-1",
      description:
        "File Saver Node – Saves detailed results, including store counts and unique addresses, to a specified output file path.",
      systemPrompt: "",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: ["saveFileLegacy"],
      handOffs: ["end"],
    },
    {
      nodeId: "enhanced-store-extractor",
      description:
        "Enhanced Store Extractor Node – Employs advanced algorithms to search for and extract all relevant store locations, verifying results against multiple sources for accuracy.",
      systemPrompt: "",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: ["verifyLocation"],
      handOffs: ["file-saver-1"],
      memory: {
        search_accuracy: "Focus on improving the thoroughness of store extraction to include all locations.",
        verification: "Cross-reference results with multiple sources to ensure list completeness.",
        efficiency: "Optimize search parameters to reduce response time.",
      },
    },
    {
      nodeId: "store-data-automation",
      description:
        "Store Data Automation Node – Automatically retrieves and verifies store addresses from a dedicated API, ensuring comprehensive coverage and reducing manual effort.",
      systemPrompt: "",
      modelName: getDefaultModels().nano,
      mcpTools: [],
      codeTools: ["searchGoogleMaps"],
      handOffs: ["file-saver-1"],
      memory: {
        user_preference: "User prefers faster and more automated solutions for data extraction tasks.",
      },
    },
  ],
}

const modelNameMissingExample: WorkflowConfig = {
  entryNodeId: "planning-node",
  nodes: [
    {
      nodeId: "planning-node",
      description: "Planning Node",
      systemPrompt: "",
      modelName: undefined as unknown as AllowedModelName,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      memory: {},
    },
  ],
}

const invalidModelNameExample: WorkflowConfig = {
  entryNodeId: "planning-node",
  nodes: [
    {
      nodeId: "planning-node",
      description: "Planning Node",
      systemPrompt: "",
      modelName: "not-a-real-model" as unknown as AllowedModelName,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      memory: {},
    },
  ],
}

const duplicateHandoffsExample: WorkflowConfig = {
  entryNodeId: "planning-node",
  nodes: [
    {
      nodeId: "planning-node",
      description: "Planning Node",
      systemPrompt: "",
      modelName: getDefaultModels().medium,
      mcpTools: [],
      codeTools: [],
      handOffs: ["end", "end"],
      memory: {},
    },
  ],
}

describe("verifyToolsUnique", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    initCoreConfig()
    applyToolOverrides({ uniqueToolsPerAgent: true })
  })

  afterEach(() => {
    initCoreConfig()
  })

  it("should detect tools used by multiple nodes", async () => {
    // Using the provided example with duplicate tool usage
    const errors = await verifyToolsUnique(wrongExample)

    // Expect that errors were found
    expect(errors.length).toBeGreaterThan(0)

    // Verify that the error mentions the duplicate tool
    expect(errors[0]).toContain("searchGoogleMaps")

    // Verify that the error mentions the nodes using this tool
    expect(errors[0]).toContain("google-maps-scraper")
    expect(errors[0]).toContain("store-data-automation")
  })

  it("should allow duplicate tools when uniqueToolsPerAgent is false", async () => {
    applyToolOverrides({ uniqueToolsPerAgent: false })

    const errors = await verifyToolsUnique(wrongExample)
    expect(errors).toEqual([])
  })

  it("should handle workflows with no tools", async () => {
    const noToolsWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with no tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolsUnique(noToolsWorkflow)
    expect(errors).toEqual([])
  })

  it("should handle mixed MCP and code tools", async () => {
    const mixedToolsWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with mixed tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy"],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "node with same tool names",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"], // Duplicate MCP tool
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolsUnique(mixedToolsWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("tavily")
    expect(errors[0]).toContain("node1")
    expect(errors[0]).toContain("node2")
  })

  it("should detect MCP tools used by multiple nodes", async () => {
    const mcpDuplicateWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "first mcp user",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["firecrawl"],
          codeTools: [],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "second mcp user",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["firecrawl"], // Duplicate
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolsUnique(mcpDuplicateWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("firecrawl")
  })
})

describe("verifyModelNameExists", () => {
  it("should detect missing modelName", async () => {
    const errors = await verifyModelNameExists(modelNameMissingExample)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("missing a modelName")
  })

  it("should detect invalid modelName", async () => {
    const errors = await verifyModelNameExists(invalidModelNameExample)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("invalid modelName")
  })
})

describe("verifyNoDuplicateHandoffs", () => {
  it("should detect duplicate handoffs", async () => {
    const errors = await verifyNoDuplicateHandoffs(duplicateHandoffsExample)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("duplicate handoffs")
  })
})

describe("verifyAllToolsAreActive", () => {
  it("should detect inactive tools", async () => {
    const inactiveToolWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with inactive tool",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: ["readFileLegacy"], // This is in INACTIVE_TOOLS
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyAllToolsAreActive(inactiveToolWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("inactive tools")
    expect(errors[0]).toContain("readFileLegacy")
    expect(errors[0]).toContain("node1")
  })

  it("should detect unknown tools", async () => {
    const unknownToolWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with unknown tool",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["unknownMcpTool" as any],
          codeTools: ["unknownCodeTool" as any],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyAllToolsAreActive(unknownToolWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.some(error => error.includes("unknown tools"))).toBe(true)
    expect(errors.some(error => error.includes("unknownMcpTool"))).toBe(true)
    expect(errors.some(error => error.includes("unknownCodeTool"))).toBe(true)
  })

  it("should allow default tools", async () => {
    const defaultToolWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with default tool",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: ["todoRead"], // This is in defaultTools
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyAllToolsAreActive(defaultToolWorkflow)
    expect(errors).toEqual([])
  })

  it("should allow active tools", async () => {
    const activeToolWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with active tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["todoWrite"],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyAllToolsAreActive(activeToolWorkflow)
    expect(errors).toEqual([])
  })
})

describe("verifyToolSetEachNodeIsUnique", () => {
  beforeEach(() => {
    initCoreConfig()
    applyToolOverrides({ uniqueToolSetsPerAgent: true })
  })

  afterEach(() => {
    initCoreConfig()
  })

  it("should detect nodes with identical tool sets", async () => {
    const duplicateToolSetWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "first node",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy"],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "second node with same tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy"],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolSetEachNodeIsUnique(duplicateToolSetWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("same tool set")
    expect(errors[0]).toContain("node1")
    expect(errors[0]).toContain("node2")
  })

  it("should detect duplicate tools within same node", async () => {
    const internalDuplicateWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with duplicate tools internally",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: ["readFileLegacy", "readFileLegacy"], // Duplicate
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolSetEachNodeIsUnique(internalDuplicateWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("duplicate tools in its own tool set")
    expect(errors[0]).toContain("node1")
  })

  it("should allow empty tool sets", async () => {
    const emptyToolSetWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "empty tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "also empty tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolSetEachNodeIsUnique(emptyToolSetWorkflow)
    expect(errors).toEqual([])
  })

  it("should skip validation when uniqueToolSetsPerAgent is false", async () => {
    applyToolOverrides({ uniqueToolSetsPerAgent: false })

    const duplicateToolSetWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "first node",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy"],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "second node with same tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy"],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyToolSetEachNodeIsUnique(duplicateToolSetWorkflow)
    expect(errors).toEqual([])
  })
})

describe("verifyMaxToolsPerAgent", () => {
  it("should detect MCP tools exceeding limit", async () => {
    const tooManyMcpToolsWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with too many mcp tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily", "firecrawl", "browserUse", "proxy", "googleScholar", "serpAPI"], // 6 tools, limit is 3 + 2 defaultTools = 5
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyMaxToolsPerAgent(tooManyMcpToolsWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("exceeding the limit")
    expect(errors[0]).toContain("mcp tools")
    expect(errors[0]).toContain("node1")
  })

  it("should detect code tools exceeding limit", async () => {
    const tooManyCodeToolsWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with too many code tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [
            "readFileLegacy",
            "saveFileLegacy",
            "searchGoogleMaps",
            "verifyLocation",
            "urlToMarkdown",
            "csvReader",
          ], // 6 tools, limit is 3 + 2 defaultTools = 5
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyMaxToolsPerAgent(tooManyCodeToolsWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("exceeding the limit")
    expect(errors[0]).toContain("code tools")
    expect(errors[0]).toContain("node1")
  })

  it("should allow tools within limit", async () => {
    const validToolCountWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with acceptable tool count",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["readFileLegacy", "saveFileLegacy"],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyMaxToolsPerAgent(validToolCountWorkflow)
    expect(errors).toEqual([])
  })
})

describe("verifyModelsAreActive", () => {
  it("should detect inactive models", async () => {
    // Add model to inactive array temporarily
    CONFIG.models.inactive.push("inactive-model")

    const inactiveModelWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with inactive model",
          systemPrompt: "test",
          modelName: "inactive-model" as AllowedModelName,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyModelsAreActive(inactiveModelWorkflow)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toContain("inactive model")
    expect(errors[0]).toContain("inactive-model")
    expect(errors[0]).toContain("node1")

    // Clean up
    const index = CONFIG.models.inactive.indexOf("inactive-model")
    if (index > -1) CONFIG.models.inactive.splice(index, 1)
  })

  it("should allow active models", async () => {
    const activeModelWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with active model",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
        },
      ],
    }

    const errors = await verifyModelsAreActive(activeModelWorkflow)
    expect(errors).toEqual([])
  })
})

// Test for edge cases and comprehensive scenarios
describe("Edge cases and comprehensive validation", () => {
  it("should handle nodes with undefined tool arrays", async () => {
    const undefinedToolsWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "node with undefined tools",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: undefined as any,
          codeTools: undefined as any,
          handOffs: ["end"],
        },
      ],
    }

    // Should not crash and should handle gracefully
    const uniqueErrors = await verifyToolsUnique(undefinedToolsWorkflow)
    const activeErrors = await verifyAllToolsAreActive(undefinedToolsWorkflow)
    const setErrors = await verifyToolSetEachNodeIsUnique(undefinedToolsWorkflow)
    const maxErrors = await verifyMaxToolsPerAgent(undefinedToolsWorkflow)

    // All should handle undefined gracefully
    expect(uniqueErrors).toEqual([])
    expect(activeErrors).toEqual([])
    expect(setErrors).toEqual([])
    expect(maxErrors).toEqual([])
  })

  it("should handle complex mixed validation scenarios", async () => {
    const complexWorkflow: WorkflowConfig = {
      entryNodeId: "node1",
      nodes: [
        {
          nodeId: "node1",
          description: "complex node 1",
          systemPrompt: "test",
          modelName: getDefaultModels().medium,
          mcpTools: ["tavily"],
          codeTools: ["todoWrite", "verifyLocation"],
          handOffs: ["node2"],
        },
        {
          nodeId: "node2",
          description: "complex node 2",
          systemPrompt: "test",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: ["todoRead", "searchGoogleMaps"],
          handOffs: ["end"],
        },
      ],
    }

    // All validations should pass for this well-formed workflow
    const uniqueErrors = await verifyToolsUnique(complexWorkflow)
    const activeErrors = await verifyAllToolsAreActive(complexWorkflow)
    const setErrors = await verifyToolSetEachNodeIsUnique(complexWorkflow)
    const maxErrors = await verifyMaxToolsPerAgent(complexWorkflow)
    const modelErrors = await verifyModelNameExists(complexWorkflow)
    const activeModelErrors = await verifyModelsAreActive(complexWorkflow)

    expect(uniqueErrors).toEqual([])
    expect(activeErrors).toEqual([])
    expect(setErrors).toEqual([])
    expect(maxErrors).toEqual([])
    expect(modelErrors).toEqual([])
    expect(activeModelErrors).toEqual([])
  })
})
