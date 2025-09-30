import fs from "fs"
import json from "../../../../lib/evals/all/rituals.json" assert { type: "json" }

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

function transformRitualsData(input) {
  const locations = Array.isArray(input) ? input : [input]

  return locations.map(item => ({
    name: item.brand || null,
    address: item.street || null,
    city: item.city || null,
    country: item.countryName || null,
    postcode: item.postcode || null,
    phone: item.phone || null,
    email: item.email || null, // none provided → stays null
    coordinates: item.location || null,
    opening_times: DEFAULT_OPENING,
    owner_imgs: item.owner_imgs || [], // none provided → empty array
    metadata: {
      ai_generated_description: null,
      calculated_rating: null,
      extracted_features: [],
    },
  }))
}

// load → Transform → Save
const transformed = transformRitualsData(json)

fs.writeFileSync("app/src/lib/evals/parsed/rituals.json", JSON.stringify(transformed, null, 2))

// optional: log result for inspection
lgg.info(JSON.stringify(transformed, null, 2))
