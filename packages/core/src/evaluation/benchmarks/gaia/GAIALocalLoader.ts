import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { GAIAInstance } from "@core/workflow/ingestion/ingestion.types"

/**
 * Local GAIA dataset loader that reads from cached JSON files
 * This avoids the need for API calls and Python dependencies at runtime
 */
export class GAIALocalLoader {
  private static dataDir = join(dirname(fileURLToPath(import.meta.url)), "output")
  private static cache: Map<string, GAIAInstance[]> = new Map()

  // Configuration switches (should match GAIALoader)
  private static readonly SKIP_INSTANCES_WITH_FILES = true // Set to false to include instances with files

  /**
   * Load a split's data from JSON file
   */
  private static loadSplit(split: "validation" | "test"): GAIAInstance[] {
    // Check cache first
    if (GAIALocalLoader.cache.has(split)) {
      return GAIALocalLoader.cache.get(split)!
    }

    const filePath = join(GAIALocalLoader.dataDir, `${split}.json`)

    if (!existsSync(filePath)) {
      throw new Error(
        `GAIA ${split} data not found. Please run: bun tsx core/src/evaluation/benchmarks/gaia/download_gaia.ts`,
      )
    }

    try {
      const data = JSON.parse(readFileSync(filePath, "utf-8"))
      GAIALocalLoader.cache.set(split, data)
      return data
    } catch (error) {
      throw new Error(`Failed to load GAIA ${split} data: ${error}`)
    }
  }

  /**
   * Fetch a specific GAIA instance by task ID
   */
  static fetchById(taskId: string, split: "validation" | "test" = "validation"): GAIAInstance {
    const data = GAIALocalLoader.loadSplit(split)

    const instance = data.find(item => item.task_id === taskId)

    if (!instance) {
      throw new Error(`GAIA instance ${taskId} not found in ${split} split`)
    }

    // Skip if instance has a file and we're configured to skip files
    if (GAIALocalLoader.SKIP_INSTANCES_WITH_FILES && instance.file_name) {
      throw new Error(
        `GAIA instance ${taskId} has an associated file (${instance.file_name}) and SKIP_INSTANCES_WITH_FILES is enabled`,
      )
    }

    return instance
  }

  /**
   * Fetch instances by difficulty level
   */
  static fetchByLevel(level: 1 | 2 | 3, split: "validation" | "test" = "validation", limit = 10): GAIAInstance[] {
    const data = GAIALocalLoader.loadSplit(split)

    const filtered = data
      .filter(item => {
        // Filter out special task
        if (item.task_id === "0-0-0-0-0") return false

        // Filter by level
        if (item.Level !== level) return false

        // Skip if instance has a file and we're configured to skip files
        if (GAIALocalLoader.SKIP_INSTANCES_WITH_FILES && item.file_name) return false

        return true
      })
      .slice(0, limit)

    return filtered
  }

  /**
   * Get random instances from a split
   */
  static fetchRandom(count: number, split: "validation" | "test" = "validation"): GAIAInstance[] {
    const data = GAIALocalLoader.loadSplit(split)

    // Filter out special task and instances with files if configured
    const available = data.filter(item => {
      if (item.task_id === "0-0-0-0-0") return false
      if (GAIALocalLoader.SKIP_INSTANCES_WITH_FILES && item.file_name) return false
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
        const data = GAIALocalLoader.loadSplit(s)

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
    const validationPath = join(GAIALocalLoader.dataDir, "validation.json")
    return existsSync(validationPath)
  }
}
