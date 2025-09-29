# Location Data Manager

JSON-based location storage system for workflow contexts with quality assessment, atomic operations, and validation-first architecture.

## Overview

The Location Data Manager provides workflow-scoped location storage with automatic quality assessment and atomic operations. It follows shared memory patterns with file-based persistence and intelligent validation.

## Quick Start

```typescript
import { locationDataManager } from "./core"

// Insert locations for a workflow
await locationDataManager.insertLocations("workflow-123", [
  {
    id: "loc-1",
    name: "Main Office",
    address: "123 Main St",
    city: "New York",
    country: "USA",
  },
])

// Retrieve locations
const { locations } = await locationDataManager.getLocations("workflow-123")

// Get minimal summary
const { summary } = await locationDataManager.getMinimalSummary("workflow-123")
// Returns: "1 location: 123 Main St, New York"
```

## Architecture

```
tool.ts     # defineTool interface with Zod validation
api.ts      # Wrapped functions returning CodeToolResult
core.ts     # locationDataManager singleton with JSON persistence
types.ts    # Zod schemas and TypeScript interfaces
```

### Data Flow

1. **Input Validation**: Tool receives params via defineTool interface
2. **API Wrapper**: Handles success/error formatting with CodeToolResult
3. **Core Processing**: Validates, normalizes, and persists to JSON files
4. **Quality Assessment**: Automatic quality scoring for each location

## Core Features

### Workflow-Scoped Storage

Each workflow gets isolated location data with unique identifiers:

```typescript
// Different workflows maintain separate data
await locationDataManager.insertLocation("workflow-123", location1)
await locationDataManager.insertLocation("workflow-456", location2)

// Data is completely isolated
const workflow123Data = await locationDataManager.getLocations("workflow-123")
const workflow456Data = await locationDataManager.getLocations("workflow-456")
```

### Atomic Operations

All operations are atomic with rollback on validation failures:

```typescript
// Batch insert - all succeed or all fail
const result = await locationDataManager.insertLocations("workflow-123", [
  { id: "loc-1", name: "Valid Location" },
  { id: "loc-2", name: "" }, // Invalid - will cause rollback
  { id: "loc-3", name: "Another Valid Location" },
])
// Result: { success: false, processed: 0, failed: 3 }
```

### Quality Assessment

Automatic quality scoring based on data completeness:

```typescript
interface LocationData {
  id: string
  name: string
  address?: string
  city?: string
  country?: string
  postcode?: string
  phone?: string | null
  email?: string | null
  latitude?: number
  longitude?: number
  quality?: DataQuality // Auto-generated
}

enum DataQuality {
  COMPLETE = "complete", // 4+ detail fields present
  PARTIAL = "partial", // 2-3 detail fields present
  MINIMAL = "minimal", // Only id/name present
}
```

### Flexible Schema

Supports partial data with intelligent defaults:

```typescript
// Minimal required data
const minimalLocation = {
  id: "loc-1",
  name: "Basic Location",
}

// Rich location data
const richLocation = {
  id: "loc-2",
  name: "Complete Location",
  address: "123 Main St",
  city: "New York",
  country: "USA",
  postcode: "10001",
  phone: "+1-555-123-4567",
  email: "info@example.com",
  latitude: 40.7128,
  longitude: -74.006,
  opening_times: {
    monday: "09:00-17:00",
    tuesday: "09:00-17:00",
    wednesday: "09:00-17:00",
    thursday: "09:00-17:00",
    friday: "09:00-17:00",
    saturday: "10:00-16:00",
    sunday: "closed",
  },
  owner_imgs: ["https://example.com/img1.jpg"],
  metadata: {
    source: "google_maps",
    verified: true,
    lastUpdated: "2024-01-15",
  },
}
```

## Tool Interface

### Insert Locations

```typescript
{
  operation: "insertLocations",
  workflowInvocationId: "workflow-123",
  locationData: [
    {
      id: "loc-1",
      name: "Test Location",
      address: "123 Main St",
      city: "New York",
      country: "USA"
    }
  ]
}
```

### Retrieve Locations

```typescript
{
  operation: "getLocations",
  workflowInvocationId: "workflow-123"
}
```

### Get Summary

```typescript
{
  operation: "getMinimalSummary",
  workflowInvocationId: "workflow-123"
}
```

## API Functions

### Insert Location Data

```typescript
import { insertLocationData } from "./api"

const result = await insertLocationData("workflow-123", [
  {
    id: "loc-1",
    name: "New Location",
    address: "456 Oak Ave",
    city: "San Francisco",
  },
])

// Returns CodeToolResult<InsertResult>
console.log(result.success) // true
console.log(result.data.locationCount) // 1
console.log(result.data.processed) // 1
console.log(result.data.warnings) // Quality warnings if any
```

