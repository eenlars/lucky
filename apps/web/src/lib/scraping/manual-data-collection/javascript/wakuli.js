/* eslint-disable no-restricted-imports */
import fs from "node:fs"
import json from "../../../../lib/evals/all/wakuli.json" assert { type: "json" }

// map two-letter codes to English weekdays
const DAY_CODE_MAP = {
  mo: "monday",
  tu: "tuesday",
  we: "wednesday",
  th: "thursday",
  fr: "friday",
  sa: "saturday",
  su: "sunday",
}

// helper: expand a range "mo-fr" into ["mo","tu","we","th","fr"]
function expandRange(start, end) {
  const codes = Object.keys(DAY_CODE_MAP)
  const i1 = codes.indexOf(start)
  const i2 = codes.indexOf(end)
  if (i1 > -1 && i2 > -1) {
    return i1 <= i2 ? codes.slice(i1, i2 + 1) : codes.slice(i1).concat(codes.slice(0, i2 + 1))
  }
  return []
}

function transformWakuliData(input) {
  const items = Array.isArray(input) ? input : [input]

  return items.map(item => {
    // Build coordinates array
    const coords =
      item.longitude && item.latitude ? [Number.parseFloat(item.longitude), Number.parseFloat(item.latitude)] : null

    // Combine address lines
    const addressParts = []
    if (item.address_line_1) addressParts.push(item.address_line_1)
    if (item.address_line_2) addressParts.push(item.address_line_2)
    const address = addressParts.length ? addressParts.join(", ") : null

    // Initialize opening_times all-null
    const opening_times = {
      monday: null,
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null,
      saturday: null,
      sunday: null,
    }

    // Find "Opening times" custom field and parse it
    const cf = (item.custom_fields || []).find(f => f.name.toLowerCase().includes("opening"))
    if (cf?.value) {
      cf.value.split("\n").forEach(line => {
        // e.g. "mo - fr 07:00-18:00" or "sa - su 08:00-18:00"
        const parts = line.trim().split(/\s+/, 3)
        // parts[0] = start code, parts[1] = '-' or end code, parts[2] = times OR parts[1] = times
        let dayCodes = []
        let times
        if (parts.length === 3 && parts[1] === "-") {
          // range form: [start, '-', endTimes]? Actually split yields ["mo","-","fr"] but our split is wrong.
          // Better to match with regex:
          const m = line.match(/^(\w{2})\s*-\s*(\w{2})\s+(.+)$/)
          if (m) {
            const [, start, end, t] = m
            dayCodes = expandRange(start.toLowerCase(), end.toLowerCase())
            times = t.trim()
          }
        } else {
          // single-day form "mo 07:00-18:00"
          const m2 = line.match(/^(\w{2})\s+(.+)$/)
          if (m2) {
            dayCodes = [m2[1].toLowerCase()]
            times = m2[2].trim()
          }
        }
        // Assign
        if (dayCodes.length && times) {
          dayCodes.forEach(dc => {
            const day = DAY_CODE_MAP[dc]
            if (day) {
              // normalize "HH:MM-HH:MM"
              opening_times[day] = times.replace(/\s*-\s*/, "-")
            }
          })
        }
      })
    }

    return {
      name: item.name || null,
      address,
      city: item.city || null,
      country: item.country || null,
      postcode: item.postal_code || null,
      phone: item.phone || null,
      email: item.email || null,
      coordinates: coords,
      opening_times,
      owner_imgs: item.image_url ? [item.image_url] : [],
      metadata: {
        ai_generated_description: null,
        calculated_rating: null,
        extracted_features: [],
      },
    }
  })
}

// load → Transform → Save
const transformed = transformWakuliData(json)

fs.writeFileSync("app/src/lib/evals/parsed/wakuli.json", JSON.stringify(transformed, null, 2))

// log for quick inspection
lgg.info(JSON.stringify(transformed, null, 2))
