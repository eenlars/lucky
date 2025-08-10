import { getDefaultModels } from "@runtime/settings/models"
import type {
  ModelNameV2,
  AllowedModelName,
} from "@core/utils/spending/models.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { describe, expect, it } from "vitest"
import { verifyModelNameExists, verifyNoDuplicateHandoffs } from "../index"
import { verifyToolsUnique } from "../toolsVerification"

const validModel = getDefaultModels().medium
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
      handOffs: [
        "google-maps-scraper",
        "enhanced-store-extractor",
        "store-data-automation",
      ],
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
        search_accuracy:
          "Need to improve the thoroughness of store extraction to include all locations.",
        verification:
          "Implement better cross-referencing to ensure list completeness.",
        efficiency:
          "Reduce search time by optimizing query parameters and response handling.",
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
        search_accuracy:
          "Focus on improving the thoroughness of store extraction to include all locations.",
        verification:
          "Cross-reference results with multiple sources to ensure list completeness.",
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
        user_preference:
          "User prefers faster and more automated solutions for data extraction tasks.",
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
  it.skip("should detect tools used by multiple nodes", async () => {
    // TODO: need to make we can alter constants from the test, otherwise we can't test this nicely.
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
