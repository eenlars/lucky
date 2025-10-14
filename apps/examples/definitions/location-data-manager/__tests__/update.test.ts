import { promises as fs } from "node:fs"
import { join } from "node:path"
import { DataQuality, type PartialLocationData } from "@lucky/shared"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { LocationDataManager } from "../mainLocationDataManager"

describe("LocationDataManager - Update Operations", () => {
  let manager: LocationDataManager
  let testDir: string
  let testFileName: string

  beforeEach(() => {
    manager = new LocationDataManager()
    testDir = join(process.cwd(), "temp-test-location-data")
    testFileName = `test-workflow-update-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`

    // override the dataDir for testing
    ;(manager as any).dataDir = testDir
  })

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (_error) {
      // ignore cleanup errors
    }
  })

  it("should update single location with merge strategy", async () => {
    // first insert a location
    const originalLocation: PartialLocationData = {
      id: "loc-001",
      name: "Original Coffee Shop",
      address: "123 Main St",
      city: "Amsterdam",
      country: "Netherlands",
      postcode: "1000 AA",
      coordinates: null,
      opening_times: null,
      owner_imgs: [],
      metadata: { category: "cafe" },
      domain: null,
    }

    await manager.insertLocations(testFileName, [originalLocation])

    // update the location
    const updateData: PartialLocationData = {
      name: "Updated Coffee Shop",
      coordinates: { latitude: 52.3676, longitude: 4.9041 },
      metadata: { category: "restaurant", status: "open" },
    }

    const result = await manager.updateLocationById(testFileName, "loc-001", updateData, "merge")

    expect(result.success).toBe(true)
    expect(result.locationCount).toBe(1)

    // verify the update
    const locations = await manager.getLocations(testFileName)
    expect(locations.success).toBe(true)
    expect(locations.locations).toHaveLength(1)

    const updatedLocation = locations.locations[0]
    expect(updatedLocation.name).toBe("Updated Coffee Shop")
    expect(updatedLocation.address).toBe("123 Main St") // should remain unchanged
    expect(updatedLocation.coordinates).toEqual({
      latitude: 52.3676,
      longitude: 4.9041,
    })
    expect(updatedLocation.metadata.category).toBe("restaurant")
    expect(updatedLocation.metadata.status).toBe("open")
  })

  it("should update multiple locations with bulk operation", async () => {
    // insert multiple locations
    const locations: PartialLocationData[] = [
      {
        id: "loc-001",
        name: "Coffee Shop A",
        address: "123 Main St",
        city: "Amsterdam",
        country: "Netherlands",
        postcode: "1000 AA",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
      {
        id: "loc-002",
        name: "Coffee Shop B",
        address: "456 Side St",
        city: "Amsterdam",
        country: "Netherlands",
        postcode: "1000 BB",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
    ]

    await manager.insertLocations(testFileName, locations)

    // update both locations
    const updates = [
      {
        locationId: "loc-001",
        updateData: {
          name: "Updated Coffee Shop A",
          coordinates: { latitude: 52.3676, longitude: 4.9041 },
        },
        updateStrategy: "merge" as const,
      },
      {
        locationId: "loc-002",
        updateData: {
          name: "Updated Coffee Shop B",
          coordinates: { latitude: 52.37, longitude: 4.905 },
        },
        updateStrategy: "merge" as const,
      },
    ]

    const result = await manager.updateLocations(testFileName, updates)

    expect(result.success).toBe(true)
    expect(result.updated).toBe(2)
    expect(result.failed).toBe(0)

    // verify updates
    const allLocations = await manager.getLocations(testFileName)
    expect(allLocations.locations).toHaveLength(2)

    const loc1 = allLocations.locations.find(l => l.id === "loc-001")
    const loc2 = allLocations.locations.find(l => l.id === "loc-002")

    expect(loc1?.name).toBe("Updated Coffee Shop A")
    expect(loc1?.coordinates).toEqual({ latitude: 52.3676, longitude: 4.9041 })
    expect(loc2?.name).toBe("Updated Coffee Shop B")
    expect(loc2?.coordinates).toEqual({ latitude: 52.37, longitude: 4.905 })
  })

  it("should handle replace strategy correctly", async () => {
    // insert original location
    const originalLocation: PartialLocationData = {
      id: "loc-001",
      name: "Original Shop",
      address: "123 Main St",
      city: "Amsterdam",
      country: "Netherlands",
      postcode: "1000 AA",
      coordinates: { latitude: 52.3676, longitude: 4.9041 },
      opening_times: {
        monday: "9:00-17:00",
        tuesday: "9:00-17:00",
        wednesday: "9:00-17:00",
        thursday: "9:00-17:00",
        friday: "9:00-17:00",
        saturday: "10:00-16:00",
        sunday: "closed",
      },
      owner_imgs: ["image1.jpg"],
      metadata: { category: "cafe", status: "open" },
      domain: "original.com",
    }

    await manager.insertLocations(testFileName, [originalLocation])

    // replace with minimal data
    const newData: PartialLocationData = {
      name: "New Shop",
      address: "456 New St",
      city: "Rotterdam",
      country: "Netherlands",
      postcode: "2000 AA",
      coordinates: null,
      opening_times: null,
      owner_imgs: [],
      metadata: {},
      domain: null,
    }

    const result = await manager.updateLocationById(testFileName, "loc-001", newData, "replace")

    expect(result.success).toBe(true)

    // verify replacement
    const locations = await manager.getLocations(testFileName)
    const replacedLocation = locations.locations[0]

    expect(replacedLocation.id).toBe("loc-001") // ID should be preserved
    expect(replacedLocation.name).toBe("New Shop")
    expect(replacedLocation.address).toBe("456 New St")
    expect(replacedLocation.city).toBe("Rotterdam")
    expect(replacedLocation.coordinates).toBeNull()
    expect(replacedLocation.opening_times).toBeNull()
    expect(replacedLocation.owner_imgs).toEqual([])
    expect(replacedLocation.metadata).toEqual({})
    expect(replacedLocation.domain).toBeNull()
  })

  it("should handle selective strategy correctly", async () => {
    // insert original location
    const originalLocation: PartialLocationData = {
      id: "loc-001",
      name: "Original Shop",
      address: "123 Main St",
      city: "Amsterdam",
      country: "Netherlands",
      postcode: "1000 AA",
      coordinates: { latitude: 52.3676, longitude: 4.9041 },
      opening_times: null,
      owner_imgs: ["image1.jpg"],
      metadata: { category: "cafe", status: "open" },
      domain: "original.com",
    }

    await manager.insertLocations(testFileName, [originalLocation])

    // selective update with null/undefined values
    const updateData: PartialLocationData = {
      name: "Updated Shop",
      address: undefined, // should be ignored
      coordinates: null, // should be ignored (null values)
      metadata: { category: "restaurant" }, // should update
      domain: null, // should be ignored
    }

    const result = await manager.updateLocationById(testFileName, "loc-001", updateData, "selective")

    expect(result.success).toBe(true)

    // verify selective update
    const locations = await manager.getLocations(testFileName)
    const updatedLocation = locations.locations[0]

    expect(updatedLocation.name).toBe("Updated Shop") // updated
    expect(updatedLocation.address).toBe("123 Main St") // unchanged (undefined ignored)
    expect(updatedLocation.coordinates).toEqual({
      latitude: 52.3676,
      longitude: 4.9041,
    }) // unchanged (null ignored)
    expect(updatedLocation.metadata.category).toBe("restaurant") // updated
    expect(updatedLocation.domain).toBe("original.com") // unchanged (null ignored)
  })

  it("should handle non-existent location gracefully", async () => {
    const result = await manager.updateLocationById(testFileName, "non-existent-id", { name: "Test" }, "merge")

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors?.[0]).toContain("location not found")
  })

  it("should validate required fields", async () => {
    // insert location
    await manager.insertLocations(testFileName, [
      {
        id: "loc-001",
        name: "Test Shop",
        address: "123 Main St",
        city: "Amsterdam",
        country: "Netherlands",
        postcode: "1000 AA",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
    ])

    // try to update with invalid data
    const result = await manager.updateLocationById(
      testFileName,
      "loc-001",
      { name: "" }, // empty name should fail
      "merge",
    )

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors?.[0]).toContain("name cannot be empty")
  })

  it("should update quality assessment after update", async () => {
    // insert minimal location
    const minimalLocation: PartialLocationData = {
      id: "loc-001",
      name: "Minimal Shop",
      address: "",
      city: "",
      country: "",
      postcode: "",
      coordinates: null,
      opening_times: null,
      owner_imgs: [],
      metadata: {},
      domain: null,
    }

    await manager.insertLocations(testFileName, [minimalLocation])

    // update with more complete data
    const completeData: PartialLocationData = {
      address: "123 Main St",
      city: "Amsterdam",
      country: "Netherlands",
      postcode: "1000 AA",
      coordinates: { latitude: 52.3676, longitude: 4.9041 },
      opening_times: {
        monday: "9:00-17:00",
        tuesday: "9:00-17:00",
        wednesday: "9:00-17:00",
        thursday: "9:00-17:00",
        friday: "9:00-17:00",
        saturday: "10:00-16:00",
        sunday: "closed",
      },
      owner_imgs: ["image1.jpg"],
    }

    const result = await manager.updateLocationById(testFileName, "loc-001", completeData, "merge")

    expect(result.success).toBe(true)

    // verify quality improvement
    const locations = await manager.getLocations(testFileName)
    const updatedLocation = locations.locations[0]

    expect(updatedLocation.quality).toBe(DataQuality.COMPLETE)
  })

  it("should handle mixed success/failure in bulk updates", async () => {
    // insert one location
    await manager.insertLocations(testFileName, [
      {
        id: "loc-001",
        name: "Test Shop",
        address: "123 Main St",
        city: "Amsterdam",
        country: "Netherlands",
        postcode: "1000 AA",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
    ])

    // mixed updates: one valid, one invalid
    const updates = [
      {
        locationId: "loc-001",
        updateData: { name: "Updated Shop" },
        updateStrategy: "merge" as const,
      },
      {
        locationId: "non-existent",
        updateData: { name: "Non-existent Shop" },
        updateStrategy: "merge" as const,
      },
    ]

    const result = await manager.updateLocations(testFileName, updates)

    expect(result.success).toBe(true) // success because at least one update succeeded
    expect(result.updated).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors?.[0]).toContain("location not found")
  })
})
