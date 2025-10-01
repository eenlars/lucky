# Location Data Formatting Instructions

## Output Format

Return ONLY a JSON array containing location objects. No explanatory text before or after the JSON.

## Required Structure

Each location should be formatted as a single, standalone object in an array. Do NOT nest locations under company names.

## Expected Output Format

```json
[
    {
        "name": "Store Name with Location Identifier",
        "address": "Street address only",
        "city": "City name",
        "country": "Country name",
        "postcode": "Postal/ZIP code",
        "phone": "Phone number with country code",
        "email": "Contact email address",
        "coordinates": [longitude, latitude],
        "bcorp_id": 1234,
        "is_headquarters": false,
        "opening_times": {

            "monday": "9:00-17:30",
            "tuesday": "9:00-17:30",
            "wednesday": "9:00-17:30",
            "thursday": "9:00-17:30",
            "friday": "9:00-17:30",
            "saturday": "9:00-17:30",
            "sunday": "closed"

        },
        "owner_imgs": ["url1", "url2", "url3"]
    }
]
```

## Field Requirements

### Mandatory Fields

- name: Store name + location identifier (e.g., "Rituals Utrecht Centraal Station")
- address: Street address only, no city/country
- city: City name only
- country: Country name
- postcode: Postal/ZIP code
- bcorp_id: B-Corp certification ID number
- is_headquarters: Boolean (true/false)

### Optional Fields

- phone: Include if available
- email: Include if available
- coordinates: Array [longitude, latitude] - include if available
- opening_times: Object with days as keys, times as values
- owner_imgs: Array of image URLs from Google Maps "By owner" section

## Important Rules

1. One object per location - Do not group under company names
2. Consistent field names - Use exact field names as shown above
3. Data types matter:
   - coordinates: Array of numbers [longitude, latitude]
   - bcorp_id: Number (not string)
   - is_headquarters: Boolean (true/false, not "true"/"false")
   - opening_times: Object with day names as keys
4. Time format: Use 24-hour format (e.g., "9:00-17:30")
5. Closed days: Use "closed" as the value
6. Missing data: Omit the field entirely if data is not available

## Example Complete Output

```json
[
  {
    "name": "Rituals Utrecht Centraal Station",
    "address": "Stationshal 12 C",
    "city": "Utrecht",
    "country": "Netherlands",
    "postcode": "3511 CE",
    "phone": "+31304420004",
    "coordinates": [5.1102894, 52.0893066],
    "bcorp_id": 1605,
    "is_headquarters": false,
    "opening_times": {
      "monday": "9:00-18:00",
      "tuesday": "9:00-18:00",
      "wednesday": "9:00-18:00",
      "thursday": "9:00-18:00",
      "friday": "9:00-18:00",
      "saturday": "9:00-18:00",
      "sunday": "12:00-17:00"
    }
  }
]
```

## What NOT to Do

❌ Do not include any text before the JSON array
❌ Do not include any text after the JSON array
❌ Do not nest locations under company names
❌ Do not include company name as a separate field
❌ Do not use string values for boolean fields
❌ Do not include city/country in the address field
❌ Do not use 12-hour time format
