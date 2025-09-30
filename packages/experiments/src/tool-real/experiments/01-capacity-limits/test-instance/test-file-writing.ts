/**
 * Test instance to verify file writing functionality
 * from the main capacity limits experiment
 */

import { lgg } from "@core/utils/logging/Logger"
import type { OpenRouterModelName } from "@core/utils/spending/models.types"
import { existsSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { experimentalModels } from "../../../../../../../examples/settings/models"

const __dirname = process.cwd()

interface TestResult {
  model: OpenRouterModelName
  toolCount: number
  success: boolean
  latencyMs: number
  timestamp: string
}

function testFileWriting() {
  lgg.info("Testing file writing functionality...")

  const testTimestamp = new Date().toISOString()

  // create mock test data
  const mockResults: TestResult[] = [
    {
      model: experimentalModels.gpt4oMini.id,
      toolCount: 4,
      success: true,
      latencyMs: 1500,
      timestamp: testTimestamp,
    },
    {
      model: experimentalModels.gpt4o.id,
      toolCount: 8,
      success: false,
      latencyMs: 2200,
      timestamp: testTimestamp,
    },
  ]

  const outputData = {
    timestamp: testTimestamp,
    testType: "file-writing-verification",
    configuration: {
      models: [experimentalModels.gpt4oMini.id, experimentalModels.gpt4o.id],
      toolCounts: [4, 8],
      testMode: true,
    },
    results: mockResults,
  }

  try {
    // Test writing JSON results
    const resultsPath = join(__dirname, "test-results.json")
    writeFileSync(resultsPath, JSON.stringify(outputData, null, 2))
    lgg.info(`✓ Successfully wrote results to: ${resultsPath}`)

    // Verify file was created and can be read
    if (existsSync(resultsPath)) {
      const readData = JSON.parse(readFileSync(resultsPath, "utf-8"))
      lgg.info(
        `✓ File exists and contains ${readData.results.length} test results`
      )

      // Test writing analysis
      const analysis = {
        totalRuns: mockResults.length,
        successRate:
          (mockResults.filter((r) => r.success).length / mockResults.length) *
          100,
        averageLatency:
          mockResults.reduce((sum, r) => sum + r.latencyMs, 0) /
          mockResults.length,
      }

      const analysisPath = join(__dirname, "test-analysis.json")
      writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))
      lgg.info(`✓ Successfully wrote analysis to: ${analysisPath}`)

      if (existsSync(analysisPath)) {
        const readAnalysis = JSON.parse(readFileSync(analysisPath, "utf-8"))
        lgg.info(
          `✓ Analysis file exists with success rate: ${readAnalysis.successRate}%`
        )

        lgg.info(
          "\n🎉 File writing test PASSED - both results and analysis files created successfully"
        )
        return true
      }
    }

    lgg.error("❌ File writing test FAILED - files not found after writing")
    return false
  } catch (error) {
    lgg.error(`❌ File writing test FAILED with error: ${error}`)
    return false
  }
}

// Run test if called directly
if (require.main === module) {
  testFileWriting()
}

export { testFileWriting }
