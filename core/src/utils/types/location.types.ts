/**
 * Minimal location types for standalone core.
 * Full implementation is in @examples/schemas/location.types
 */

export enum DataQuality {
  COMPLETE = "complete",
  PARTIAL = "partial",
  MINIMAL = "minimal",
}

export interface StandardizedLocation {
  name: string
  address: string
  city: string
  country: string
  postcode: string
  coordinates?: {
    latitude: number
    longitude: number
  } | null
  opening_times?: Record<string, string> | null
  owner_imgs?: string[]
  metadata?: Record<string, any>
  domain?: string | null
}

export interface LocationData extends StandardizedLocation {
  id?: string
  quality?: DataQuality
}

export type PartialLocationData = Partial<LocationData>

export interface WorkflowLocationData {
  fileName: string
  locations: LocationData[]
  createdAt: string
  updatedAt: string
}
