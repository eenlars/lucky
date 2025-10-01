import { promises as fs } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { DataQuality, type PartialLocationData } from "../../../../packages/tools/src/schemas/location.types"
import { LocationDataManager } from "../mainLocationDataManager"
// create a test-specific location data manager that uses a temp directory
class TestLocationDataManager extends LocationDataManager {
  private readonly testDataDir = join(tmpdir(), "location-data-test")

  constructor() {
    super()
    // override the private dataDir property by accessing it through any
    ;(this as any).dataDir = this.testDataDir
  }

  async cleanup() {
    try {
      await fs.rm(this.testDataDir, { recursive: true, force: true })
    } catch {
      // directory doesn't exist, that's fine
    }
  }

  getUniqueWorkflowId(): string {
    return `test-workflow-b-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

describe("LocationDataManager", () => {
  const manager = new TestLocationDataManager()

  beforeEach(async () => {
    // clean up any existing test data
    await manager.cleanup()
  })

  afterEach(async () => {
    // clean up test data
    await manager.cleanup()
  })

  test("should insert a single location successfully", async () => {
    const testWorkflowId = manager.getUniqueWorkflowId()
    const testLocation = {
      id: "loc-001",
      name: "test coffee shop",
      address: "123 main st",
      city: "san francisco",
      country: "usa",
      postcode: "94102",
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      opening_times: null,
      owner_imgs: [],
      quality: DataQuality.PARTIAL,
      metadata: {},
      domain: null,
    }

    const result = await manager.insertLocation(testWorkflowId, testLocation)

    expect(result.success).toBe(true)
    expect(result.locationCount).toBe(1)
    expect(result.warnings).toBeUndefined()
  })

  test("should insert multiple locations successfully", async () => {
    const testWorkflowId = manager.getUniqueWorkflowId()
    const testLocations = [
      {
        id: "loc-001",
        name: "coffee shop a",
        address: "123 main st",
        city: "san francisco",
        country: "usa",
        postcode: "94102",
        coordinates: { latitude: 37.7749, longitude: -122.4194 },
        opening_times: null,
        owner_imgs: [],
        quality: DataQuality.PARTIAL,
        metadata: {},
        domain: null,
      },
      {
        id: "loc-002",
        name: "coffee shop b",
        address: "456 oak st",
        city: "san francisco",
        country: "usa",
        postcode: "94103",
        coordinates: { latitude: 37.7849, longitude: -122.4094 },
        opening_times: null,
        owner_imgs: [],
        quality: DataQuality.PARTIAL,
        metadata: {},
        domain: null,
      },
    ]

    const result = await manager.insertLocations(testWorkflowId, testLocations)

    expect(result.success).toBe(true)
    expect(result.locationCount).toBe(2)
    expect(result.processed).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.errors).toBeUndefined()
  })

  test("should retrieve inserted locations", async () => {
    const testWorkflowId = manager.getUniqueWorkflowId()
    const testLocation: PartialLocationData = {
      id: "loc-001",
      name: "test restaurant",
      address: "789 pine st",
      city: "oakland",
      country: "usa",
      postcode: "94607",
      coordinates: { latitude: 37.8044, longitude: -122.2711 },
      opening_times: null,
      owner_imgs: [],
      quality: DataQuality.PARTIAL,
      metadata: {},
      domain: null,
    }

    // insert location
    await manager.insertLocation(testWorkflowId, testLocation)

    // retrieve locations
    const result = await manager.getLocations(testWorkflowId)

    expect(result.success).toBe(true)
    expect(result.locations).toHaveLength(1)
    expect(result.locations[0].id).toBe("loc-001")
    expect(result.locations[0].name).toBe("test restaurant")
    expect(result.locations[0].city).toBe("oakland")
  })

  test("should update existing location when inserting duplicate id", async () => {
    const testWorkflowId = manager.getUniqueWorkflowId()
    const originalLocation = {
      id: "loc-001",
      name: "original name",
      address: "123 main st",
      city: "san francisco",
      country: "usa",
      postcode: "",
      coordinates: null,
      opening_times: null,
      owner_imgs: [],
      quality: DataQuality.MINIMAL,
      metadata: {},
      domain: null,
    }

    const updatedLocation = {
      id: "loc-001",
      name: "updated name",
      address: "123 main st",
      city: "san francisco",
      country: "usa",
      postcode: "94102",
      coordinates: null,
      opening_times: null,
      owner_imgs: [],
      quality: DataQuality.PARTIAL,
      metadata: {},
      domain: null,
    }

    // insert original
    await manager.insertLocation(testWorkflowId, originalLocation)

    // insert update
    await manager.insertLocation(testWorkflowId, updatedLocation)

    // verify update
    const result = await manager.getLocations(testWorkflowId)
    expect(result.locations).toHaveLength(1)
    expect(result.locations[0].name).toBe("updated name")
    expect(result.locations[0].postcode).toBe("94102")
  })

  test("should return empty array for non-existent workflow", async () => {
    const result = await manager.getLocations("non-existent-workflow")

    expect(result.success).toBe(false)
    expect(result.locations).toEqual([])
  })

  test("should generate minimal summary", async () => {
    const testWorkflowId = manager.getUniqueWorkflowId()
    const testLocations = [
      {
        id: "loc-001",
        name: "place a",
        address: "123 main st",
        city: "san francisco",
        country: "usa",
        postcode: "",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        quality: DataQuality.MINIMAL,
        metadata: {},
        domain: null,
      },
      {
        id: "loc-002",
        name: "place b",
        address: "456 oak st",
        city: "oakland",
        country: "usa",
        postcode: "",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        quality: DataQuality.MINIMAL,
        metadata: {},
        domain: null,
      },
    ]

    await manager.insertLocations(testWorkflowId, testLocations)

    const result = await manager.getMinimalSummary(testWorkflowId)

    expect(result.success).toBe(true)
    expect(result.summary).toContain("2 locations")
    expect(result.summary).toContain("123 main st, san francisco")
    expect(result.summary).toContain("456 oak st, oakland")
  })

  test("should handle locations without IDs correctly", async () => {
    const workflowId = manager.getUniqueWorkflowId()

    // locations without IDs like in the Albert Heijn case
    const locations = [
      {
        name: "Albert Heijn",
        address: "Hinthamerstraat 58, 5211 ME Den Bosch, Netherlands",
        city: "Den Bosch",
        country: "Netherlands",
        postcode: "5211 ME",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
      {
        name: "Albert Heijn",
        address: "Muntelstraat 1, 5211 EN Den Bosch, Netherlands",
        city: "Den Bosch",
        country: "Netherlands",
        postcode: "5211 EN",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
      {
        name: "Albert Heijn",
        address: "Vughterstraat 20, 5211 GH Den Bosch, Netherlands",
        city: "Den Bosch",
        country: "Netherlands",
        postcode: "5211 GH",
        coordinates: null,
        opening_times: null,
        owner_imgs: [],
        metadata: {},
        domain: null,
      },
    ]

    const result = await manager.insertLocations(workflowId, locations)
    expect(result.success).toBe(true)
    expect(result.processed).toBe(3)
    expect(result.locationCount).toBe(3) // should be 3, not 1

    const retrieved = await manager.getLocations(workflowId)
    expect(retrieved.success).toBe(true)
    expect(retrieved.locations).toHaveLength(3)

    // verify all have unique generated IDs
    const ids = retrieved.locations.map(loc => loc.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(3)
  })
})