### Get Location Data

```typescript
import { getLocationData } from "./api"

const result = await getLocationData("workflow-123")

// Returns CodeToolResult<GetResult>
console.log(result.success) // true
console.log(result.data.locations) // Array of LocationData
console.log(result.data.totalCount) // Number of locations
```

### Get Summary

```typescript
import { getLocationSummary } from "./api"

const result = await getLocationSummary("workflow-123")

// Returns CodeToolResult<SummaryResult>
console.log(result.success) // true
console.log(result.data.summary) // "2 locations: 123 Main St, New York; 456 Oak Ave, San Francisco"
```

## Core Implementation

### Direct Core Usage

```typescript
import { locationDataManager } from "./core"

// Batch insert with detailed response
const insertResult = await locationDataManager.insertLocations("workflow-123", locations)
console.log(insertResult)
// {
//   success: true,
//   locationCount: 5,
//   processed: 3,
//   failed: 2,
//   warnings: ["Location loc-3 has minimal quality"],
//   errors: ["Location loc-5 missing required field: name"]
// }

// Single insert (convenience wrapper)
await locationDataManager.insertLocation("workflow-123", singleLocation)

// Retrieve with graceful missing workflow handling
const { locations } = await locationDataManager.getLocations("workflow-123")
// Returns empty array if workflow not found

// Get formatted summary
const { summary } = await locationDataManager.getMinimalSummary("workflow-123")
// Returns "No locations found" if empty
```

### Merge Behavior

```typescript
// Existing locations are updated by ID
await locationDataManager.insertLocation("workflow-123", {
  id: "loc-1",
  name: "Original Name",
  address: "123 Main St",
})

// Update existing location
await locationDataManager.insertLocation("workflow-123", {
  id: "loc-1", // Same ID
  name: "Updated Name",
  city: "New York", // New field added
})

// Result: Merged location with updated name and new city field
const { locations } = await locationDataManager.getLocations("workflow-123")
console.log(locations[0])
// {
//   id: "loc-1",
//   name: "Updated Name",
//   address: "123 Main St",
//   city: "New York",
//   quality: "partial"
// }
```

## Storage System

### File Structure

```
{PATHS.memory}/location-data/
├── workflow-123.json
├── workflow-456.json
├── workflow-789.json
└── ...
```

### Workflow Data Format

```json
{
  "workflowInvocationId": "workflow-123",
  "locations": [
    {
      "id": "loc-1",
      "name": "Main Office",
      "address": "123 Main St",
      "city": "New York",
      "country": "USA",
      "quality": "partial",
      "metadata": {
        "createdAt": "2024-01-15T10:30:00.000Z",
        "source": "manual_entry"
      }
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "stats": {
    "totalLocations": 1,
    "qualityBreakdown": {
      "complete": 0,
      "partial": 1,
      "minimal": 0
    }
  }
}
```

### Directory Management

```typescript
// Automatic directory creation
const dataDir = path.join(PATHS.memory, "location-data")
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// File naming convention
const fileName = `${workflowInvocationId}.json`
const filePath = path.join(dataDir, fileName)
```

## Validation System

### Input Validation

```typescript
// WorkflowInvocationId validation
const workflowIdSchema = z
  .string()
  .min(1, "Workflow ID cannot be empty")
  .refine((id) => !id.includes(".."), "No path traversal characters")
  .refine((id) => !id.includes("/"), "No path separators")

// Location data validation
const locationSchema = z.object({
  id: z.string().min(1, "Location ID is required"),
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().nullish(),
  email: z.string().email()nullish(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  opening_times: z
    .object({
      sunday: z.string().optional(),
      monday: z.string().optional(),
      tuesday: z.string().optional(),
      wednesday: z.string().optional(),
      thursday: z.string().optional(),
      friday: z.string().optional(),
      saturday: z.string().optional(),
    })
    .optional(),
  owner_imgs: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional(),
})
```

### Quality Assessment Algorithm

```typescript
function assessQuality(location: LocationData): DataQuality {
  const detailFields = [
    location.address,
    location.city,
    location.country,
    location.postcode,
    location.latitude && location.longitude ? "coordinates" : null,
  ].filter((field) => field !== null && field !== undefined)

  if (detailFields.length >= 4) return DataQuality.COMPLETE
  if (detailFields.length >= 2) return DataQuality.PARTIAL
  return DataQuality.MINIMAL
}
```

## Error Handling

### Validation Errors

```typescript
// Invalid workflow ID
{
  success: false,
  error: "Invalid workflow ID: cannot contain path separators",
  details: { field: "workflowInvocationId", value: "workflow/../123" }
}

// Invalid location data
{
  success: false,
  error: "Location validation failed",
  details: {
    locationId: "loc-1",
    errors: [
      "Location name is required",
      "Invalid email format"
    ]
  }
}
```

