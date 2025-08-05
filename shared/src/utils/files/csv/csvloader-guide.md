# CSV Loader Guide

## overview

the csv loader is a utility class that simplifies loading and parsing csv files in the codebase. it uses the `papaparse` library under the hood for robust csv parsing with configurable options and type safety.

## core components

### csvloader class

the main class that handles csv file operations with configurable options.

### csvloaderoptions interface

configuration options for customizing loader behavior:

- `hasHeaders`: whether the csv has header row (default: true)
- `skipEmptyLines`: skip empty lines during parsing (default: true)
- `columnMappings`: map target fields to possible column names for flexible data extraction

## key methods

### constructor

```typescript
constructor(filePath: string, options: CSVLoaderOptions = {})
```

- takes file path and optional configuration
- sets sensible defaults (headers enabled, skip empty lines)

### loadAsString()

- loads csv file as raw string content
- if headers are enabled, parses and rejoins to normalize format
- useful for getting plain text representation

### loadAsJSON<T>()

- loads csv as parsed json array with type safety
- handles header parsing automatically
- applies column mapping and row validation
- filters out invalid rows
- returns strongly-typed data array

### static factory method

```typescript
CSVLoader.fromRelativePath(relativePath: string, options?: CSVLoaderOptions)
```

- creates loader instance using path relative to the csv module
- simplifies instantiation for files near the loader

## internal logic

### column mapping

- maps flexible column names to standardized field names
- tries multiple possible column names for each target field
- enables handling csvs with varying column naming conventions

### row validation

- ensures mapped rows have at least one non-empty field
- filters out completely empty or invalid rows
- maintains data quality

## usage patterns

### basic usage

```typescript
const csvLoader = new CSVLoader("path/to/file.csv")
const data = csvLoader.loadAsJSON()
```

### with relative path

```typescript
const csvLoader = CSVLoader.fromRelativePath("simple.csv", {
  hasHeaders: true,
  skipEmptyLines: true,
})
```

### with column mapping

```typescript
const csvLoader = new CSVLoader("data.csv", {
  columnMappings: {
    name: ["Name", "Full Name", "name"],
    email: ["Email", "email", "Email Address"],
    id: ["ID", "id", "identifier"],
  },
})

const typedData = csvLoader.loadAsJSON<UserRecord>()
```

### string output

```typescript
const csvString = csvLoader.loadAsString()
// returns normalized csv string content
```

## key features

- **type-safe**: supports generic typing for loaded data
- **flexible**: handles varying csv formats through column mapping
- **robust**: built on papaparse for reliable csv parsing
- **configurable**: multiple options for different use cases
- **clean api**: simple methods for common csv operations
- **validation**: automatic filtering of invalid/empty rows

## error handling

the loader throws descriptive errors when:

- file cannot be read
- csv parsing fails
- invalid file paths provided

errors include the file path and underlying error details for debugging.

## design principles

follows codebase patterns of:

- focused, single-purpose utilities
- clear apis with strong typing
- configurable behavior through options
- environment-aware factory methods
