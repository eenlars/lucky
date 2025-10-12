import { lgg } from "@core/utils/logging/Logger" // core location data manager operations

import { promises as fs } from "node:fs"
import { join } from "node:path"
import { getCoreConfig } from "@core/core-config/coreConfig"
import type { LocationData, PartialLocationData, WorkflowLocationData } from "@lucky/tools/schemas/location.types"
import { DataQuality } from "@lucky/tools/schemas/location.types"
import { assessDataQuality } from "./assessQuality"

export class LocationDataManagerError extends Error {
  static verbose = getCoreConfig().logging.override.Tools
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message)
    this.name = "LocationDataManagerError"
  }
}

function validate(fileName: string, locationData?: PartialLocationData) {
  if (!fileName?.trim() || fileName.includes("..") || fileName.includes("/")) {
    throw new LocationDataManagerError("invalid fileName")
  }
  if (locationData && !locationData.name?.trim()) {
    throw new LocationDataManagerError("location name required")
  }
}

function normalizeLocation(data: PartialLocationData): LocationData {
  // generate unique id if not provided
  let id = data.id
  if (!id) {
    // create id from name and address, sanitized for use as identifier
    const nameSlug =
      data.name
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "unknown"
    const addressSlug =
      data.address
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "unknown"
    id = `${nameSlug}-${addressSlug}`

    // add random suffix if still too generic
    if (id === "unknown-unknown" || id.length < 5) {
      id = `${id}-${Math.random().toString(36).substring(2, 8)}`
    }
  }

  return {
    ...data,
    id,
    quality: assessDataQuality(data as LocationData),
  } as LocationData
}

export class LocationDataManager {
  private get dataDir() {
    return `${getCoreConfig().paths.node.memory.workfiles}/location-data`
  }

  async insertLocations(
    fileName: string,
    locations: PartialLocationData[],
  ): Promise<{
    success: boolean
    locationCount: number
    processed: number
    failed: number
    warnings?: string[]
    errors?: string[]
  }> {
    lgg.onlyIf(
      LocationDataManagerError.verbose,
      `[locationDataManager] starting insertLocations for file ${fileName} with ${locations.length} locations`,
    )

    validate(fileName)

    if (!Array.isArray(locations) || locations.length === 0) {
      lgg.error(`[locationDataManager] invalid locations array: ${locations}`)
      throw new LocationDataManagerError("locations must be non-empty array")
    }

    const warnings: string[] = []
    const errors: string[] = []
    let processed = 0
    let failed = 0

    try {
      const workflowData = await this.loadOrCreateWorkflow(fileName)
      lgg.onlyIf(
        LocationDataManagerError.verbose,
        `[locationDataManager] loaded workflow data with ${workflowData.locations.length} existing locations`,
      )

      for (const [i, locationData] of locations.entries()) {
        try {
          lgg.onlyIf(
            LocationDataManagerError.verbose,
            `[locationDataManager] processing location ${i + 1}/${locations.length}: ${locationData.id || "no-id"} - ${locationData.name || "no-name"}`,
          )

          validate(fileName, locationData)

          const normalized = normalizeLocation(locationData)

          // find existing location by ID first, then by address similarity as fallback
          let existingIndex = workflowData.locations.findIndex(loc => loc.id === normalized.id)

          // if no exact ID match and this looks like an auto-generated ID, check for address duplicates
          if (existingIndex === -1 && !locationData.id) {
            existingIndex = workflowData.locations.findIndex(
              loc => loc.name === normalized.name && loc.address === normalized.address && loc.city === normalized.city,
            )
          }

          if (existingIndex !== -1) {
            lgg.onlyIf(
              LocationDataManagerError.verbose,
              `[locationDataManager] updating existing location ${normalized.id}`,
            )
            workflowData.locations[existingIndex] = {
              ...workflowData.locations[existingIndex],
              ...normalized,
            }
          } else {
            lgg.onlyIf(LocationDataManagerError.verbose, `[locationDataManager] adding new location ${normalized.id}`)
            workflowData.locations.push(normalized)
          }

          if (normalized.quality !== DataQuality.COMPLETE) {
            // warnings.push(`location ${normalized.id} incomplete`)
          }
          processed++
        } catch (error) {
          const errorMsg = `location ${i + 1}: ${error instanceof Error ? error.message : String(error)}`
          lgg.error(`[locationDataManager] validation/processing error: ${errorMsg}`)
          errors.push(errorMsg)
          failed++
        }
      }

      workflowData.updatedAt = new Date().toISOString()

      lgg.onlyIf(
        LocationDataManagerError.verbose,
        `[locationDataManager] saving workflow data with ${workflowData.locations.length} total locations`,
      )
      await this.saveWorkflowData(workflowData)

      if (failed > 0) {
        lgg.error(`[locationDataManager] locationData insert failed with ${failed} failures:`, errors)
      } else {
        lgg.onlyIf(
          LocationDataManagerError.verbose,
          `[locationDataManager] successfully processed all ${processed} locations`,
        )
      }

      return {
        success: processed > 0,
        locationCount: workflowData.locations.length,
        processed,
        failed,
        warnings: warnings.length ? warnings : undefined,
        errors: errors.length ? errors : undefined,
      }
    } catch (error) {
      lgg.error("[locationDataManager] critical error in insertLocations:", error)
      throw error
    }
  }

