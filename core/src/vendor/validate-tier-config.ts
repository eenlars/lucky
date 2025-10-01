/**
 * Tier Configuration Validation Script
 *
 * Validates that all tiers from DEFAULT_MODELS are properly configured
 * in the models registry and tier resolver.
 */

import { buildTierConfig, getDefaultTierName } from "./tier-config-builder"
import { tierResolver } from "./tier-resolver"
import { DEFAULT_MODELS, MODEL_CONFIG } from "@examples/settings/models"

/**
 * Validate tier configuration
 */
export function validateTierConfig(): {
  success: boolean
  errors: string[]
  warnings: string[]
  info: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const info: string[] = []

  const provider = MODEL_CONFIG.provider
  const providerDefaults = DEFAULT_MODELS[provider]

  // Build tier config
  const tierConfig = buildTierConfig()
  const defaultTier = getDefaultTierName()

  info.push(`Current provider: ${provider}`)
  info.push(`Default tier: ${defaultTier}`)
  info.push(`Total tiers configured: ${Object.keys(tierConfig).length}`)
  info.push("")

  // Check each tier from DEFAULT_MODELS
  for (const [tierName, modelString] of Object.entries(providerDefaults)) {
    info.push(`Checking tier: ${tierName}`)

    // 1. Check tier exists in models registry config
    if (!tierConfig[tierName]) {
      errors.push(`  ❌ Tier '${tierName}' not found in models registry config`)
      continue
    }

    info.push(`  ✓ Tier exists in models registry config`)

    // 2. Check tier has models
    const tier = tierConfig[tierName]
    if (!tier.models || tier.models.length === 0) {
      errors.push(`  ❌ Tier '${tierName}' has no models`)
      continue
    }

    info.push(`  ✓ Tier has ${tier.models.length} model(s)`)
    info.push(`  ✓ Strategy: ${tier.strategy}`)

    // 3. Check model spec
    const modelSpec = tier.models[0]
    info.push(
      `  ✓ Model: ${modelSpec.provider}/${modelSpec.model}`,
    )

    // 4. Check tier resolver
    const resolvedTier = tierResolver.getTierForModel(modelString as string)
    if (resolvedTier !== tierName) {
      warnings.push(
        `  ⚠️  Tier resolver maps '${modelString}' to '${resolvedTier}' instead of '${tierName}'`,
      )
    } else {
      info.push(`  ✓ Tier resolver correctly maps model to tier`)
    }

    // 5. Check reverse lookup
    const modelForTier = tierResolver.getModelForTier(tierName as any)
    if (modelForTier !== modelString) {
      warnings.push(
        `  ⚠️  Tier resolver maps tier '${tierName}' to '${modelForTier}' instead of '${modelString}'`,
      )
    } else {
      info.push(`  ✓ Reverse lookup correct`)
    }

    info.push("")
  }

  // Check for orphaned tiers in models registry
  for (const tierName of Object.keys(tierConfig)) {
    if (!(tierName in providerDefaults)) {
      warnings.push(
        `⚠️  Tier '${tierName}' in models registry but not in DEFAULT_MODELS`,
      )
    }
  }

  const success = errors.length === 0
  return { success, errors, warnings, info }
}

/**
 * Print validation results
 */
export function printValidationResults() {
  console.log("🎯 Validating Tier Configuration\n")

  const result = validateTierConfig()

  // Print info
  if (result.info.length > 0) {
    console.log("📋 Configuration Info:")
    result.info.forEach((msg) => console.log(msg))
  }

  // Print warnings
  if (result.warnings.length > 0) {
    console.log("\n⚠️  Warnings:")
    result.warnings.forEach((msg) => console.log(msg))
  }

  // Print errors
  if (result.errors.length > 0) {
    console.log("\n❌ Errors:")
    result.errors.forEach((msg) => console.log(msg))
  }

  // Final result
  console.log("\n" + "=".repeat(60))
  if (result.success) {
    console.log("✅ Validation PASSED")
    console.log("All tiers are properly configured and synced!")
  } else {
    console.log("❌ Validation FAILED")
    console.log(`Found ${result.errors.length} error(s)`)
  }
  console.log("=".repeat(60))

  return result.success
}

// Run validation if executed directly
if (import.meta.main) {
  const success = printValidationResults()
  process.exit(success ? 0 : 1)
}