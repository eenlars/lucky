/**
 * Basic usage example for @lucky/models
 */

import { createModels } from "../src"
import { generateText, streamText } from "ai"

// Create models registry with multiple providers
const models = createModels({
  providers: {
    openai: {
      id: "openai",
      apiKey: process.env.OPENAI_API_KEY || "sk-test",
      enabled: true,
    },
    anthropic: {
      id: "anthropic",
      apiKey: process.env.ANTHROPIC_API_KEY || "sk-test",
      enabled: true,
    },
    local: {
      id: "local",
      baseUrl: "http://localhost:11434/v1",
      enabled: true,
    },
  },
  tiers: {
    fast: {
      strategy: "race",
      models: [
        { provider: "openai", model: "gpt-4o-mini" },
        { provider: "local", model: "llama-3" },
      ],
    },
    quality: {
      strategy: "first",
      models: [{ provider: "anthropic", model: "claude-3.5-sonnet" }],
    },
  },
  defaultTier: "fast",
  trackPerformance: true,
  trackCost: true,
})

async function example1DirectModel() {
  console.log("\n=== Example 1: Direct Model Selection ===")

  // Use a specific provider and model
  const model = await models.model("openai/gpt-4o-mini")

  const result = await generateText({
    model,
    prompt: "What is the capital of France?",
  })

  console.log("Result:", result.text)
}

async function example2TierBased() {
  console.log("\n=== Example 2: Tier-Based Selection ===")

  // Use the 'fast' tier (races multiple models)
  const model = await models.model("tier:fast")

  const result = await generateText({
    model,
    prompt: "Write a haiku about AI",
  })

  console.log("Result:", result.text)
}

async function example3LocalFirst() {
  console.log("\n=== Example 3: Local Model ===")

  // Use local Ollama model
  const model = await models.model("local/llama-3")

  const result = await generateText({
    model,
    prompt: "Explain TypeScript in one sentence",
  })

  console.log("Result:", result.text)
}

async function example4Streaming() {
  console.log("\n=== Example 4: Streaming ===")

  const model = await models.model("openai/gpt-4o-mini")

  const result = streamText({
    model,
    prompt: "Count from 1 to 5",
  })

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk)
  }

  console.log("\n")
}

async function example5UserConfig() {
  console.log("\n=== Example 5: User Configuration ===")

  // Load user-specific config
  await models.loadUserConfig("researcher-1", "./configs/example.yaml")

  // Use the user's config
  const model = await models.model("user:researcher-1:fast", {
    userId: "researcher-1",
    requestId: "req-123",
  })

  const result = await generateText({
    model,
    prompt: "What is machine learning?",
  })

  console.log("Result:", result.text)
}

async function example6RuntimeConfig() {
  console.log("\n=== Example 6: Runtime Configuration ===")

  // Get current config
  console.log("OpenAI config:", models.getProviderConfig("openai"))

  // Update at runtime
  models.updateProvider("openai", {
    enabled: false, // Temporarily disable
  })

  console.log("Updated OpenAI config:", models.getProviderConfig("openai"))
}

// Run examples
async function main() {
  try {
    await example1DirectModel()
    await example2TierBased()
    // await example3LocalFirst()  // Requires Ollama running
    // await example4Streaming()
    // await example5UserConfig()
    await example6RuntimeConfig()
  } catch (error) {
    console.error("Error:", error)
  }
}

// Only run if executed directly
if (import.meta.main) {
  main()
}