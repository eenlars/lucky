import {
  DataQuality,
  type LocationData,
} from "@/runtime/schemas/location.types"

// utility function to assess location data quality
export function assessDataQuality(data: LocationData): DataQuality {
  const requiredFields = ["name"]

  // check if required fields are present
  const hasRequiredFields = requiredFields.every(
    (field) => !!data[field as keyof LocationData]
  )
  if (!hasRequiredFields) return DataQuality.MINIMAL

  // check if we have coordinates
  const hasCoordinates = !!(
    data.coordinates &&
    typeof data.coordinates === "object" &&
    typeof data.coordinates.latitude === "number" &&
    typeof data.coordinates.longitude === "number"
  )
  if (hasCoordinates) return DataQuality.COMPLETE

  // check other detail fields
  const detailFields = ["address", "city", "country", "postcode"]
  const detailFieldCount = detailFields.filter(
    (field) => !!data[field as keyof LocationData]
  ).length

  if (detailFieldCount >= 3) return DataQuality.COMPLETE
  if (detailFieldCount >= 2) return DataQuality.PARTIAL
  return DataQuality.MINIMAL
}
