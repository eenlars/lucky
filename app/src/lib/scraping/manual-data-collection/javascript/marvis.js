import fs from "fs"
import json from "../../../../lib/evals/parsed/marvis.json" assert { type: "json" }

function transformLocationData(input) {
  // Ensure we always work with an array
  const locations = Array.isArray(input) ? input : [input]

  // Helper to build opening_times from store.defaultOpeningTimes
  const buildOpeningTimes = (defaultTimes = {}) => {
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    return days.reduce((acc, day) => {
      const info = defaultTimes[day]
      if (info) {
        acc[day] = info.closed ? "closed" : `${info.open}-${info.close}`
      } else {
        acc[day] = null
      }
      return acc
    }, {})
  }

  return locations.map(item => {
    const store = item.store || {}
    return {
      name: item.name || null,
      address: store.street || null,
      city: store.city || null,
      country: store.country?.name || null,
      postcode: store.postalCode || null,
      phone: store.phone || null,
      email: store.email || null,
      coordinates: item.coordinates || null,
      opening_times: buildOpeningTimes(store.defaultOpeningTimes),
      owner_imgs: item.owner_imgs || [],
      metadata: item.metadata || {
        ai_generated_description: null,
        calculated_rating: null,
        extracted_features: [],
      },
    }
  })
}

// run the transformation
const transformed = transformLocationData(json)

// save to file
fs.writeFileSync("app/src/lib/evals/parsed/marvis.json", JSON.stringify(transformed, null, 2))

// also log to console for immediate inspection
lgg.info(JSON.stringify(transformed, null, 2))
