import fs from "fs"
import json from "../../../../lib/evals/all/dillekamille.json" assert { type: "json" }

function transformLocationData(input) {
  const dayMap = {
    ma: "monday",
    di: "tuesday",
    wo: "wednesday",
    do: "thursday",
    vr: "friday",
    za: "saturday",
    zo: "sunday",
  }

  const locations = Array.isArray(input) ? input : [input]

  return locations.map(location => {
    // build opening_times with defaults
    const opening_times = {
      monday: "closed",
      tuesday: "closed",
      wednesday: "closed",
      thursday: "closed",
      friday: "closed",
      saturday: "closed",
      sunday: "closed",
    }
    if (Array.isArray(location.times)) {
      location.times.forEach(entry => {
        const dayKey = dayMap[entry.day]
        if (dayKey) {
          if (!entry.is_open) {
            opening_times[dayKey] = "closed"
          } else if (entry.opening_time && entry.closing_time) {
            opening_times[dayKey] = `${entry.opening_time}-${entry.closing_time}`
          }
        }
      })
    }

    // pull coords if available
    let coords = null
    if (location.marker && location.marker.latitude && location.marker.longitude) {
      coords = [parseFloat(location.marker.longitude), parseFloat(location.marker.latitude)]
    }

    return {
      name: location.name || null,
      address: location.address || null,
      city: location.city || null,
      country: location.country || null,
      postcode: location.postcode || null,
      phone: location.phone || null,
      email: location.email || null,
      coordinates: coords,
      opening_times,
      owner_imgs: Array.isArray(location.owner_imgs) ? location.owner_imgs : [],
      metadata: {
        ai_generated_description: location.metadata?.ai_generated_description || null,
        calculated_rating: location.metadata?.calculated_rating || null,
        extracted_features: Array.isArray(location.metadata?.extracted_features)
          ? location.metadata.extracted_features
          : [],
      },
    }
  })
}

// run transform and save
const transformed = transformLocationData(json)
fs.writeFileSync("app/src/lib/evals/parsed/dillekamille.json", JSON.stringify(transformed, null, 2))

lgg.log(transformed)
