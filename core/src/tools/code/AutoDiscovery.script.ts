import { lgg } from "@core/utils/logging/Logger"

import { codeToolAutoDiscovery } from "@core/tools/code/AutoDiscovery"
import { codeToolRegistry } from "@core/tools/code/CodeToolRegistry"

/**
 * Script for testing the auto-discovery framework
 * This tests the core framework functionality
 */
async function testAutoDiscovery() {
  lgg.log("🧪 Testing Code Tool Auto-Discovery Framework")
  lgg.log("=".repeat(50))

  try {
    // Reset state for clean testing
    codeToolAutoDiscovery.reset()

    // Test discovery without registration
    lgg.log("1️⃣ Testing framework tool discovery...")
    const discoveredTools = await codeToolAutoDiscovery.discoverTools()
    lgg.log(`Found ${discoveredTools.length} tools:`)
    discoveredTools.forEach((tool) => {
      lgg.log(`- ${tool.name}: ${tool.description}`)
    })

    // Test full setup
    lgg.log("2️⃣ Testing framework auto-setup...")
    const setupTools = await codeToolAutoDiscovery.setupCodeTools()
    lgg.log(`Setup complete with ${setupTools.length} tools`)

    // Test registry state
    lgg.log("3️⃣ Testing registry state...")
    const stats = codeToolRegistry.getStats()
    lgg.log(`Registry stats:`, stats)

    const allTools = codeToolRegistry.getAllTools()
    lgg.log(`All registered tools:`)
    allTools.forEach((tool) => {
      lgg.log(`- ${tool.name}: ${tool.description}`)
    })

    // Test AI tool registry
    lgg.log("4️⃣ Testing AI tool registry...")
    const aiToolRegistry = codeToolRegistry.getToolRegistry()
    lgg.log(`AI tools available:`, Object.keys(aiToolRegistry))

    // Test framework statistics
    lgg.log("5️⃣ Testing framework statistics...")
    const discoveryStats = codeToolAutoDiscovery.getStats()
    lgg.log(`Discovery stats:`, discoveryStats)

    lgg.log("✅ Auto-discovery framework test completed successfully!")
  } catch (error) {
    lgg.error("❌ Auto-discovery framework test failed:", error)
    process.exit(1)
  }
}

// run the test if executed directly
testAutoDiscovery().catch(lgg.error)

export { testAutoDiscovery }
