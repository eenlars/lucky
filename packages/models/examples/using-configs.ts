/**
 * Using TypeScript Configurations Example
 *
 * Demonstrates how to load and use TypeScript configuration files
 * with the models registry.
 *
 * TypeScript configs provide:
 * - Type safety at authoring time
 * - IDE autocomplete and validation
 * - Runtime Zod validation
 * - Immediate feedback on errors
 *
 * YAML configs are still supported for backwards compatibility.
 */

import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { createModels } from "@lucky/@lucky/models"
import { generateText } from "ai"

// Get current directory for config paths
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const configDir = join(__dirname, "..", "configs")

// Create models registry
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
    groq: {
      id: "groq",
      apiKey: process.env.GROQ_API_KEY!,
      baseUrl: "https://api.groq.com/openai/v1",
      enabled: Boolean(process.env.GROQ_API_KEY),
    },
    local: {
      id: "local",
      baseUrl: "http://localhost:11434/v1",
      enabled: false, // Enable when Ollama is running
    },
  },
  trackPerformance: true,
})

async function main() {
  console.log("🎯 Using TypeScript Configurations\n")

  // ========================================================================
  // Example 1: Load Researcher Config
  // ========================================================================
  console.log("1️⃣ Loading researcher config...")
  const researcherConfigPath = join(configDir, "researcher-example.config.ts")

  try {
    await models.loadUserConfig("researcher-1", researcherConfigPath)
    console.log("   ✅ Config loaded successfully\n")
  } catch (error) {
    console.error("   ❌ Failed to load config:", error)
    return
  }

  // Use 'quick' experiment (fast, cheap models)
  console.log("   Using 'quick' experiment (fast, cheap):")
  const quickModel = await models.model("user:researcher-1:quick", {
    userId: "researcher-1",
    requestId: crypto.randomUUID(),
  })

  const quickResult = await generateText({
    model: quickModel,
    prompt: "What is 2+2?",
  })
  console.log("   Result:", quickResult.text)
  console.log()

  // Use 'standard' experiment (balanced)
  console.log("   Using 'standard' experiment (balanced):")
  const standardModel = await models.model("user:researcher-1:standard", {
    userId: "researcher-1",
    requestId: crypto.randomUUID(),
  })

  const standardResult = await generateText({
    model: standardModel,
    prompt: "Explain quantum entanglement in one sentence.",
  })
  console.log("   Result:", standardResult.text)
  console.log()

  // ========================================================================
  // Example 2: Load Production Config
  // ========================================================================
  console.log("2️⃣ Loading production config...")
  const prodConfigPath = join(configDir, "production-example.config.ts")

  try {
    await models.loadUserConfig("prod-user", prodConfigPath)
    console.log("   ✅ Config loaded successfully\n")
  } catch (error) {
    console.error("   ❌ Failed to load config:", error)
    return
  }

  // Use 'production' experiment (fallback chain)
  console.log("   Using 'production' experiment (with fallbacks):")
  const prodModel = await models.model("user:prod-user:production", {
    userId: "prod-user",
    requestId: crypto.randomUUID(),
  })

  const prodResult = await generateText({
    model: prodModel,
    prompt: "Hello, how are you?",
  })
  console.log("   Result:", prodResult.text)
  console.log()

  // ========================================================================
  // Example 3: Use Default Experiment
  // ========================================================================
  console.log("3️⃣ Using default experiment from config...")

  // When not specifying experiment, uses defaults.experiment from config
  const defaultModel = await models.model("user:researcher-1", {
    userId: "researcher-1",
    requestId: crypto.randomUUID(),
  })

  const defaultResult = await generateText({
    model: defaultModel,
    prompt: "What's the capital of France?",
  })
  console.log("   Result:", defaultResult.text)
  console.log()

  // ========================================================================
  // Example 4: Load Complete Example Config
  // ========================================================================
  console.log("4️⃣ Loading complete example config (all features)...")
  const completeConfigPath = join(configDir, "complete-example.config.ts")

  try {
    await models.loadUserConfig("demo-user", completeConfigPath)
    console.log("   ✅ Config loaded successfully\n")
  } catch (error) {
    console.error("   ❌ Failed to load config:", error)
    return
  }

  // Try different strategies
  console.log("   Testing different strategies:\n")

  // Fast (race strategy)
  console.log("   - Fast (race strategy):")
  const fastModel = await models.model("user:demo-user:fast", {
    userId: "demo-user",
    requestId: crypto.randomUUID(),
  })
  const fastResult = await generateText({
    model: fastModel,
    prompt: "Count to 5",
  })
  console.log("     Result:", fastResult.text)

  // Local first (fallback strategy)
  console.log("   - Local-first (fallback strategy):")
  const localModel = await models.model("user:demo-user:local_first", {
    userId: "demo-user",
    requestId: crypto.randomUUID(),
  })
  const localResult = await generateText({
    model: localModel,
    prompt: "Say hello",
  })
  console.log("     Result:", localResult.text)

  // Balanced (first strategy)
  console.log("   - Balanced (first strategy):")
  const balancedModel = await models.model("user:demo-user:balanced", {
    userId: "demo-user",
    requestId: crypto.randomUUID(),
  })
  const balancedResult = await generateText({
    model: balancedModel,
    prompt: "What is AI?",
  })
  console.log("     Result:", balancedResult.text)

  console.log("\n✅ All examples completed successfully!")
  console.log("\n💡 Key Takeaways:")
  console.log("   • Load user configs with models.loadUserConfig()")
  console.log("   • Use format: 'user:userId:experimentName'")
  console.log("   • Omit experiment to use default from config")
  console.log("   • Each user can have their own config")
  console.log("   • Configs support all 4 strategies (first, race, fallback, consensus)")
}

// Error handling wrapper
main().catch(error => {
  console.error("\n❌ Error:", error.message)
  process.exit(1)
})
