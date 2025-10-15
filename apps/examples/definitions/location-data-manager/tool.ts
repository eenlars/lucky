import { isNir } from "@lucky/shared"
import { locationDataSchema } from "@lucky/shared"
import { defineTool } from "@lucky/tools"
import { z } from "zod"
import { getLocationData, insertLocationData, removeLocationData, updateLocationData } from "./api"

// Helper function to clean location data by removing null values
const cleanLocationData = (data: any): any => {
  if (!data || typeof data !== "object") return data

  const cleaned: any = {}

  // Copy over non-null values
  for (const [key, value] of Object.entries(data)) {
    if (value !== null) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        cleaned[key] = cleanLocationData(value)
      } else {
        cleaned[key] = value
      }
    }
  }

  return cleaned
}

/**
 * location data manager tool with operations:
 * 1. insertLocations - add or update location data in a store
 * 2. getLocations - retrieve all locations from a store, returns success and array of locations
 * 3. removeLocations - remove specific locations by ID or clear all
 * 4. updateLocations - update specific locations by ID with flexible strategies
 *
 * now with more flexible data handling and partial data support
 */
const locationDataManager = defineTool({
  name: "locationDataManager",
  description:
    "PRIMARY tool for location data CRUD operations: insertLocations (add/save data), getLocations (retrieve raw data), removeLocations (delete), updateLocations (modify). Use when you need to store, modify, or retrieve the complete location dataset. LIMITS: JSON file-based storage, workflow-scoped only.",
  params: z.object({
    operation: z.enum(["insertLocations", "getLocations", "removeLocations", "updateLocations"]),
    locationData: locationDataSchema.array().nullish().default([]),
    locationIdsToRemove: z.array(z.string()).nullish().default([]),
    updateData: z
      .array(
        z.object({
          locationId: z.string(),
          updateData: locationDataSchema.partial(),
          updateStrategy: z.enum(["merge", "replace", "selective"]).nullish().default("merge"),
        }),
      )
      .nullish()
      .default([]),
  }),
  async execute(params, externalContext) {
    const workflowInvocationId = externalContext.workflowInvocationId

    if (params.operation === "insertLocations") {
      if (!params.locationData) {
        throw new Error("locationData is required for insertLocation operation")
      }

      // pass the data through our schema for validation/normalization
      const cleanedData = (params.locationData || []).map(cleanLocationData)
      const response = await insertLocationData(workflowInvocationId, cleanedData)
      return response.output || { success: false }
    }
    if (params.operation === "getLocations") {
      const response = await getLocationData(workflowInvocationId)
      return response.output || { success: false, locations: [] }
    }
    if (params.operation === "removeLocations") {
      if (isNir(params.locationIdsToRemove)) {
        return { success: false, locations: [] }
      }

      const response = await removeLocationData(workflowInvocationId, params.locationIdsToRemove)
      return response.output || { success: false, locations: [] }
    }
    if (params.operation === "updateLocations") {
      if (isNir(params.updateData) || params.updateData.length === 0) {
        throw new Error("updateData is required for updateLocations operation")
      }

      const cleanedData = (params.updateData || []).map(item => ({
        ...item,
        updateData: cleanLocationData(item.updateData),
        updateStrategy: item.updateStrategy || undefined,
      }))
      const response = await updateLocationData(workflowInvocationId, cleanedData)
      return response.output || { success: false }
    }
    throw new Error(`unknown operation: ${params.operation}`)
  },
})

export const tool = locationDataManager
