/* eslint-disable no-restricted-imports */
import type { GoogleMapsBusiness } from "@examples/definitions/googlescraper/main/types/GoogleMapsBusiness"
import { readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import {
  extractCoordinates,
  GoogleScraperBusinessExtended,
  transformLocationData,
} from "@examples/definitions/googlescraper/convert"
import { toDomain } from "../utils"

// use: tsx src/lib/count-bcorps/per-country/filter.ts

type OneBusiness = GoogleMapsBusiness & {
  bcorp: {
    company_name: string
    domain: string
    website: string
    bcorp_url: string
  }
  country: {
    name: string
    code: string
    aliases: never[]
  }
  processingMetadata: {
    processId: string
    batchNumber: number
    searchQuery: string
    timestamp: string
  }
}

type AllData = { businesses: OneBusiness[] }

function main() {
  // allow custom path via CLI, default to the given file
  const inputPath = process.argv[2] ?? "src/lib/count-bcorps/all-data.json"
  const fullPath = resolve(process.cwd(), inputPath)

  // load and parse
  const raw = readFileSync(fullPath, "utf-8")
  const data: AllData = JSON.parse(raw)

  // filter: keep only those where the normalized domains are equal
  const filtered = data.businesses.filter(biz => {
    const bcorpDomain = toDomain(biz.bcorp.website)
    const bizDomain = toDomain(biz.bizWebsite)
    return (
      bcorpDomain === bizDomain &&
      bizDomain !== "ah.nl" &&
      bizDomain !== "rituals.com" &&
      !biz.status?.includes("Permanent")
    )
  })

  const transformed = filtered.map(biz => {
    const mappedBusiness: GoogleScraperBusinessExtended = {
      storeName: biz.storeName || "",
      stars: biz.stars || "",
      numberOfReviews: biz.numberOfReviews || 0,
      googleUrl: biz.googleUrl || "",
      bizWebsite: biz.bizWebsite,
      address: biz.address || "",
      category: biz.category,
      status: biz.status,
      phone: biz.phone,
      mainImage: biz.mainImage,
      hours: biz.hours,
      coordinates: extractCoordinates(biz as unknown as GoogleScraperBusinessExtended) || undefined,
    }

    return transformLocationData([mappedBusiness], {
      bcorp: biz.bcorp,
      country: biz.country,
      processingMetadata: biz.processingMetadata,
    })[0]
  })

  // output the filtered result
  const output = transformed
  //save to file
  writeFileSync(fullPath + ".filtered.json", JSON.stringify(output, null, 2))
}

main()
