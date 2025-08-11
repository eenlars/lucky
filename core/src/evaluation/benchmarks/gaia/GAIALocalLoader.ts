import type { GAIAInstance } from "@core/workflow/ingestion/ingestion.types"
import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

/**
 * Local GAIA dataset loader that reads from cached JSON files
 * This avoids the need for API calls and Python dependencies at runtime
 */
export class GAIALocalLoader {
  private static dataDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "output"
  )
  private static cache: Map<string, GAIAInstance[]> = new Map()

  // Configuration switches (should match GAIALoader)
  private static readonly SKIP_INSTANCES_WITH_FILES = true // Set to false to include instances with files

  /**
   * Load a split's data from JSON file
   */
  private static loadSplit(split: "validation" | "test"): GAIAInstance[] {
    // Check cache first
    if (this.cache.has(split)) {
      return this.cache.get(split)!
    }

    const filePath = join(this.dataDir, `${split}.json`)

    if (!existsSync(filePath)) {
      throw new Error(
        `GAIA ${split} data not found. Please run: python src/core/workflow/ingestion/benchmarks/gaia/download_gaia.py`
      )
    }

    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8"))
      this.cache.set(split, data)
      return data
    } catch (error) {
      throw new Error(`Failed to load GAIA ${split} data: ${error}`)
    }
  }

  /**
   * Fetch a specific GAIA instance by task ID
   */
  static fetchById(
    taskId: string,
    split: "validation" | "test" = "validation"
  ): GAIAInstance {
    const data = this.loadSplit(split)

    const instance = data.find((item) => item.task_id === taskId)

    if (!instance) {
      throw new Error(`GAIA instance ${taskId} not found in ${split} split`)
    }

    // Skip if instance has a file and we're configured to skip files
    if (this.SKIP_INSTANCES_WITH_FILES && instance.file_name) {
      throw new Error(
        `GAIA instance ${taskId} has an associated file (${instance.file_name}) and SKIP_INSTANCES_WITH_FILES is enabled`
      )
    }

    return instance
  }

  /**
   * Fetch instances by difficulty level
   */
  static fetchByLevel(
    level: 1 | 2 | 3,
    split: "validation" | "test" = "validation",
    limit: number = 10
  ): GAIAInstance[] {
    const data = this.loadSplit(split)

    const filtered = data
      .filter((item) => {
        // Filter out special task
        if (item.task_id === "0-0-0-0-0") return false

        // Filter by level
        if (item.Level !== level) return false

        // Skip if instance has a file and we're configured to skip files
        if (this.SKIP_INSTANCES_WITH_FILES && item.file_name) return false

        return true
      })
      .slice(0, limit)

    return filtered
  }

  /**
   * Get random instances from a split
   */
  static fetchRandom(
    count: number,
    split: "validation" | "test" = "validation"
  ): GAIAInstance[] {
    const data = this.loadSplit(split)

    // Filter out special task and instances with files if configured
    const available = data.filter((item) => {
      if (item.task_id === "0-0-0-0-0") return false
      if (this.SKIP_INSTANCES_WITH_FILES && item.file_name) return false
      return true
    })

    // Shuffle and take first n items
    const shuffled = [...available].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  /**
   * Get statistics about the dataset
   */
  static getStats(split?: "validation" | "test"): {
    total: number
    byLevel: { [level: number]: number }
    hasFile: number
  } {
    const splits = split ? [split] : (["validation", "test"] as const)

    let total = 0
    const byLevel: { [level: number]: number } = { 1: 0, 2: 0, 3: 0 }
    let hasFile = 0

    for (const s of splits) {
      try {
        const data = this.loadSplit(s)

        for (const item of data) {
          if (item.task_id === "0-0-0-0-0") continue

          total++
          if (item.Level >= 1 && item.Level <= 3) {
            byLevel[item.Level]++
          }
          if (item.file_name) {
            hasFile++
          }
        }
      } catch {
        // Split not available, skip
      }
    }

    return { total, byLevel, hasFile }
  }

  /**
   * Check if data files exist
   */
  static isDataAvailable(): boolean {
    const validationPath = join(this.dataDir, "validation.json")
    return existsSync(validationPath)
  }
}
