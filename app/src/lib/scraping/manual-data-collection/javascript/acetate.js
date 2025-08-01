import fs from "fs"
import acetate from "../../../../lib/evals/all/acetate.json" assert { type: "json" }

function transformLocationData(input) {
  const locations = Array.isArray(input) ? input : [input]
  return locations.map((loc) => ({
    name: extractName(loc),
    address: extractAddress(loc),
    city: extractCity(loc),
    country: extractCountry(loc),
    postcode: extractPostcode(loc),
    phone: extractPhone(loc),
    email: extractEmail(loc),
    coordinates: extractCoordinates(loc),
    opening_times: transformOpeningHours(loc),
    owner_imgs: extractOwnerImages(loc),
    metadata: generateMetadata(loc),
  }))
}

function extractName(loc) {
  return (
    loc.name ||
    loc.title ||
    loc.business_name ||
    loc.display_name ||
    (loc.meta && loc.meta.title) ||
    null
  )
}

function extractAddress(loc) {
  if (loc.display_address_line1) return loc.display_address_line1
  const parts = [
    loc.street,
    loc.house_number,
    loc.house_number_addition,
  ].filter((p) => p !== null && p !== undefined)
  return parts.length ? parts.join(" ") : null
}

function extractCity(loc) {
  return loc.city || null
}

function extractCountry(loc) {
  return loc.country || loc.country_code || null
}

function extractPostcode(loc) {
  return loc.postal_code || loc.postcode || null
}

function extractPhone(loc) {
  return loc.phone || loc.phone_national || null
}

function extractEmail(loc) {
  return loc.email || loc.contact_email || null
}

function extractCoordinates(loc) {
  if (loc.longitude != null && loc.latitude != null) {
    return [parseFloat(loc.longitude), parseFloat(loc.latitude)]
  }
  return null
}

function transformOpeningHours(loc) {
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ]
  // start all closed
  const result = dayNames.reduce((acc, d) => {
    acc[d] = "closed"
    return acc
  }, {})
  if (Array.isArray(loc.opening_hours)) {
    loc.opening_hours.forEach((entry) => {
      const day = dayNames[entry.day_of_the_week]
      if (!day) return
      if (entry.closed) {
        result[day] = "closed"
      } else {
        // strip seconds
        const open = entry.opening_time.slice(0, 5)
        const close = entry.closing_time.slice(0, 5)
        result[day] = `${open}-${close}`
      }
    })
  }
  return result
}

function extractOwnerImages(loc) {
  if (!Array.isArray(loc.media)) return []
  return loc.media.map((m) => m.url_cdn || m.cloudinary_url).filter((u) => !!u)
}

function generateMetadata(loc) {
  return {
    // for AI to generate a richer description
    description_source: loc.description || null,
  }
}

const transformed = transformLocationData(acetate)

// save to file
fs.writeFileSync(
  "app/src/lib/evals/parsed/acetate.json",
  JSON.stringify(transformed, null, 2)
)