  async insertLocation(fileName: string, locationData: PartialLocationData) {
    const result = await this.insertLocations(fileName, [locationData])
    return {
      success: result.success,
      locationCount: result.locationCount,
      warnings: result.warnings,
    }
  }

  async getLocations(fileName: string): Promise<{ success: boolean; locations: LocationData[] }> {
    if (!fileName?.trim()) return { success: false, locations: [] }

    try {
      const workflowData = await this.loadWorkflowData(fileName)
      return {
        success: true,
        locations: workflowData.locations,
      }
    } catch (error) {
      if (error instanceof LocationDataManagerError && error.message.includes("not found")) {
        return { success: false, locations: [] }
      }
      throw error
    }
  }

  async removeLocations(
    fileName: string,
    locationIds: string[] = [],
  ): Promise<{ success: boolean; locations: LocationData[] }> {
    lgg.log(
      `[locationDataManager] starting removeLocations for file ${fileName} with ${locationIds.length} locationIds`,
    )

    try {
      const workflowData = await this.loadWorkflowData(fileName)
      if (locationIds.length) {
        workflowData.locations = workflowData.locations.filter(loc => !locationIds.includes(loc.id || ""))
      } else {
        workflowData.locations = []
      }
      await this.saveWorkflowData(workflowData)
      return { success: true, locations: workflowData.locations }
    } catch (error) {
      lgg.error("[locationDataManager] failed to remove locations:", error)
      return { success: false, locations: [] }
    }
  }

