#!/usr/bin/env bun
/**
 * Model Catalog Validation Script
 *
 * Validates MODEL_CATALOG for structural integrity before build/deployment.
 * Catches common issues that would cause runtime errors.
 *
 * Validations:
 * - Catalog ID format (vendor:X;model:Y)
 * - Vendor prefix matches provider field
 * - Active models have all required fields
 * - No duplicate IDs
 * - Pricing values are valid
 * - Context lengths are positive
 */

import { modelEntrySchema } from "@lucky/shared"
import { MODEL_CATALOG } from "../src/pricing/catalog"

interface ValidationError {
  modelId: string
  field: string
  message: string
  severity: "error" | "warning"
}

class CatalogValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []

  validate(): boolean {
    console.log("🔍 Validating MODEL_CATALOG...")

    // Check catalog is not empty
    if (MODEL_CATALOG.length === 0) {
      this.addError("CATALOG", "root", "MODEL_CATALOG is empty")
      return this.printResults()
    }

    const seenIds = new Set<string>()

    for (const model of MODEL_CATALOG) {
      const modelId = model.id || "unknown"

      // Validate against Zod schema
      const zodResult = modelEntrySchema.safeParse(model)
      if (!zodResult.success) {
        for (const issue of zodResult.error.issues) {
          this.addError(modelId, issue.path.join("."), issue.message)
        }
        continue // Skip other checks if Zod validation fails
      }

      // Check required fields exist (double-check after Zod)
      if (!model.provider || !model.model || !model.id) {
        this.addError(modelId, "required", "Missing required fields (id, provider, or model)")
        continue
      }

      // Check for duplicate IDs
      if (seenIds.has(model.id)) {
        this.addError(modelId, "id", "Duplicate catalog ID found")
      }
      seenIds.add(model.id)

      // Check catalog ID format: vendor:X;model:Y
      if (!model.id.startsWith("vendor:") || !model.id.includes(";model:")) {
        this.addError(modelId, "id", 'ID must follow format "vendor:X;model:Y"')
      }

      // Extract vendor from ID and check it matches provider
      const vendorMatch = model.id.match(/^vendor:([^;]+);/)
      if (vendorMatch) {
        const vendor = vendorMatch[1]
        if (vendor !== model.provider) {
          this.addError(
            modelId,
            "vendor/provider",
            `Vendor prefix "${vendor}" does not match provider "${model.provider}"`,
          )
        }
      }

      // Check provider is lowercase
      if (model.provider !== model.provider.toLowerCase()) {
        this.addError(modelId, "provider", `Provider must be lowercase: "${model.provider}"`)
      }

      // Check pricing values
      if (model.input < 0) {
        this.addError(modelId, "input", `Negative input price: ${model.input}`)
      }
      if (model.output < 0) {
        this.addError(modelId, "output", `Negative output price: ${model.output}`)
      }
      if (model.cachedInput !== null && model.cachedInput < 0) {
        this.addError(modelId, "cachedInput", `Negative cached input price: ${model.cachedInput}`)
      }

      // Check context length
      if (model.contextLength <= 0) {
        this.addError(modelId, "contextLength", `Invalid context length: ${model.contextLength}`)
      }

      // Check intelligence bounds
      if (model.intelligence < 1 || model.intelligence > 10) {
        this.addError(modelId, "intelligence", `Intelligence must be between 1-10, got: ${model.intelligence}`)
      }

      // Warn if active model is also disabled
      if (model.active && model.disabled) {
        this.addWarning(modelId, "active/disabled", "Model is marked both active and disabled")
      }

      // Warn if disabled without active being false
      if (model.disabled && model.active !== false) {
        this.addWarning(
          modelId,
          "disabled",
          "Model is disabled but active is not explicitly false (consider setting active: false)",
        )
      }
    }

    return this.printResults()
  }

  private addError(modelId: string, field: string, message: string): void {
    this.errors.push({ modelId, field, message, severity: "error" })
  }

  private addWarning(modelId: string, field: string, message: string): void {
    this.warnings.push({ modelId, field, message, severity: "warning" })
  }

  private printResults(): boolean {
    const hasErrors = this.errors.length > 0

    // Print errors
    if (hasErrors) {
      console.error("\n❌ Validation failed with errors:\n")
      for (const error of this.errors) {
        console.error(`  ${error.modelId} [${error.field}]`)
        console.error(`    ${error.message}\n`)
      }
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.warn("\n⚠️  Warnings:\n")
      for (const warning of this.warnings) {
        console.warn(`  ${warning.modelId} [${warning.field}]`)
        console.warn(`    ${warning.message}\n`)
      }
    }

    // Print summary
    if (!hasErrors && this.warnings.length === 0) {
      console.log("✅ MODEL_CATALOG validation passed!")
      console.log(`   ${MODEL_CATALOG.length} models validated, ${MODEL_CATALOG.filter(m => m.active).length} active`)
    } else {
      console.log("\nSummary:")
      console.log(`  Total models: ${MODEL_CATALOG.length}`)
      console.log(`  Errors: ${this.errors.length}`)
      console.log(`  Warnings: ${this.warnings.length}`)
    }

    return !hasErrors
  }
}

// Run validation
const validator = new CatalogValidator()
const success = validator.validate()

// Exit with appropriate code
process.exit(success ? 0 : 1)
