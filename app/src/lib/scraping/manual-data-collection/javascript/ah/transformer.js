import fs from "fs"
import json from "../../../../../lib/evals/all/albertheijn.json" assert { type: "json" }
function transformLocationData(input) {
  const locations = Array.isArray(input) ? input : [input]

  return locations.map((location) => ({
    name: extractName(location),
    address: extractAddress(location),
    city: extractCity(location),
    country: extractCountry(location),
    postcode: extractPostcode(location),
    phone: extractPhone(location),
    email: extractEmail(location),
    coordinates: extractCoordinates(location),
    opening_times: transformOpeningHours(location),
    owner_imgs: extractOwnerImages(location),
    metadata: generateMetadata(location),
  }))
}

// --- Helper functions ---

function extractName(loc) {
  return loc.name || loc.title || loc.business_name || loc.display_name || null
}

function extractAddress(loc) {
  if (loc.address) return loc.address
  if (loc.display_address_line1) return loc.display_address_line1
  if (loc.street && loc.house_number) {
    let addr = `${loc.street} ${loc.house_number}`
    if (loc.house_number_addition) addr += loc.house_number_addition
    return addr
  }
  return null
}

function extractCity(loc) {
  return loc.city || loc.town || loc.village || null
}

function extractCountry(loc) {
  return loc.country || loc.country_name || null
}

function extractPostcode(loc) {
  return loc.postcode || loc.postal_code || loc.zip || loc.zipcode || null
}

function extractPhone(loc) {
  return loc.phone || loc.phone_national || null
}

function extractEmail(loc) {
  return loc.email || loc.contact_email || null
}

function extractCoordinates(loc) {
  if (Array.isArray(loc.coordinates) && loc.coordinates.length === 2) {
    return loc.coordinates
  }
  if (
    loc.geo &&
    Array.isArray(loc.geo.coordinates) &&
    loc.geo.coordinates.length === 2
  ) {
    return loc.geo.coordinates
  }
  if (loc.latitude != null && loc.longitude != null) {
    return [loc.longitude, loc.latitude]
  }
  return null
}

function transformOpeningHours(loc) {
  // Start with no data for every day
  const days = {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  }

  // 1) If there’s an opening_hours array, honour that
  if (Array.isArray(loc.opening_hours)) {
    const dowMap = {
      0: "sunday",
      1: "monday",
      2: "tuesday",
      3: "wednesday",
      4: "thursday",
      5: "friday",
      6: "saturday",
      7: "sunday",
    }
    loc.opening_hours.forEach((e) => {
      const dayName = dowMap[e.day_of_the_week ?? e.day]
      if (!dayName) return
      if (e.closed) {
        days[dayName] = "closed"
      } else if (e.opening_time && e.closing_time) {
        days[dayName] =
          e.opening_time.slice(0, 5) + "-" + e.closing_time.slice(0, 5)
      }
    })
  }
  // 2) Otherwise, if status says “open” and we have a close time…
  else if (loc.status && /geopend/i.test(loc.status) && loc.close) {
    const m = loc.close.match(/(\d{1,2}[:.]\d{2})/)
    if (m) {
      // normalize “HH.MM” → “HH:MM”
      const closeTime = m[1].replace(".", ":")
      // assume open from midnight if we have no better info
      Object.keys(days).forEach((d) => {
        days[d] = `08:00-${closeTime}`
      })
    }
  }

  // 3) If you really want to force every null → "closed", uncomment this:
  // Object.keys(days).forEach(d => { if (days[d] === null) days[d] = 'closed'; });

  return days
}

function extractOwnerImages(loc) {
  if (Array.isArray(loc.owner_imgs)) return loc.owner_imgs
  if (Array.isArray(loc.images)) return loc.images
  if (Array.isArray(loc.photos)) return loc.photos
  if (Array.isArray(loc.pictures)) return loc.pictures
  return []
}

function generateMetadata(loc) {
  return {
    // field whose text should be sent to an LLM for description enhancement
    ai_generated_description: loc.description || loc.desc || null,
    // field from which to compute an internal rating
    calculated_rating: loc.rating != null ? loc.rating : null,
    // any arrays of “features” or “highlights” to extract
    extracted_features: Array.isArray(loc.highlights)
      ? loc.highlights
      : Array.isArray(loc.features)
        ? loc.features
        : [],
  }
}

const transformed = transformLocationData(json)

// save to file
fs.writeFileSync(
  "./albertheijn-parsed.json",
  JSON.stringify(transformed, null, 2)
)
