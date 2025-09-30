/**
 * Tests for tier configuration builder
 */

import { describe, it, expect } from "vitest"
import { buildTierConfig, getDefaultTierName } from "../tier-config-builder"

describe("Tier Configuration Builder", () => {
  it("should build tier config from DEFAULT_MODELS", () => {
    const tierConfig = buildTierConfig()

    // Should have tier configurations
    expect(tierConfig).toBeDefined()
    expect(Object.keys(tierConfig).length).toBeGreaterThan(0)

    // Each tier should have required properties
    for (const [tierName, config] of Object.entries(tierConfig)) {
      expect(config).toHaveProperty("strategy")
      expect(config).toHaveProperty("models")
      expect(config.models).toBeInstanceOf(Array)
      expect(config.models.length).toBeGreaterThan(0)

      // Each model spec should have provider and model
      for (const modelSpec of config.models) {
        expect(modelSpec).toHaveProperty("provider")
        expect(modelSpec).toHaveProperty("model")
        expect(typeof modelSpec.provider).toBe("string")
        expect(typeof modelSpec.model).toBe("string")
      }
    }
  })

  it("should include all standard tiers", () => {
    const tierConfig = buildTierConfig()
    const tierNames = Object.keys(tierConfig)

    // Standard tiers from DEFAULT_MODELS
    const expectedTiers = [
      "summary",
      "nano",
      "low",
      "medium",
      "high",
      "default",
      "fitness",
      "reasoning",
      "fallback",
    ]

    for (const tier of expectedTiers) {
      expect(tierNames).toContain(tier)
    }
  })

  it("should get default tier name", () => {
    const defaultTier = getDefaultTierName()

    expect(defaultTier).toBeDefined()
    expect(typeof defaultTier).toBe("string")
    // Should be either 'default' or 'medium'
    expect(["default", "medium"]).toContain(defaultTier)
  })

  it("should use correct strategies for tiers", () => {
    const tierConfig = buildTierConfig()

    // Fast tiers should use 'race' strategy
    if (tierConfig.nano) {
      expect(tierConfig.nano.strategy).toBe("race")
    }
    if (tierConfig.summary) {
      expect(tierConfig.summary.strategy).toBe("race")
    }

    // Other tiers should use 'first' strategy
    if (tierConfig.medium) {
      expect(tierConfig.medium.strategy).toBe("first")
    }
    if (tierConfig.high) {
      expect(tierConfig.high.strategy).toBe("first")
    }
  })
})