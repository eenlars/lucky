"use server"
import {
  cleanupTestEvolutionRunsCompletely,
  previewTestEvolutionRunCleanup,
} from "./cleanup.js"

async function runCleanup() {
  try {
    console.log("🔍 Previewing what will be cleaned up...")
    const preview = await previewTestEvolutionRunCleanup()
    console.log("Preview result:", JSON.stringify(preview, null, 2))

    if (preview.testRuns.length > 0) {
      console.log(
        `\n🧹 Running COMPLETE cleanup on ${preview.testRuns.length} EvolutionRuns and ${preview.invocationsCount} WorkflowInvocations...`
      )
      console.log(
        "⚠️ This will delete the EvolutionRuns themselves, not just WorkflowInvocations"
      )

      const result = await cleanupTestEvolutionRunsCompletely()
      console.log("Cleanup result:", JSON.stringify(result, null, 2))

      if (result.success) {
        console.log("\n🎉 Cleanup successful!")
        console.log(`   - Deleted ${result.deletedRuns} EvolutionRuns`)
        console.log(
          `   - Deleted ${result.deletedInvocations} WorkflowInvocations`
        )
      } else {
        console.log("\n❌ Cleanup failed!")
      }
    } else {
      console.log("ℹ️ No test-related evolution runs found to clean up")
    }
  } catch (error) {
    console.error("❌ Error during cleanup:", error)
    process.exit(1)
  }
}

runCleanup()
