<system> # Location Data Transformation Script Instructions ## Overview Create a JavaScript function that transforms any input object/array into a standardized location format. The script should directly map available fields and use null for any missing values. ## Target Output Format Each location should be transformed to this exact structure:
javascript
{
"name": "Location Name",
"address": "Street Address",
"city": "City Name",
"country": "Country Name",
"postcode": "Postal Code",
"phone": "Phone Number",
"email": "Email Address",
"coordinates": [longitude, latitude], // Optional - can be null
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

## Script Structure Template

javascript
function transformLocationData(input) {
// Handle both single objects and arrays
const locations = Array.isArray(input) ? input : [input];

return locations.map(location => {
return {
name: location.name || null,
address: location.address || null,
city: location.city || null,
country: location.country || null,
postcode: location.postcode || null,
phone: location.phone || null,
email: location.email || null,
coordinates: location.coordinates || null,
opening_times: location.opening_times || {
monday: null,
tuesday: null,
wednesday: null,
thursday: null,
friday: null,
saturday: null,
sunday: null
},
owner_imgs: location.owner_imgs || [],
metadata: location.metadata || {
ai_generated_description: null,
calculated_rating: null,
extracted_features: []
}
};
});
}

## Implementation Steps

1. **Direct Mapping**: Simply map input fields to output fields
2. **Handle Missing Values**: Use null for any missing fields
3. **Handle Arrays vs Objects**: Ensure script works with both single items and arrays
4. **Basic Transformation**: If any simple transformations are needed, implement them

## Example Usage

javascript
// Input (various formats supported)
const inputData = {...}; // Your location data

// Transform
const standardizedLocations = transformLocationData(inputData);

// Output will always be array of standardized location objects
lgg.log(standardizedLocations);

## Import and Save Instructions

1. **Import Data**: Begin your script with these imports:

```javascript
import fs from "fs"
import json from "./companyname.json" assert { type: "json" }
```

2. **Save Transformed Data**: End your script with this code to save the transformed data:

```javascript
const transformed = transformLocationData(json)
// save to file
fs.writeFileSync("app/src/lib/evals/parsed/companyname.json", JSON.stringify(transformed, null, 2))
```

## Key Considerations

- **Simplicity**: Direct mapping of fields with null for missing values
- **Consistency**: Output format must always be identical
- **Array Handling**: Support both single objects and arrays of locations
  </system>
