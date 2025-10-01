/* eslint-disable no-restricted-imports */
import fs from "fs"
import json from "../../../../lib/evals/all/swapfiets.json" assert { type: "json" }

// map Dutch day names to our standard English keys
const DAY_MAP = {
  Maandag: "monday",
  Dinsdag: "tuesday",
  Woensdag: "wednesday",
  Donderdag: "thursday",
  Vrijdag: "friday",
  Zaterdag: "saturday",
  Zondag: "sunday",
}

// build an all-null opening template
const DEFAULT_OPENING = {
  monday: null,
  tuesday: null,
  wednesday: null,
  thursday: null,
  friday: null,
  saturday: null,
  sunday: null,
}

function transformSwapfietsData(input) {
  const locations = Array.isArray(input) ? input : [input]

  return locations.map(item => {
    // Normalize opening_times
    const opening_times = { ...DEFAULT_OPENING }
    if (item.opening_hours) {
      for (const [nlDay, hours] of Object.entries(item.opening_hours)) {
        const enDay = DAY_MAP[nlDay]
        if (enDay) {
          // turn "HH:MM - HH:MM" into "HH:MM-HH:MM"
          opening_times[enDay] = hours.replace(/\s*-\s*/, "-")
        }
      }
    }

    return {
      name: item.name || null,
      address: item.street && item.street_number ? `${item.street} ${item.street_number}` : item.street || null,
      city: item.city || null,
      country: item.country || null,
      postcode: item.postal_code || null,
      phone: item.phone || null,
      email: item.email || null,
      coordinates: item.coordinates || null,
      opening_times,
      owner_imgs: item.owner_imgs || [],
      metadata: {
        ai_generated_description: null,
        calculated_rating: null,
        extracted_features: [],
      },
    }
  })
}

// load → Transform → Save
const transformed = transformSwapfietsData(json)

fs.writeFileSync("app/src/lib/evals/parsed/swapfiets.json", JSON.stringify(transformed, null, 2))
