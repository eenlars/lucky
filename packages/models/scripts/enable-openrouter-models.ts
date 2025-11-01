/**
 * Script to enable all OpenRouter models except expensive pro versions
 */

import * as fs from "node:fs"
import * as path from "node:path"

const filePath = path.join(__dirname, "../src/llm-catalog/pricing-generation/openrouter-models.ts")

// Models to keep disabled (expensive pro versions)
const KEEP_DISABLED = [
  "openai/gpt-5-pro",
  "openai/o1-pro",
  "openai/o3-pro",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-pro-preview",
  "google/gemini-2.5-pro-preview-05-06",
]

const content = fs.readFileSync(filePath, "utf-8")
const lines = content.split("\n")

let inOpenRouterModel = false
let currentModelId: string | null = null

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]

  // Detect start of a model entry
  if (line.includes('gateway: "openrouter-api"')) {
    inOpenRouterModel = true
    currentModelId = null
  }

  // Capture the gatewayModelId
  if (inOpenRouterModel && line.includes("gatewayModelId:")) {
    const match = line.match(/gatewayModelId:\s*"([^"]+)"/)
    if (match) {
      currentModelId = match[1]
    }
  }

  // Update runtimeEnabled
  if (inOpenRouterModel && line.includes("runtimeEnabled:")) {
    if (currentModelId && !KEEP_DISABLED.includes(currentModelId)) {
      // Enable this model
      lines[i] = line.replace("runtimeEnabled: false", "runtimeEnabled: true")
      console.log(`✓ Enabled: ${currentModelId}`)
    } else if (currentModelId && KEEP_DISABLED.includes(currentModelId)) {
      console.log(`✗ Keeping disabled: ${currentModelId} (expensive pro version)`)
    }
  }

  // Detect end of model entry
  if (inOpenRouterModel && line.includes("},") && !line.includes("gateway:")) {
    inOpenRouterModel = false
    currentModelId = null
  }
}

// Write back
fs.writeFileSync(filePath, lines.join("\n"), "utf-8")
console.log("\n✓ Done! All OpenRouter models enabled except pro versions.")
