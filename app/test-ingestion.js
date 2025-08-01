// Quick test of the IngestionLayer with GAIA
import { IngestionLayer } from "./src/core/workflow/ingestion/IngestionLayer.ts"

async function testGAIA() {
  try {
    const evaluation = {
      type: "gaia",
      goal: "Solve this GAIA task",
      level: 1,
    }

    const result = await IngestionLayer.convert(evaluation)
    console.log("Success! Got", result.length, "workflow cases")
    console.log("First case:", JSON.stringify(result[0], null, 2))
  } catch (error) {
    console.error("Error:", error.message)
  }
}

testGAIA()
