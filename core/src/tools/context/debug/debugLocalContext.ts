// run with: tsx --env-file .env src/core/memory/localContextTest.ts
import type { ContextFileInfo } from "@core/tools/context/contextStore.types"
import { lgg } from "@core/utils/logging/Logger"
import { createContextStore } from "@core/utils/persistence/memory/ContextStore"
import { nanoid } from "nanoid"

const manager = createContextStore("memory", "debug-workflow")

// Create a context file with location data
const filename = `file_${nanoid()}_amsterdam_poi.json`
await manager.set("workflow", filename, {
  name: "amsterdam_poi_locations",
  summary: "Points of interest in Amsterdam",
  data: [
    {
      id: "loc_001",
      name: "Rijksmuseum",
      coordinates: { lat: 52.36, lng: 4.8852 },
      category: "museum",
      description: "Dutch national museum",
    },
  ],
  schema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        coordinates: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lng: { type: "number" },
          },
          required: ["lat", "lng"],
        },
        category: { type: "string" },
        description: { type: "string" },
      },
      required: ["id", "name", "coordinates"],
    },
  },
  metadata: {
    coordinateSystem: "WGS84",
    dataSource: "tourist_api_v2",
  },
})

// Read the file
const contextFile = await manager.get("workflow", filename)

// Update the file - need to provide complete ContextFile object
const updatedContextFile: ContextFileInfo = {
  key: filename,
  created: new Date().toISOString(),
  summary: "Updated points of interest in Amsterdam",
  modified: new Date().toISOString(),
  size: 0,
  dataType: "object",
}
await manager.set("workflow", filename, updatedContextFile)

// List all files
const allFiles = await manager.list("workflow")

// Extract special ID from filename for query test
const specialId = filename
  .replace("file_", "")
  .replace("_amsterdam_poi.json", "")
const searchResults = await manager.get("workflow", specialId)

lgg.log("All files:", allFiles)
lgg.log("Search results:", searchResults)
lgg.log("Context file:", contextFile)
