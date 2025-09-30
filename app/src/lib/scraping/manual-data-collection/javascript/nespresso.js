import fs from "fs"
import json from "../../../../lib/evals/all/nespresso.json" assert { type: "json" }

// default “closed”/null opening‐times template
const DEFAULT_OPENING = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

function transformNespressoData(input) {
  // input is an array of objects each with a `stores` array
  const allStores = Array.isArray(input) ? input.flatMap(item => item.stores || []) : input.stores || []

  return allStores.map(store => ({
    name: store.name || null,
    address: store.address || null,
    city: store.city || null,
    country: store.country || null,
    postcode: store.postal_code || null,
    phone: store.phone || null,
    email: store.email || null,
    coordinates: store.coordinates || null,
    opening_times: { ...DEFAULT_OPENING },
    owner_imgs: store.owner_imgs || [],
    metadata: {
      ai_generated_description: null,
      calculated_rating: null,
      extracted_features: [],
    },
  }))
}

// load → Transform → Save
const transformed = transformNespressoData(json)
fs.writeFileSync("app/src/lib/evals/parsed/nespresso.json", JSON.stringify(transformed, null, 2))

// for quick debugging:
lgg.info(JSON.stringify(transformed, null, 2))
