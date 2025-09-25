/**
 * Quick test script to verify RunService functionality
 * This demonstrates the write-time protocol implementation
 */

import { lgg } from "@core/utils/logging/Logger"
import { createEvolutionSettingsWithConfig } from "@runtime/settings/evolution"
import { RunService } from "../../RunService"

async function testRunService() {
  lgg.log("Testing RunService...")

  const config = createEvolutionSettingsWithConfig({
    populationSize: 5,
    generations: 3,
    maxCostUSD: 10,
  })

  const runService = new RunService(true) // verbose mode

  try {
    // Test 1: Create evolution run
    lgg.log("1. Creating evolution run...")
    await runService.createRun("Test goal: optimize workflow for data extraction", config)
    lgg.log(`✓ Created run: ${runService.getRunId()}`)

    // Test 2: Create generation
    lgg.log("2. Creating generation 0...")
    await runService.createNewGeneration()
    lgg.log(`✓ Created generation: ${runService.getGenerationId()}`)

    // Test 3: Check current IDs
    lgg.log("3. Current state:")
    lgg.log(`   Run ID: ${runService.getRunId()}`)
    lgg.log(`   Generation ID: ${runService.getGenerationId()}`)

    // Test 4: Complete run with success status
    lgg.log("4. Completing run...")
    await runService.completeRun("completed", 5.5)
    lgg.log("✓ Run completed successfully")

    lgg.log("\n✅ All RunService tests passed!")
  } catch (error) {
    lgg.error("❌ RunService test failed:", error)
  }
}

// Export for potential use
export { testRunService }

// Run if called directly
if (require.main === module) {
  testRunService().catch(lgg.error)
}
