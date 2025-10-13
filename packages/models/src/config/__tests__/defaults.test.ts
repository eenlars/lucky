/**
 * Tests for DEFAULT_MODEL_TIERS
 */

import { describe, expect, it } from "vitest"
import { MODEL_CATALOG } from "../../pricing/catalog"
import { findModelByName } from "../../pricing/model-lookup"
import {
  DEFAULT_MODEL_TIERS,
  PROVIDER_MODEL_TIERS,
  getAllTierNames,
  getDefaultModelTiersForProvider,
  getTierModelName,
  hasTier,
} from "../defaults"

describe("DEFAULT_MODEL_TIERS", () => {
  it("validates all tiers at module load", () => {
    // If we reach here, validation passed during module import
    expect(DEFAULT_MODEL_TIERS).toBeDefined()
    expect(typeof DEFAULT_MODEL_TIERS).toBe("object")
  })

  it("has all expected tier names", () => {
    const expectedTiers = ["nano", "low", "medium", "high", "default", "fitness", "reasoning", "summary", "fallback"]

    for (const tier of expectedTiers) {
      expect(DEFAULT_MODEL_TIERS[tier]).toBeDefined()
      expect(DEFAULT_MODEL_TIERS[tier].strategy).toBe("first")
      expect(DEFAULT_MODEL_TIERS[tier].models).toHaveLength(1)
    }
  })

  it("all tier models exist in MODEL_CATALOG", () => {
    for (const [tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      const modelSpec = tierConfig.models[0]
      const catalogEntry = findModelByName(modelSpec.model)

      expect(catalogEntry, `Model ${modelSpec.model} for tier ${tierName} not found in catalog`).toBeDefined()
      expect(catalogEntry?.provider).toBe(modelSpec.provider)
    }
  })

  it("all tier models are active", () => {
    for (const [tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      const modelSpec = tierConfig.models[0]
      const catalogEntry = findModelByName(modelSpec.model)

      expect(catalogEntry?.active, `Model ${modelSpec.model} for tier ${tierName} is not active`).toBe(true)
    }
  })

  describe("getTierModelName", () => {
    it("returns correct model name for valid tier", () => {
      expect(getTierModelName("nano")).toBe("gpt-5-nano")
      expect(getTierModelName("low")).toBe("gpt-4o-mini")
      expect(getTierModelName("medium")).toBe("gpt-4o")
      expect(getTierModelName("nano", "openrouter")).toBe("openai/gpt-4.1-nano")
      expect(getTierModelName("medium", "openrouter")).toBe("anthropic/claude-sonnet-4")
      expect(getTierModelName("medium", "groq")).toBe("openai/gpt-oss-120b")
    })

    it("returns undefined for invalid tier", () => {
      expect(getTierModelName("nonexistent")).toBeUndefined()
    })
  })

  describe("hasTier", () => {
    it("returns true for existing tiers", () => {
      expect(hasTier("nano")).toBe(true)
      expect(hasTier("low")).toBe(true)
      expect(hasTier("medium")).toBe(true)
      expect(hasTier("nano", "openrouter")).toBe(true)
      expect(hasTier("medium", "groq")).toBe(true)
    })

    it("returns false for non-existing tiers", () => {
      expect(hasTier("nonexistent")).toBe(false)
      expect(hasTier("")).toBe(false)
    })
  })

  describe("getAllTierNames", () => {
    it("returns all tier names", () => {
      const tierNames = getAllTierNames()
      expect(tierNames).toContain("nano")
      expect(tierNames).toContain("low")
      expect(tierNames).toContain("medium")
      expect(tierNames).toContain("high")
      expect(tierNames).toContain("default")
      expect(tierNames).toContain("fitness")
      expect(tierNames).toContain("reasoning")
      expect(tierNames).toContain("summary")
      expect(tierNames).toContain("fallback")
    })

    it("returns all tier names for OpenRouter", () => {
      const tierNames = getAllTierNames("openrouter")
      expect(tierNames).toEqual(getAllTierNames())
    })
  })

  it("each tier has correct structure", () => {
    for (const [_tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      // Check strategy
      expect(tierConfig.strategy).toBe("first")

      // Check models array
      expect(Array.isArray(tierConfig.models)).toBe(true)
      expect(tierConfig.models.length).toBeGreaterThan(0)

      // Check first model
      const model = tierConfig.models[0]
      expect(model.provider).toBeDefined()
      expect(model.model).toBeDefined()
      expect(typeof model.provider).toBe("string")
      expect(typeof model.model).toBe("string")
    }
  })

  it("prevents duplicate model assignments across critical tiers", () => {
    // Ensure critical tiers have distinct models when possible
    const defaultModel = getTierModelName("default")
    const nanoModel = getTierModelName("nano")
    const lowModel = getTierModelName("low")
    const mediumModel = getTierModelName("medium")

    // These should be defined
    expect(defaultModel).toBeDefined()
    expect(nanoModel).toBeDefined()
    expect(lowModel).toBeDefined()
    expect(mediumModel).toBeDefined()

    // Medium should be different from low (different performance tiers)
    expect(mediumModel).not.toBe(lowModel)
  })
})

describe("Provider-specific tiers", () => {
  it("exposes provider tier maps", () => {
    expect(Object.keys(PROVIDER_MODEL_TIERS)).toEqual(["openai", "openrouter", "groq"])
  })

  it("uses OpenRouter models when provider is openrouter", () => {
    const tiers = getDefaultModelTiersForProvider("openrouter")
    expect(tiers.nano.models[0].provider).toBe("openrouter")
    expect(tiers.nano.models[0].model).toBe("openai/gpt-4.1-nano")
    expect(tiers.medium.models[0].model).toBe("anthropic/claude-sonnet-4")
    expect(tiers.reasoning.models[0].provider).toBe("openrouter")
  })

  it("uses Groq models when provider is groq", () => {
    const tiers = getDefaultModelTiersForProvider("groq")
    expect(tiers.nano.models[0].provider).toBe("groq")
    expect(tiers.nano.models[0].model).toBe("openai/gpt-oss-20b")
    expect(tiers.medium.models[0].model).toBe("openai/gpt-oss-120b")
    expect(tiers.high.models[0].provider).toBe("groq")
  })
})

describe("Model validation errors", () => {
  it("would throw for unknown model", () => {
    // We can't actually test the throw because it happens at module load,
    // but we can verify the logic by checking that all models exist
    const allModelsExist = Object.values(DEFAULT_MODEL_TIERS).every(tier => {
      return tier.models.every(spec => {
        const entry = findModelByName(spec.model)
        return entry !== undefined
      })
    })

    expect(allModelsExist).toBe(true)
  })

  it("would throw for inactive model", () => {
    // Verify all models are active
    const allModelsActive = Object.values(DEFAULT_MODEL_TIERS).every(tier => {
      return tier.models.every(spec => {
        const entry = findModelByName(spec.model)
        return entry?.active === true
      })
    })

    expect(allModelsActive).toBe(true)
  })
})

describe("Tier consistency validation", () => {
  it("has all required tiers", () => {
    const REQUIRED_TIERS = ["nano", "low", "medium", "high", "default", "fitness", "reasoning", "summary", "fallback"]
    const actualTiers = getAllTierNames()

    for (const requiredTier of REQUIRED_TIERS) {
      expect(actualTiers).toContain(requiredTier)
    }
  })

  it("all tiers have first strategy", () => {
    for (const [_tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      expect(tierConfig.strategy).toBe("first")
    }
  })

  it("all tiers have exactly one model", () => {
    for (const [_tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      expect(tierConfig.models).toHaveLength(1)
    }
  })

  it("no tier has undefined or null values", () => {
    for (const [_tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      expect(tierConfig.strategy).toBeDefined()
      expect(tierConfig.models).toBeDefined()
      expect(tierConfig.models[0]).toBeDefined()
      expect(tierConfig.models[0].provider).toBeTruthy()
      expect(tierConfig.models[0].model).toBeTruthy()
    }
  })
})

describe("Integration with MODEL_CATALOG", () => {
  it("all tier models have pricing data", () => {
    for (const [tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      const modelSpec = tierConfig.models[0]
      const catalogEntry = findModelByName(modelSpec.model)

      expect(catalogEntry, `Model ${modelSpec.model} for tier ${tierName} not found`).toBeDefined()
      expect(catalogEntry?.input).toBeGreaterThanOrEqual(0)
      expect(catalogEntry?.output).toBeGreaterThanOrEqual(0)
    }
  })

  it("all tier models support tools", () => {
    for (const [tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      const modelSpec = tierConfig.models[0]
      const catalogEntry = findModelByName(modelSpec.model)

      // All tiers should support tools for workflow execution
      expect(catalogEntry?.supportsTools, `Model ${modelSpec.model} for tier ${tierName} doesn't support tools`).toBe(
        true,
      )
    }
  })

  it("tier models have appropriate pricing tiers", () => {
    const tierToPricingMap: Record<string, string[]> = {
      nano: ["low"],
      low: ["low"],
      medium: ["low", "medium"],
      high: ["medium", "high"],
      default: ["low"],
      fitness: ["low"],
      reasoning: ["medium", "high"],
      summary: ["low"],
      fallback: ["low"],
    }

    for (const [tierName, tierConfig] of Object.entries(DEFAULT_MODEL_TIERS)) {
      const modelSpec = tierConfig.models[0]
      const catalogEntry = findModelByName(modelSpec.model)
      const expectedPricingTiers = tierToPricingMap[tierName]

      if (expectedPricingTiers && catalogEntry) {
        expect(
          expectedPricingTiers,
          `Model ${modelSpec.model} for tier ${tierName} has unexpected pricing tier ${catalogEntry.pricingTier}`,
        ).toContain(catalogEntry.pricingTier)
      }
    }
  })
})