### Operation Results

```typescript
interface InsertResult {
  success: boolean
  locationCount: number // Total after operation
  processed: number // Successfully processed
  failed: number // Failed in batch
  warnings?: string[] // Quality warnings
  errors?: string[] // Per-location errors
}

interface GetResult {
  success: boolean
  locations: LocationData[]
  totalCount: number
  qualityBreakdown: {
    complete: number
    partial: number
    minimal: number
  }
}
```

### Graceful Degradation

```typescript
// Missing workflow file
const result = await locationDataManager.getLocations("nonexistent-workflow")
console.log(result)
// {
//   success: true,
//   locations: [],
//   totalCount: 0,
//   qualityBreakdown: { complete: 0, partial: 0, minimal: 0 }
// }

// Partial validation failure
const insertResult = await locationDataManager.insertLocations("workflow-123", [
  { id: "loc-1", name: "Valid Location" },
  { id: "loc-2", name: "" }, // Invalid
  { id: "loc-3", name: "Another Valid" },
])
// Only valid locations processed, detailed error reporting
```

## Performance Considerations

### Single File Per Workflow

- Fast data access for individual workflows
- Minimal memory footprint
- Efficient JSON parsing for typical dataset sizes

### Atomic Operations

- All changes applied in memory before persistence
- Single write operation maintains data integrity
- No partial state corruption

### Directory Scaling

- Flat directory structure scales to many workflows
- File naming prevents collisions
- OS-level file caching optimizes repeated access

## Integration Examples

### Workflow Integration

```typescript
// In workflow node
const locations = await tools.locationDataManager.getLocations(workflowId)

// Process locations
const processedData = locations.map((loc) => ({
  ...loc,
  processed: true,
  processedAt: new Date().toISOString(),
}))

// Update with processed data
await tools.locationDataManager.insertLocations(workflowId, processedData)
```

### Data Migration

```typescript
// Migrate from old format
async function migrateWorkflowData(workflowId: string, oldData: any[]) {
  const newLocations = oldData.map((item) => ({
    id: item.location_id,
    name: item.location_name,
    address: item.full_address,
    city: item.city_name,
    country: item.country_code,
    metadata: {
      migrated: true,
      originalId: item.id,
    },
  }))

  await locationDataManager.insertLocations(workflowId, newLocations)
}
```

### Quality Monitoring

```typescript
// Monitor data quality across workflows
async function getQualityReport(workflowIds: string[]) {
  const reports = await Promise.all(
    workflowIds.map(async (id) => {
      const { locations } = await locationDataManager.getLocations(id)
      const qualityBreakdown = locations.reduce(
        (acc, loc) => {
          acc[loc.quality || "minimal"]++
          return acc
        },
        { complete: 0, partial: 0, minimal: 0 }
      )

      return { workflowId: id, ...qualityBreakdown }
    })
  )

  return reports
}
```

## Best Practices

1. **Unique IDs**: Always use unique, stable IDs for locations
2. **Batch Operations**: Use batch insert for multiple locations
3. **Quality Monitoring**: Check quality warnings and improve data
4. **Validation First**: Validate data before processing
5. **Error Handling**: Handle validation errors gracefully
6. **Atomic Updates**: Use atomic operations for consistency
7. **Workflow Isolation**: Keep workflow data separate

## Troubleshooting

### Common Issues

#### Issue: Location not found after insert

**Solution**: Check validation errors and ID uniqueness

```typescript
const result = await locationDataManager.insertLocation(workflowId, location)
if (!result.success) {
  console.log("Insert failed:", result.errors)
}
```

#### Issue: Quality warnings

**Solution**: Add more detail fields to improve quality score

```typescript
// Instead of minimal data
{ id: "loc-1", name: "Store" }

// Provide more details
{
  id: "loc-1",
  name: "Store",
  address: "123 Main St",
  city: "New York",
  country: "USA",
  postcode: "10001"
}
```

#### Issue: Merge conflicts

**Solution**: Use explicit ID management

```typescript
// Ensure unique IDs
const locationId = `${workflowId}-${Date.now()}-${Math.random()}`
await locationDataManager.insertLocation(workflowId, {
  id: locationId,
  name: "New Location",
})
```

## Future Enhancements

- **Search Functionality**: Full-text search across locations
- **Geospatial Queries**: Location-based filtering and sorting
- **Export Formats**: CSV, GeoJSON, KML export options
- **Data Validation**: Advanced validation rules and constraints
- **Performance Optimization**: Indexing for large datasets
- **Backup/Restore**: Automated backup and restore capabilities
