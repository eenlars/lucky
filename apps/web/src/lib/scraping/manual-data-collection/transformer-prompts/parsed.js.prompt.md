# Location Data Transformation Script Instructions

## Overview

Create a JavaScript function that transforms any input object/array into a standardized location format. The script should be flexible enough to handle different input structures while maintaining consistent output.

## Target Output Format

Each location should be transformed to this exact structure:

```javascript
{
  "name": "Location Name",
  "address": "Street Address",
  "city": "City Name",
  "country": "Country Name",
  "postcode": "Postal Code",
  "phone": "Phone Number",
  "email": "Email Address",
  "coordinates": [longitude, latitude], // Optional - can be null/undefined
  "opening_times": {
    "monday": "HH:MM-HH:MM" | "closed",
    "tuesday": "HH:MM-HH:MM" | "closed",
    "wednesday": "HH:MM-HH:MM" | "closed",
    "thursday": "HH:MM-HH:MM" | "closed",
    "friday": "HH:MM-HH:MM" | "closed",
    "saturday": "HH:MM-HH:MM" | "closed",
    "sunday": "HH:MM-HH:MM" | "closed"
  },
  "owner_imgs": ["url1", "url2", "url3"], // Array of image URLs
  "metadata": {
    // Fields that require AI processing or special handling
    "ai_generated_description": "field_name_to_process",
    "calculated_rating": "field_to_calculate_from",
    "extracted_features": ["field1", "field2"]
  }
}
```

## Script Structure Template

```javascript
function transformLocationData(input) {
  // Handle both single objects and arrays
  const locations = Array.isArray(input) ? input : [input]

  return locations.map(location => {
    return {
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
    }
  })
}

// Helper functions for each field extraction
function extractName(location) {
  // Logic to find name from various possible field names
  // Try: name, title, display_name, business_name, etc.
}

function extractAddress(location) {
  // Logic to construct full address
  // Try: address, street, display_address_line1, etc.
}

function transformOpeningHours(location) {
  // Convert opening hours array/object to standardized format
  // Handle different day representations (0-6, 1-7, day names)
}

function generateMetadata(location) {
  // Identify fields that need AI processing
  // Return object with field mappings for AI enhancement
}
```

## Field Mapping Strategy

### 1. Name Extraction

Look for these fields in order of preference:

- `name`, `title`, `business_name`, `display_name`
- If complex object, may need concatenation

### 2. Address Construction

- Try single `address` field first
- Fallback to: `street` + `house_number` + `house_number_addition`
- Use `display_address_line1` if available

### 3. Geographic Data

- `city`, `postal_code`/`postcode`, `country`
- Coordinates: `[longitude, latitude]` or `[lng, lat]`

### 4. Contact Information

- Phone: `phone`, `phone_national`, format consistently
- Email: `email`, `contact_email`

### 5. Opening Hours Transformation

Convert from various formats:

```javascript
// From array format (day_of_the_week: 0-6)
opening_hours: [
  {"day_of_the_week": 1, "opening_time": "10:00:00", "closing_time": "18:00:00", "closed": 0}
]

// To standardized format
opening_times: {
  "monday": "10:00-18:00",
  "tuesday": "10:00-18:00"
}
```

### 6. Metadata for AI Processing

Include fields that need AI enhancement:

```javascript
metadata: {
  "description_source": location.description, // For AI to generate better description
  "services_to_extract": location.highlights, // For AI to extract key services
  "category_inference": location.type || location.business_type // For AI categorization
}
```

## Implementation Steps

1. **Analyze Input Structure**: First examine the input to understand its schema
2. **Create Field Mapping**: Map input fields to output fields
3. **Handle Arrays vs Objects**: Ensure script works with both single items and arrays
4. **Implement Helper Functions**: Create specific extraction logic for each field
5. **Add Error Handling**: Gracefully handle missing or malformed data
6. **Test with Sample Data**: Verify transformation works correctly

## Example Usage

```javascript
// Input (various formats supported)
const inputData = {...}; // Your location data

// Transform
const standardizedLocations = transformLocationData(inputData);

// Output will always be array of standardized location objects
lgg.log(standardizedLocations);
```

## Key Considerations

- **Flexibility**: Script should handle different input schemas
- **Consistency**: Output format must always be identical
- **Error Handling**: Missing fields should default to null/empty values
- **AI Integration**: Use metadata field for data that needs AI processing
- **Performance**: Efficient for both single items and large arrays
