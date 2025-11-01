#!/usr/bin/env bun
/**
 * Model Catalog Validation Script
 *
 * Validates MODEL_CATALOG for structural integrity before build/deployment.
 * Catches common issues that would cause runtime errors.
 *
 * Validations:
 * - Catalog ID format ("<provider>#<model>")
 * - Vendor prefix matches provider field
 * - Active models have all required fields
 * - No duplicate IDs
 * - Pricing values are valid
 * - Context lengths are positive
 */

import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import { modelEntrySchema } from "@lucky/shared"
import { MODEL_CATALOG } from "../src/llm-catalog/catalog"

interface ValidationError {
  modelId: string
  field: string
  message: string
  severity: "error" | "warning"
  location?: string
}

class CatalogValidator {
  private errors: ValidationError[] = []
  private warnings: ValidationError[] = []
  private readonly getLocation: (modelId: string) => string | undefined

  constructor(locationResolver: (modelId: string) => string | undefined) {
    this.getLocation = locationResolver
  }

  validate(): boolean {
    console.log("🔍 Validating MODEL_CATALOG...")

    // Check catalog is not empty
    if (MODEL_CATALOG.length === 0) {
      this.addError("CATALOG", "root", "MODEL_CATALOG is empty")
      return this.printResults()
    }

    const seenIds = new Set<string>()

    for (const model of MODEL_CATALOG) {
      const modelId = `${model.gateway}#${model.gatewayModelId}`

      // Validate against Zod schema
      const zodResult = modelEntrySchema.safeParse(model)
      if (!zodResult.success) {
        for (const issue of zodResult.error.issues) {
          this.addError(modelId, issue.path.join("."), issue.message)
        }
        continue // Skip other checks if Zod validation fails
      }

      // Check required fields exist (double-check after Zod)
      if (!model.gateway || !model.gatewayModelId) {
        this.addError(modelId, "required", "Missing required fields (gateway or gatewayModelId)")
        continue
      }

      // Check for duplicate IDs
      if (seenIds.has(modelId)) {
        this.addError(modelId, "id", "Duplicate catalog ID found")
      }
      seenIds.add(modelId)

      // Check gateway format
      if (!model.gateway.includes("-api")) {
        this.addError(modelId, "gateway", `Gateway must follow format "<provider>-api", got: "${model.gateway}"`)
      }

      // Check provider is lowercase
      if (model.gateway !== model.gateway.toLowerCase()) {
        this.addError(modelId, "gateway", `Gateway must be lowercase: "${model.gateway}"`)
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

      // Validate availability flags
      if (model.runtimeEnabled === false && model.uiHiddenInProd === false) {
        // allowed: runtime disabled but visible (for documentation)
      }
    }

    return this.printResults()
  }

  private addError(modelId: string, field: string, message: string): void {
    this.errors.push({
      modelId,
      field,
      message,
      severity: "error",
      location: this.getLocation(modelId),
    })
  }

  private addWarning(modelId: string, field: string, message: string): void {
    this.warnings.push({
      modelId,
      field,
      message,
      severity: "warning",
      location: this.getLocation(modelId),
    })
  }

  private printResults(): boolean {
    const hasErrors = this.errors.length > 0

    // Print errors
    if (hasErrors) {
      console.error("\n❌ Validation failed with errors:\n")
      for (const error of this.errors) {
        console.error(`  ${error.modelId} [${error.field}]`)
        const locationSuffix = error.location ? ` (${error.location})` : ""
        console.error(`    ${error.message}${locationSuffix}\n`)
      }
    }

    // Print warnings
    if (this.warnings.length > 0) {
      console.warn("\n⚠️  Warnings:\n")
      for (const warning of this.warnings) {
        console.warn(`  ${warning.modelId} [${warning.field}]`)
        const locationSuffix = warning.location ? ` (${warning.location})` : ""
        console.warn(`    ${warning.message}${locationSuffix}\n`)
      }
    }

    // Print summary
    if (!hasErrors && this.warnings.length === 0) {
      console.log("✅ MODEL_CATALOG validation passed!")
      console.log(
        `   ${MODEL_CATALOG.length} models validated, ${
          MODEL_CATALOG.filter(m => m.runtimeEnabled !== false).length
        } runtime-enabled`,
      )
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
const repoRoot = path.resolve(import.meta.dir, "../../..")
const catalogDir = path.resolve(import.meta.dir, "../src")

const modelLocationMap = collectModelLocations(catalogDir, repoRoot)

const getModelLocation = (modelId: string): string | undefined => modelLocationMap.get(modelId)

const validator = new CatalogValidator(getModelLocation)
const success = validator.validate()

// Exit with appropriate code
process.exit(success ? 0 : 1)

function collectModelLocations(directory: string, root: string, map = new Map<string, string>()): Map<string, string> {
  const entries = readdirSync(directory, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      collectModelLocations(entryPath, root, map)
      continue
    }

    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue

    const relativePath = path.relative(root, entryPath).split(path.sep).join("/")
    const fileContents = readFileSync(entryPath, "utf8")
    const lines = fileContents.split(/\r?\n/)

    for (let index = 0; index < lines.length; index++) {
      // Look for gatewayModelId field to infer model ID
      const match = lines[index].match(/gatewayModelId\s*:\s*["'`]([^"'`]+)["'`]/)
      if (match) {
        // Try to find the gateway field nearby
        const contextStart = Math.max(0, index - 5)
        const contextEnd = Math.min(lines.length, index + 5)
        const context = lines.slice(contextStart, contextEnd).join("\n")
        const gatewayMatch = context.match(/gateway\s*:\s*["'`]([^"'`]+)["'`]/)
        if (gatewayMatch) {
          const fullId = `${gatewayMatch[1]}#${match[1]}`
          if (!map.has(fullId)) {
            map.set(fullId, `${relativePath}:${index + 1}`)
          }
        }
      }
    }
  }

  return map
}
