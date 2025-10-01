/**
 * Shared location types used across the codebase
 */

export interface StandardizedLocation {
  name: string
  address: string
  city: string
  country: string
  postcode: string
  coordinates: { latitude: number; longitude: number } | null
  opening_times:
    | {
        monday: string
        tuesday: string
        wednesday: string
        thursday: string
        friday: string
        saturday: string
        sunday: string
      }
    | null
    | undefined
  owner_imgs: string[]
  metadata: {
    [key: string]: any
  }
  domain: string | null
}
