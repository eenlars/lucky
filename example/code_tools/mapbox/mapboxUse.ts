import { R, type RS } from "@/core/utils/types"
import { lgg } from "@/logger"
import { MapboxFeature } from "./resources/exampleFeature"

interface LocationData {
  lat: number
  long: number
  city: string
  country: string
  street: string
  postcode: string
  region: string
  houseNumber: string
}

interface MapboxGeocodeOptions {
  query: string
  country?: string
  limit?: number
  types?: string
  place?: string
}

const DEFAULTS = {
  country: "NL",
  limit: 1,
  types: "address",
}

/**
 * core mapbox geocoding function that can be used locally
 * splits the functionality from the tool wrapper
 */
export async function geocodeLocation(
  options: MapboxGeocodeOptions
): Promise<RS<LocationData>> {
  const {
    query,
    country = DEFAULTS.country,
    limit = DEFAULTS.limit,
    types = DEFAULTS.types,
    place,
  } = options

  if (!query) {
    return R.error("search_string is null: " + query, 0)
  }

  if (!process.env.MAPBOX_TOKEN) {
    lgg.warn("MAPBOX_TOKEN not found in environment variables")
  }

  const searchStringEncoded = encodeURIComponent(query)

  const baseUrl = "https://api.mapbox.com/geocoding/v5/mapbox.places"
  const params = new URLSearchParams({
    country,
    types,
    access_token: process.env.MAPBOX_TOKEN || "",
    limit: limit.toString(),
    autocomplete: "false",
  })

  if (place) {
    params.append("place", place)
  }

  const url = `${baseUrl}/${searchStringEncoded}.json?${params.toString()}`

  const res = await fetch(url)

  if (!res.ok) {
    return R.error("cant get features for " + query, 0)
  }

  const resData = await res.json()
  const { features } = resData

  if (!features[0]) {
    return R.error("cant get features for " + query, 0)
  }

  const feature = features as MapboxFeature[]

  const data = feature.map((f) => parseMapboxFeature(f))

  return R.success(data[0], 0)
}

/**
 * parses a mapbox feature into our standardized location data format
 */
export function parseMapboxFeature(feature: MapboxFeature): LocationData {
  const long = feature.center[0]
  const lat = feature.center[1]

  const indeces = {
    neighborhood: 0,
    postcode: 1,
    locality: 2,
    city: 3,
    region: 4,
    country: 5,
  }

  const context = feature.context

  // WATCH OUT MAPBOX DOES THE LONGITUDE FIRST >> VERY STUPID!
  const locationData: LocationData = {
    lat,
    long,
    city: context[indeces.city]?.text,
    street: feature.text,
    country: context[indeces.country]?.text,
    postcode: context[indeces.postcode]?.text,
    region: context[indeces.region]?.text,
    houseNumber: feature.address,
  }

  return locationData
}

export type { LocationData, MapboxGeocodeOptions }
