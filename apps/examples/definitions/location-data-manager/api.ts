// api wrapper functions for tool integration

import type { PartialLocationData } from "@lucky/shared"
import type { CodeToolName, CodeToolResult } from "@lucky/tools"
import { locationDataManager } from "./mainLocationDataManager"

export function wrapResult<T>(fn: () => Promise<T>, toolName: CodeToolName): Promise<CodeToolResult<T>> {
  return fn()
    .then(output => ({
      success: true as const,
      tool: toolName,
      output,
      error: null,
    }))
    .catch(error => ({
      success: false as const,
      tool: toolName,
      output: null,
      error: error instanceof Error ? error.message : String(error),
    }))
}

export const insertLocationData = (fileName: string, locations: PartialLocationData[]) =>
  wrapResult(() => locationDataManager.insertLocations(fileName, locations), "locationDataManager")

export const getLocationData = (fileName: string) =>
  wrapResult(() => locationDataManager.getLocations(fileName), "locationDataManager")

export const getLocationDataMinimal = (fileName: string) =>
  wrapResult(() => locationDataManager.getMinimalSummary(fileName), "locationDataManager")

export const removeLocationData = (fileName: string, locationIds: string[] = []) =>
  wrapResult(() => locationDataManager.removeLocations(fileName, locationIds), "locationDataManager")

export const updateLocationData = (
  fileName: string,
  updates: Array<{
    locationId: string
    updateData: PartialLocationData
    updateStrategy?: "merge" | "replace" | "selective"
  }>,
) => wrapResult(() => locationDataManager.updateLocations(fileName, updates), "locationDataManager")

export const updateLocationDataById = (
  fileName: string,
  locationId: string,
  updateData: PartialLocationData,
  updateStrategy: "merge" | "replace" | "selective" = "merge",
) =>
  wrapResult(
    () => locationDataManager.updateLocationById(fileName, locationId, updateData, updateStrategy),
    "locationDataManager",
  )