  async updateLocations(
    fileName: string,
    updates: Array<{
      locationId: string
      updateData: PartialLocationData
      updateStrategy?: "merge" | "replace" | "selective"
    }>,
  ): Promise<{
    success: boolean
    locationCount: number
    updated: number
    failed: number
    warnings?: string[]
    errors?: string[]
  }> {
    lgg.log(`[locationDataManager] starting updateLocations for file ${fileName} with ${updates.length} updates`)

    validate(fileName)

    if (!Array.isArray(updates) || updates.length === 0) {
      lgg.error(`[locationDataManager] invalid updates array: ${updates}`)
      throw new LocationDataManagerError("updates must be non-empty array")
    }

    const warnings: string[] = []
    const errors: string[] = []
    let updated = 0
    let failed = 0

    try {
      const workflowData = await this.loadOrCreateWorkflow(fileName)
      lgg.onlyIf(
        LocationDataManagerError.verbose,
        `[locationDataManager] loaded workflow data with ${workflowData.locations.length} existing locations`,
      )

      for (const [i, update] of updates.entries()) {
        try {
          lgg.onlyIf(
            LocationDataManagerError.verbose,
            `[locationDataManager] processing update ${i + 1}/${updates.length}: ${update.locationId}`,
          )

          if (!update.locationId?.trim()) {
            throw new LocationDataManagerError("locationId is required for update")
          }

          if (!update.updateData || typeof update.updateData !== "object") {
            throw new LocationDataManagerError("updateData is required for update")
          }

          const existingIndex = workflowData.locations.findIndex(loc => loc.id === update.locationId)

          if (existingIndex === -1) {
            const errorMsg = `location not found: ${update.locationId}`
            lgg.error(`[locationDataManager] ${errorMsg}`)
            errors.push(errorMsg)
            failed++
            continue
          }

          const existingLocation = workflowData.locations[existingIndex]
          const updateStrategy = update.updateStrategy || "merge"

          let updatedLocation: LocationData

          switch (updateStrategy) {
            case "merge":
              updatedLocation = {
                ...existingLocation,
                ...update.updateData,
              }
              break
            case "replace":
              updatedLocation = {
                ...normalizeLocation(update.updateData),
                id: update.locationId,
              }
              break
            case "selective":
              updatedLocation = { ...existingLocation }
              Object.entries(update.updateData).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  ;(updatedLocation as any)[key] = value
                }
              })
              break
            default: {
              const _exhaustiveCheck: never = updateStrategy
              void _exhaustiveCheck
              throw new LocationDataManagerError(`unknown update strategy: ${updateStrategy}`)
            }
          }

          if (updatedLocation.name !== undefined && !updatedLocation.name?.trim()) {
            throw new LocationDataManagerError("location name cannot be empty")
          }

          updatedLocation.quality = assessDataQuality(updatedLocation)
          workflowData.locations[existingIndex] = updatedLocation

          lgg.onlyIf(
            LocationDataManagerError.verbose,
            `[locationDataManager] successfully updated location ${update.locationId}`,
          )
          updated++

          if (updatedLocation.quality !== DataQuality.COMPLETE) {
            warnings.push(`location ${update.locationId} incomplete after update`)
          }
        } catch (error) {
          const errorMsg = `update ${i + 1} (${update.locationId}): ${error instanceof Error ? error.message : String(error)}`
          lgg.error(`[locationDataManager] update error: ${errorMsg}`)
          errors.push(errorMsg)
          failed++
        }
      }

      workflowData.updatedAt = new Date().toISOString()

      lgg.onlyIf(
        LocationDataManagerError.verbose,
        `[locationDataManager] saving workflow data with ${workflowData.locations.length} total locations`,
      )
      await this.saveWorkflowData(workflowData)

      if (failed > 0) {
        lgg.error(`[locationDataManager] location updates failed with ${failed} failures:`, errors)
      } else {
        lgg.onlyIf(
          LocationDataManagerError.verbose,
          `[locationDataManager] successfully updated all ${updated} locations`,
        )
      }

      return {
        success: updated > 0,
        locationCount: workflowData.locations.length,
        updated,
        failed,
        warnings: warnings.length ? warnings : undefined,
        errors: errors.length ? errors : undefined,
      }
    } catch (error) {
      lgg.error("[locationDataManager] critical error in updateLocations:", error)
      throw error
    }
  }

  async updateLocationById(
    fileName: string,
    locationId: string,
    updateData: PartialLocationData,
    updateStrategy: "merge" | "replace" | "selective" = "merge",
  ): Promise<{
    success: boolean
    locationCount: number
    warnings?: string[]
    errors?: string[]
  }> {
    const result = await this.updateLocations(fileName, [{ locationId, updateData, updateStrategy }])
    return {
      success: result.success,
      locationCount: result.locationCount,
      warnings: result.warnings,
      errors: result.errors,
    }
  }

  async getMinimalSummary(fileName: string): Promise<{ success: boolean; summary: string }> {
    try {
      const { locations } = await this.getLocations(fileName)

      if (!locations.length) return { success: false, summary: "no locations found" }

      const addresses = locations.map(loc => `${loc.address}, ${loc.city}`).join("; ")

      return {
        success: true,
        summary: `${locations.length} locations: ${addresses}`,
      }
    } catch (error) {
      if (error instanceof LocationDataManagerError && error.message.includes("not found")) {
        return { success: false, summary: "no workflow data found" }
      }
      throw error
    }
  }

  private async loadOrCreateWorkflow(fileName: string): Promise<WorkflowLocationData> {
    try {
      return await this.loadWorkflowData(fileName)
    } catch (error) {
      if (error instanceof LocationDataManagerError && error.message.includes("not found")) {
        return {
          fileName,
          locations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
      throw error
    }
  }

  private async loadWorkflowData(fileName: string): Promise<WorkflowLocationData> {
    const filePath = join(this.dataDir, `${fileName}`)

    try {
      const content = await fs.readFile(filePath, "utf-8")
      const data = JSON.parse(content)

      if (!this.isValidWorkflowData(data)) {
        throw new LocationDataManagerError(`invalid workflow data: ${filePath}`)
      }

      return data
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new LocationDataManagerError(`corrupted json: ${filePath}`, error)
      }
      if ((error as any)?.code === "ENOENT") {
        throw new LocationDataManagerError(`workflow file not found: ${filePath}`, error as Error)
      }
      throw new LocationDataManagerError(`failed to load: ${filePath}`, error as Error)
    }
  }

  private async saveWorkflowData(workflowData: WorkflowLocationData): Promise<void> {
    const filePath = join(this.dataDir, `${workflowData.fileName}`)

    lgg.onlyIf(
      LocationDataManagerError.verbose,
      `[locationDataManager] attempting to save workflow data to ${filePath}`,
    )

    try {
      // ensure directory exists
      await fs.mkdir(this.dataDir, { recursive: true })

      // save directly as JSON
      const jsonData = JSON.stringify(workflowData, null, 2)
      await fs.writeFile(filePath, jsonData, "utf-8")

      lgg.onlyIf(
        LocationDataManagerError.verbose,
        `[locationDataManager] successfully saved workflow data with ${workflowData.locations.length} locations`,
      )
    } catch (error) {
      lgg.error(`[locationDataManager] failed to save workflow data to ${filePath}:`, error)
      throw new LocationDataManagerError(
        `failed to save workflow data to ${filePath}`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  private isValidWorkflowData(data: any): data is WorkflowLocationData {
    return data && typeof data === "object" && typeof data.fileName === "string" && Array.isArray(data.locations)
  }
}

export const locationDataManager = new LocationDataManager()
