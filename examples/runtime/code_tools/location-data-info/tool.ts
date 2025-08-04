// location data verification and info tool

import { defineTool } from "@tools/toolFactory"
import { z } from "zod"
import {
  getLocationData,
  getLocationDataMinimal,
} from "../location-data-manager/api"

/**
 * location data info tool for verification operations:
 * - count: get number of stores with optional quality breakdown
 * - getLocations: list all addresses with optional details
 * - verify: check data quality and completeness
 * - summary: get overview with minimal summary
 */
const locationDataInfo = defineTool({
  name: "locationDataInfo",
  description:
    "Analyze stored location data: count locations, list addresses, check data quality/completeness, generate summaries with statistics. LIMITS: read-only operations, requires existing location data, basic statistics only (no complex analytics)",
  params: z.object({
    action: z.enum(["count", "getLocations", "verify", "summary"], {
      invalid_type_error: "verification action to perform",
    }),
    includeDetails: z
      .boolean()
      .nullish()
      .default(false)
      .describe("include additional details like quality assessment"),
  }),
  async execute(params, externalContext) {
    const { action, includeDetails } = params

    switch (action) {
      case "count": {
        const result = await getLocationData(
          externalContext.workflowInvocationId
        )
        if (!result.success || !result.output) {
          return { success: false, count: 0 }
        }

        const count = result.output.locations.length
        const response: any = { count }

        if (includeDetails) {
          const qualityCounts = result.output.locations.reduce(
            (acc, loc) => {
              acc[loc.quality || "unknown"] =
                (acc[loc.quality || "unknown"] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
          response.qualityBreakdown = qualityCounts
        }

        return response
      }

      case "getLocations": {
        const result = await getLocationData(
          externalContext.workflowInvocationId
        )
        if (!result.success || !result.output) {
          return { success: false, addresses: [], count: 0 }
        }

        const addresses = result.output.locations.map((loc) => {
          const baseInfo = {
            id: loc.id,
            name: loc.name,
            address: loc.address || "no address",
            city: loc.city,
          }

          if (includeDetails) {
            return {
              ...baseInfo,
              city: loc.city,
              country: loc.country,
              postcode: loc.postcode,
              quality: loc.quality,
            }
          }

          return baseInfo
        })

        return { addresses, count: addresses.length }
      }

      case "verify": {
        const result = await getLocationData(
          externalContext.workflowInvocationId
        )
        if (!result.success || !result.output) {
          return { success: false, verification: null }
        }

        const locations = result.output.locations
        const totalCount = locations.length

        // quality analysis
        const qualityStats = locations.reduce(
          (acc, loc) => {
            const quality = loc.quality || "unknown"
            acc[quality] = (acc[quality] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        // missing data analysis
        const missingData = {
          address: locations.filter((loc) => !loc.address).length,
          city: locations.filter((loc) => !loc.city).length,
          coordinates: locations.filter(
            (loc) =>
              !loc.coordinates ||
              typeof loc.coordinates !== "object" ||
              typeof loc.coordinates.latitude !== "number" ||
              typeof loc.coordinates.longitude !== "number"
          ).length,
        }

        return {
          totalLocations: totalCount,
          qualityStats,
          missingDataCounts: missingData,
          completenessPercentage: Math.round(
            ((qualityStats.complete || 0) / totalCount) * 100
          ),
        }
      }

      case "summary": {
        const [dataResult, summaryResult] = await Promise.all([
          getLocationData(externalContext.workflowInvocationId),
          getLocationDataMinimal(externalContext.workflowInvocationId),
        ])

        if (!dataResult.success || !dataResult.output) {
          return { success: false, summary: "no data available" }
        }

        const locations = dataResult.output.locations
        const qualityStats = locations.reduce(
          (acc, loc) => {
            const quality = loc.quality || "unknown"
            acc[quality] = (acc[quality] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        return {
          totalLocations: locations.length,
          qualityStats,
          summary:
            summaryResult.success && summaryResult.output
              ? summaryResult.output.summary
              : "summary unavailable",
        }
      }

      default:
        throw new Error(`unknown action: ${action}`)
    }
  },
})

export const tool = locationDataInfo
