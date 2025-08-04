import { setRuntimeConfig } from "@together/core/src/config"
import { CONFIG, PATHS, MODELS } from "./settings/constants"
import { MODEL_CONFIG } from "./settings/models"

// Initialize core package with runtime configuration
console.log("Setting runtime config...")
setRuntimeConfig(
  MODELS,
  MODEL_CONFIG,
  { CONFIG, PATHS, MODELS }
)
console.log("Runtime config set, importing main...")

// Import main AFTER setting config to avoid early evaluation
const { default: main } = await import("@together/core/src/main")

main()
