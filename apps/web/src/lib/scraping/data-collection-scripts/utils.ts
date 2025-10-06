import type { GoogleMapsBusiness } from "@lucky/examples/definitions/googlescraper/main/types/GoogleMapsBusiness"
import { isNir } from "@lucky/shared/client"

export type CountryInEurope = {
  name: string
  code: string // 2 letter code ISO 3166-1
  aliases?: string[] // alternative country names that might appear in the data
}

export const europeanCountries: CountryInEurope[] = [
  { name: "Albania", code: "AL" },
  { name: "Andorra", code: "AD" },
  { name: "Austria", code: "AT" },
  { name: "Belarus", code: "BY" },
  { name: "Belgium", code: "BE" },
  { name: "Bosnia and Herzegovina", code: "BA" },
  { name: "Bulgaria", code: "BG" },
  { name: "Croatia", code: "HR", aliases: ["Croatia (Hrvatska)"] },
  { name: "Cyprus", code: "CY" },
  { name: "Czech Republic", code: "CZ" },
  { name: "Denmark", code: "DK" },
  { name: "Estonia", code: "EE" },
  { name: "Finland", code: "FI" },
  { name: "France", code: "FR" },
  { name: "Germany", code: "DE" },
  { name: "Greece", code: "GR" },
  { name: "Hungary", code: "HU" },
  { name: "Iceland", code: "IS" },
  { name: "Ireland", code: "IE" },
  { name: "Italy", code: "IT" },
  { name: "Latvia", code: "LV" },
  { name: "Liechtenstein", code: "LI" },
  { name: "Lithuania", code: "LT" },
  { name: "Luxembourg", code: "LU" },
  { name: "Malta", code: "MT" },
  { name: "Moldova", code: "MD" },
  { name: "Monaco", code: "MC" },
  { name: "Montenegro", code: "ME" },
  { name: "Netherlands", code: "NL", aliases: ["Netherlands The"] },
  { name: "North Macedonia", code: "MK" },
  { name: "Norway", code: "NO" },
  { name: "Poland", code: "PL" },
  { name: "Portugal", code: "PT" },
  { name: "Romania", code: "RO" },
  { name: "San Marino", code: "SM" },
  { name: "Serbia", code: "RS" },
  { name: "Slovakia", code: "SK" },
  { name: "Slovenia", code: "SI" },
  { name: "Spain", code: "ES" },
  { name: "Sweden", code: "SE" },
  { name: "Switzerland", code: "CH" },
  { name: "Ukraine", code: "UA" },
  { name: "United Kingdom", code: "GB" },
  { name: "Vatican City", code: "VA" },
]

/** lightweight, "good-enough" slug maker for B-Corp URLs */
export function slugifyBCorp(raw: string): string {
  return (
    raw
      .trim()
      .replace(/\./g, "") //replace all dots
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .toLowerCase()
      // Important: B-Corp slugs drop accented letters entirely (not just accents).
      // Remove common accented letters before normalization so the whole letter is dropped.
      .replace(/[àáâãäåæ]/g, "")
      .replace(/[çć]/g, "")
      .replace(/[èéêë]/g, "")
      .replace(/[ìíîï]/g, "")
      .replace(/[ñ]/g, "")
      .replace(/[òóôõöø]/g, "")
      .replace(/[ùúûüū]/g, "")
      .replace(/[ýÿ]/g, "")
      .replace(/[ß]/g, "")
      .replace(/[đ]/g, "")
      .replace(/[ř]/g, "")
      .replace(/[š]/g, "")
      .replace(/[ť]/g, "")
      .replace(/[ž]/g, "")
      // Now normalize and strip any remaining combining marks from characters we didn't explicitly handle above.
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "") // remove combining diacritical marks
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  ) // strip leading / trailing "-"
}

/** turn a website field into a bare domain */
export function toDomain(urlish: string | undefined | null): string {
  if (!urlish) return ""

  try {
    const url = new URL(urlish.startsWith("http") ? urlish : `https://${urlish}`)
    return url.hostname.replace(/^www\./i, "")
  } catch {
    return urlish
      .toLowerCase()
      .trim()
      .replace(/^www\./i, "")
  }
}

export function deduplicateBusinesses(biz: GoogleMapsBusiness[] | null | undefined): GoogleMapsBusiness[] {
  if (isNir(biz)) return []
  if (!Array.isArray(biz)) return []

  const makeKey = (b: GoogleMapsBusiness): string => {
    const name = (b.storeName ?? "").toLowerCase().trim()
    const website = (b.bizWebsite ?? "").trim()

    if (name && website) return `${name}|${website}`
    if (name) return name
    if (website) return website // ← exact string, no normalisation
    if (b.placeId) return b.placeId

    return `raw:${JSON.stringify(b)}`
  }

  const chosen = new Map<string, GoogleMapsBusiness>()

  for (const b of biz) {
    const key = makeKey(b)

    if (!chosen.has(key)) {
      chosen.set(key, b)
      continue
    }

    const current = chosen.get(key)!
    if (b.placeId && !current.placeId) {
      chosen.set(key, b)
    }
  }

  return [...chosen.values()]
}
