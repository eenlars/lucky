import * as fs from "fs"
import * as path from "path"

export type LocationMapLink = {
  location_id: number
  link: string
}

export type ProcessFailure = {
  location_id: number
  url: string
  timestamp: string
  error_message?: string
}

export type DataManagerConfig = {
  outputDir: string
  allBusinessesFileName?: string
  failuresFileName?: string
}

export class DataManager {
  private outputDir: string
  private allBusinessesPath: string
  private failuresPath: string

  constructor(config: DataManagerConfig) {
    this.outputDir = config.outputDir
    this.allBusinessesPath = path.join(this.outputDir, config.allBusinessesFileName || "all_businesses.json")
    this.failuresPath = path.join(this.outputDir, config.failuresFileName || "failures.json")

    // create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  // load existing data if it exists
  loadExistingData(): { allBusinesses: any[]; failures: ProcessFailure[] } {
    let allBusinesses: any[] = []
    let failures: ProcessFailure[] = []

    if (fs.existsSync(this.allBusinessesPath)) {
      allBusinesses = JSON.parse(fs.readFileSync(this.allBusinessesPath, "utf8"))
    }

    if (fs.existsSync(this.failuresPath)) {
      failures = JSON.parse(fs.readFileSync(this.failuresPath, "utf8"))
    }

    return { allBusinesses, failures }
  }

  // get set of already processed location IDs
  getProcessedLocationIds(allBusinesses: any[]): Set<number> {
    const processedIds = new Set<number>()

    for (const business of allBusinesses) {
      if (business.sourceLocation?.location_id) {
        processedIds.add(business.sourceLocation.location_id)
      }
    }

    return processedIds
  }

  // get set of failed location IDs
  getFailedLocationIds(failures: ProcessFailure[]): Set<number> {
    const failedIds = new Set<number>()

    for (const failure of failures) {
      if (failure.location_id) {
        failedIds.add(failure.location_id)
      }
    }

    return failedIds
  }

  // save data to files
  saveData(allBusinesses: any[], failures: ProcessFailure[]): void {
    fs.writeFileSync(this.allBusinessesPath, JSON.stringify(allBusinesses, null, 2))
    fs.writeFileSync(this.failuresPath, JSON.stringify(failures, null, 2))
  }

  // filter locations to exclude already processed and failed ones
  filterUnprocessedLocations(
    locations: LocationMapLink[],
    processedIds: Set<number>,
    failedIds: Set<number>
  ): LocationMapLink[] {
    return locations.filter(
      (location) => !processedIds.has(location.location_id) && !failedIds.has(location.location_id)
    )
  }

  // get file paths for debugging/logging
  getFilePaths() {
    return {
      allBusinesses: this.allBusinessesPath,
      failures: this.failuresPath,
    }
  }
}
