import "dotenv/config"
import { ClaudeSDKService } from "./ClaudeSDKService"

async function testListModels() {
  try {
    console.log("Testing listModels()...")
    const models = await ClaudeSDKService.listModels()
    console.log("\nAvailable models:")
    models.forEach(model => {
      console.log(`- ${model.id} (${model.display_name}) - ${model.created_at}`)
    })
    console.log(`\nTotal: ${models.length} models`)
  } catch (error) {
    console.error("Error:", error)
  }
}

testListModels()
