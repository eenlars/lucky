/* eslint-disable no-restricted-imports */
import fs from "fs"
import json from "../../../../lib/evals/all/partou.json" assert { type: "json" }

// template for days with no data
const DEFAULT_OPENING = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

function transformPartouData(input) {
  const locations = Array.isArray(input) ? input : [input]

  return locations.map(item => {
    // Build coordinates array if present
    const coords =
      item.geoLocation && item.geoLocation.longitude && item.geoLocation.latitude
        ? [parseFloat(item.geoLocation.longitude), parseFloat(item.geoLocation.latitude)]
        : null

    // Collect all venue images into one array
    const ownerImgs = (item.venues || []).flatMap(v =>
      [v.headerPhoto, v.photoDesktopFirst, v.photoDesktopLast, v.photoMobileFirst, v.photoMobileLast].filter(Boolean),
    )

    return {
      name: item.name || null,
      address: item.address?.addressLine || null,
      city: item.address?.city || null,
      country: item.address?.countryCode || null,
      postcode: item.address?.postCode || null,
      phone: item.phone || null,
      email: item.email || null,
      coordinates: coords,
      opening_times: DEFAULT_OPENING,
      owner_imgs: ownerImgs,
      metadata: {
        ai_generated_description: null,
        calculated_rating: null,
        extracted_features: [],
      },
    }
  })
}

// load → Transform → Save
const transformed = transformPartouData(json)

fs.writeFileSync("app/src/lib/evals/parsed/partou.json", JSON.stringify(transformed, null, 2))
