/**
 * Tier Resolution Example
 *
 * Demonstrates how the tier resolver automatically maps model names to tiers
 * based on your configuration, providing better abstraction.
 */

import { createModels } from "@lucky/models"
import { generateText } from "ai"

// Create models registry with tier configuration
const models = createModels({
  providers: {
    openai: {
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY!,
      enabled: true,
    },
    openrouter: {
      id: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY!,
      baseUrl: "https://openrouter.ai/api/v1",
      enabled: true,
    },
  },
  tiers: {
    // Fast tier - use fastest models
    fast: {
      strategy: "race",
      models: [
        { provider: "openrouter", model: "openrouter#google/gemini-2.5-flash-lite" },
        { provider: "openai", model: "gpt-4o-mini" },
      ],
    },
    // Medium tier - balanced quality/speed
    medium: {
      strategy: "first",
      models: [{ provider: "openrouter", model: "openrouter#openai/gpt-4.1-mini" }],
    },
    // High tier - best quality
    high: {
      strategy: "first",
      models: [{ provider: "openrouter", model: "openrouter#openai/gpt-4.1" }],
    },
  },
  defaultTier: "medium",
  trackPerformance: true,
})

async function main() {
  console.log("🎯 Tier Resolution Examples\n")

  // Example 1: Direct tier usage (recommended)
  console.log("1️⃣ Using tier directly:")
  const model1 = await models.model("tier:fast")
  const result1 = await generateText({
    model: model1,
    prompt: "Say hello in 3 words",
  })
  console.log("   Result:", result1.text)
  console.log()

  // Example 2: Using provider/model format
  // If this model is configured as a tier, it auto-resolves
  console.log("2️⃣ Using direct model name:")
  const model2 = await models.model("openrouter#openai/gpt-4.1-mini")
  const result2 = await generateText({
    model: model2,
    prompt: "Say hello in 3 words",
  })
  console.log("   Result:", result2.text)
  console.log()

  // Example 3: Tier-based abstraction for different use cases
  console.log("3️⃣ Semantic tier usage:")

  // Fast: Quick operations
  const fastModel = await models.model("tier:fast")
  const fastResult = await generateText({
    model: fastModel,
    prompt: "Summarize 'quantum computing' in one sentence",
  })
  console.log("   Fast tier:", fastResult.text)

  // Medium: Balanced tasks
  const mediumModel = await models.model("tier:medium")
  const mediumResult = await generateText({
    model: mediumModel,
    prompt: "Explain quantum computing in 2-3 sentences",
  })
  console.log("   Medium tier:", mediumResult.text)

  // High: Complex reasoning
  const highModel = await models.model("tier:high")
  const highResult = await generateText({
    model: highModel,
    prompt: "Explain the philosophical implications of quantum computing",
  })
  console.log("   High tier:", highResult.text)
  console.log()

  console.log("✅ All tier resolutions completed successfully!")
}

// Helper to demonstrate tier resolution logic
function demonstrateTierResolution() {
  console.log("📋 Tier Configuration:")
  console.log("   tier:fast    → race between gemini-flash and gpt-4o-mini")
  console.log("   tier:medium  → openrouter/openrouter#openai/gpt-4.1-mini")
  console.log("   tier:high    → openrouter/openai/gpt-4.1")
  console.log()
  console.log("💡 Key Benefits:")
  console.log("   ✓ Change tier models without touching code")
  console.log("   ✓ Provider-independent abstractions")
  console.log("   ✓ Semantic naming (fast/medium/high)")
  console.log("   ✓ Easy A/B testing via tier swapping")
  console.log()
}

// Run example
demonstrateTierResolution()
main().catch(console.error)
