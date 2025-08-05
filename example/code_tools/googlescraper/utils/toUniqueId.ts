import type { GoogleMapsBusiness } from "../main/types/GoogleMapsBusiness"

function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(
      /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl)\b/g,
      ""
    )
    .replace(/[^\w\s]/g, "")
    .trim()
}

function normalizeStoreName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co|&|and)\b/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "")
}

function extractGoogleUrlId(url: string): string {
  // extract place id from google maps url patterns
  const placeIdMatch = url.match(/place_id:([^&\s]+)/)
  if (placeIdMatch) return placeIdMatch[1]

  // extract from data= parameter
  const dataMatch = url.match(/data=([^&\s]+)/)
  if (dataMatch) return dataMatch[1]

  // fallback to the url path segment
  const pathMatch = url.match(/maps\/place\/[^/]+\/([^/?]+)/)
  if (pathMatch) return pathMatch[1]

  return url
}

function areBusinessesDuplicates(
  business1: GoogleMapsBusiness,
  business2: GoogleMapsBusiness
): boolean {
  // primary checks (high confidence)
  if (business1.placeId && business2.placeId) {
    return business1.placeId === business2.placeId
  }

  if (
    business1.address &&
    business2.address &&
    business1.storeName &&
    business2.storeName
  ) {
    return (
      normalizeAddress(business1.address) ===
        normalizeAddress(business2.address) &&
      normalizeStoreName(business1.storeName) ===
        normalizeStoreName(business2.storeName)
    )
  }

  if (
    business1.phone &&
    business2.phone &&
    business1.storeName &&
    business2.storeName
  ) {
    return (
      normalizePhone(business1.phone) === normalizePhone(business2.phone) &&
      normalizeStoreName(business1.storeName) ===
        normalizeStoreName(business2.storeName)
    )
  }

  // fallback to googleUrl comparison
  if (business1.googleUrl && business2.googleUrl) {
    return (
      extractGoogleUrlId(business1.googleUrl) ===
      extractGoogleUrlId(business2.googleUrl)
    )
  }

  return false
}

export function deduplicateBusinesses(
  businesses: GoogleMapsBusiness[]
): GoogleMapsBusiness[] {
  const unique: GoogleMapsBusiness[] = []

  for (const business of businesses) {
    const isDuplicate = unique.some((existing) =>
      areBusinessesDuplicates(business, existing)
    )

    if (!isDuplicate) {
      unique.push(business)
    }
  }

  return unique
}

export { areBusinessesDuplicates }
