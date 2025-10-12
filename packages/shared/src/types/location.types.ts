/**
 * Shared location types and schemas used across the codebase
 */

import { z } from "zod"

// Quality level for location data
export enum DataQuality {
  COMPLETE = "complete",
  PARTIAL = "partial",
  MINIMAL = "minimal",
}

// Base interface for standardized location data
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
    [key: string]: unknown
  }
  domain: string | null
}

// Extended type for internal storage with id and quality
export interface LocationData extends StandardizedLocation {
  id?: string
  quality?: DataQuality
}

export type PartialLocationData = Partial<LocationData>

export interface WorkflowLocationData {
  /** file name */
  fileName: string
  /** array of location data for this workflow */
  locations: LocationData[]
  /** when this workflow data was created */
  createdAt: string
  /** when this workflow data was last updated */
  updatedAt: string
}

// Zod Schemas

// Opening times schema
const openingTimesSchema = z
  .object({
    monday: z.string(),
    tuesday: z.string(),
    wednesday: z.string(),
    thursday: z.string(),
    friday: z.string(),
    saturday: z.string(),
    sunday: z.string(),
  })
  .nullish()

// Shared schema to keep types consistent - matching StandardizedLocation with internal fields
export const locationDataSchema = z.object({
  // internal fields
  id: z.string().nullish(),
  quality: z.nativeEnum(DataQuality).nullish(),
  // StandardizedLocation fields
  name: z.string().min(1, "location name is required"),
  address: z.string(),
  city: z.string(),
  country: z.string(),
  postcode: z.string(),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .nullish(),
  opening_times: openingTimesSchema,
  owner_imgs: z.array(z.string()).default([]),
  metadata: z
    .object({
      original_data: z.unknown().nullish(),
      category: z.string().nullish(),
      status: z.string().nullish(),
      googleUrl: z.string().nullish(),
      bizWebsite: z.string().nullish(),
      stars: z.union([z.string(), z.null()]).nullish(),
      numberOfReviews: z.number().nullish(),
      scrapedAt: z.string().nullish(),
    })
    .passthrough()
    .default({}),
  domain: z.string().nullish(),
})

// Example location data
export const exampleLocationData: LocationData = {
  id: "ace-tate-van-woustraat",
  name: "Opticien Amsterdam Zuid - Van Woustraat",
  address: "Van Woustraat 67 H",
  city: "Amsterdam",
  country: "Nederland",
  postcode: "1074 AD",
  coordinates: { latitude: 52.35544317032021, longitude: 4.90102573311789 },
  opening_times: {
    sunday: "12:00-18:00",
    monday: "10:00-18:00",
    tuesday: "10:00-18:00",
    wednesday: "10:00-18:00",
    thursday: "10:00-18:00",
    friday: "10:00-18:00",
    saturday: "10:00-18:00",
  },
  owner_imgs: [
    "https://images.aceandtate.com/image/upload/v1539848857/store%20images/NL/Van%20Wou/Ace___Tate___Amsterdam_Van_Wou_store_Wide_interior_view_Credits_Wouter_van_der_Sar.jpg",
    "https://images.aceandtate.com/image/upload/v1539848856/store%20images/NL/Van%20Wou/Ace___Tate___Amsterdam_Van_Wou_store_Facade_side_Credits_Wouter_van_der_Sar.jpg",
  ],
  metadata: {
    bizWebsite: "https://aceandtate.com",
    category: "Optician",
    status: "Open",
    googleUrl: "https://maps.google.com/...",
    stars: "4.5",
    numberOfReviews: 150,
    scrapedAt: new Date().toISOString(),
    description_source:
      "Voor ons is dit een hele speciale locatie, aangezien de Van Woustraat de eerste winkel van Ace & Tate is...",
  },
  domain: "aceandtate.com",
  quality: DataQuality.COMPLETE,
}
