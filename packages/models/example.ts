/**
 * Example usage of the @lucky/models package
 * Run with: bun run example.ts
 */

import { generateText } from "ai"
import { createLLMRegistry } from "./src"

// ============================================================================
// Example 1: Basic Usage with Shared Keys
// ============================================================================

async function exampleSharedKeys() {
  console.log("=== Example 1: Shared Keys ===\n")

  // Initialize registry with company keys
  const registry = createLLMRegistry({
    fallbackKeys: {
      openai: process.env.OPENAI_API_KEY || "sk-company-key",
      groq: process.env.GROQ_API_KEY || "gsk-company-key",
      openrouter: process.env.OPENROUTER_API_KEY || "sk-or-company-key",
    },
  })

  // Create user instance with shared keys
  const userModels = registry.forUser({
    mode: "shared",
    userId: "user-123",
    models: ["openai#gpt-4o-mini", "openai#gpt-3.5-turbo", "groq#openai/gpt-oss-20b"],
  })

  // Direct selection with provider prefix
  const model1 = userModels.model("openai#gpt-4o-mini")
  console.log("✓ Selected: openai#gpt-4o-mini")

  // Auto-detect provider
  const model2 = userModels.model("gpt-3.5-turbo")
  console.log("✓ Selected: gpt-3.5-turbo (auto-detected OpenAI)")

  // Tier selection
  const cheapModel = userModels.tier("cheap")
  console.log("✓ Selected cheapest model from user's list")

  const fastModel = userModels.tier("fast")
  console.log("✓ Selected fastest model from user's list")

  // Get catalog
  const catalog = userModels.getCatalog()
  console.log(`✓ Catalog has ${catalog.length} total models\n`)
}

// ============================================================================
// Example 2: BYOK (Bring Your Own Key)
// ============================================================================

async function exampleBYOK() {
  console.log("=== Example 2: BYOK Mode ===\n")

  const registry = createLLMRegistry({
    fallbackKeys: {
      openai: "sk-company-key",
      groq: "gsk-company-key",
    },
  })

  // User brings their own keys
  const userModels = registry.forUser({
    mode: "byok",
    userId: "user-456",
    models: ["openai#gpt-4o", "groq#llama-3.1-70b-versatile"],
    apiKeys: {
      openai: "sk-user-provided-key",
      groq: "gsk-user-provided-key",
    },
  })

  const model = userModels.model("openai#gpt-4o")
  console.log("✓ Using user's OpenAI key for gpt-4o")

  const smartModel = userModels.tier("smart")
  console.log("✓ Selected smartest model with user's keys\n")
}

// ============================================================================
// Example 3: Error Handling
// ============================================================================

async function exampleErrors() {
  console.log("=== Example 3: Error Handling ===\n")

  const registry = createLLMRegistry({
    fallbackKeys: {
      openai: "sk-key",
    },
  })

  const userModels = registry.forUser({
    mode: "shared",
    userId: "user-789",
    models: ["openai#gpt-4o-mini"],
  })

  // Try to use model not in user's list
  try {
    userModels.model("openai#gpt-4o")
  } catch (error) {
    console.log(`✓ Correctly threw error: ${error.message}`)
  }

  // Try to use tier with no models
  const emptyUser = registry.forUser({
    mode: "shared",
    userId: "user-999",
    models: [],
  })

  try {
    emptyUser.tier("cheap")
  } catch (error) {
    console.log(`✓ Correctly threw error: ${error.message}`)
  }

  // Try BYOK without keys
  try {
    registry.forUser({
      mode: "byok",
      userId: "user-bad",
      models: ["openai#gpt-4o"],
      // Missing apiKeys!
    })
  } catch (error) {
    console.log(`✓ Correctly threw error: ${error.message}\n`)
  }
}

// ============================================================================
// Example 4: Real API Call (requires valid API key)
// ============================================================================

async function exampleRealCall() {
  console.log("=== Example 4: Real API Call ===\n")

  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  Skipping real API call - no OPENAI_API_KEY set\n")
    return
  }

  const registry = createLLMRegistry({
    fallbackKeys: {
      openai: process.env.OPENAI_API_KEY,
    },
  })

  const userModels = registry.forUser({
    mode: "shared",
    userId: "demo-user",
    models: ["openai#gpt-4o-mini"],
  })

  const model = userModels.model("openai#gpt-4o-mini")

  try {
    const result = await generateText({
      model,
      prompt: "Say hello in 5 words or less",
    })
    console.log(`✓ AI response: "${result.text}"\n`)
  } catch (error) {
    console.log(`⚠️  API call failed: ${error.message}\n`)
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log("\n🚀 @lucky/models Package Examples\n")
  console.log(`=${"".repeat(50)}\n`)

  await exampleSharedKeys()
  await exampleBYOK()
  await exampleErrors()
  await exampleRealCall()

  console.log("=".repeat(50))
  console.log("\n✅ All examples completed!\n")
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error)
}
