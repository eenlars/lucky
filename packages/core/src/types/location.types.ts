/**
 * Location data interface for address and geographical information
 */
export interface LocationData {
  id?: string
  name: string
  address: string
  city: string
  country: string
  postcode: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  opening_times?: Record<string, string>
  owner_imgs?: string[]
  metadata?: Record<string, any>
  domain?: string
  quality?: string
}

export type PartialLocationData = Partial<LocationData>