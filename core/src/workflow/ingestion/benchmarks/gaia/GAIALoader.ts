import { lgg } from "@core/utils/logging/Logger"
import type { GAIAInstance } from "@core/workflow/ingestion/ingestion.types"
import { GAIALocalLoader } from "./GAIALocalLoader"

export class GAIALoader {
  private static readonly DATASET = "gaia-benchmark/GAIA"
  private static readonly CONFIG = "2023"
  private static readonly BASE_URL =
    "https://datasets-server.huggingface.co/rows"

  // Configuration switches
  private static readonly SKIP_INSTANCES_WITH_FILES = true // Set to false to include instances with files

  // Check if local data is available
  private static useLocalLoader = false

  static {
    try {
      // Try to import and check if local data exists
      this.useLocalLoader = GAIALocalLoader.isDataAvailable()
      // Only log when GAIA is actually being used, not on import
    } catch {
      // Local loader not available
    }
  }

  static async fetchById(
    taskId: string,
    split: "validation" | "test" = "validation",
    authToken?: string
  ): Promise<GAIAInstance> {
    // Use local loader if available
    if (this.useLocalLoader) {
      return GAIALocalLoader.fetchById(taskId, split)
    }
    const url = new URL(this.BASE_URL)
    url.searchParams.set("dataset", this.DATASET)
    if (this.CONFIG) {
      url.searchParams.set("config", this.CONFIG)
    }
    url.searchParams.set("split", split)
    url.searchParams.set("offset", "0")
    url.searchParams.set("length", "100") // fetch in batches

    lgg.info(`Fetching GAIA instance ${taskId} from split ${split}`)

    try {
      // we'll need to paginate through results to find the specific instance
      let offset = 0
      const batchSize = 100

      while (true) {
        url.searchParams.set("offset", offset.toString())
        url.searchParams.set("length", batchSize.toString())

        const headers: HeadersInit = {}
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`
        }

        const response = await fetch(url.toString(), { headers })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              `Authentication required. GAIA is a gated dataset - please provide HF_TOKEN`
            )
          }

          // Log more details about the error
          const errorText = await response
            .text()
            .catch(() => "Unable to read error response")
          lgg.error(
            `GAIA API error: ${response.status} ${response.statusText}`,
            {
              url: url.toString(),
              errorText,
              headers: Object.fromEntries(response.headers.entries()),
            }
          )

          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          )
        }

        const data = await response.json()

        // check if we have rows
        if (!data.rows || data.rows.length === 0) {
          break
        }

        // search for our task_id in this batch
        const found = data.rows.find((item: any) => item.row.task_id === taskId)

        if (found) {
          const row = found.row

          // Skip if instance has a file and we're configured to skip files
          if (this.SKIP_INSTANCES_WITH_FILES && row.file_name) {
            // Continue searching without logging
            offset += batchSize
            continue
          }

          const instance: GAIAInstance = {
            task_id: row.task_id,
            Question: row.Question,
            Level: row.Level,
            "Final answer": row["Final answer"] || undefined,
            file_name: row.file_name || undefined,
          }

          // if there's a file, we'll need to fetch it separately
          if (instance.file_name) {
            lgg.info(
              `GAIA instance ${taskId} has associated file: ${instance.file_name}`
            )
            // file fetching would be implemented here when needed
            // for now, we just note that the file exists
          }

          return instance
        }

        // if we've fetched all rows, break
        if (data.rows.length < batchSize) {
          break
        }

        offset += batchSize
      }

      throw new Error(`GAIA instance ${taskId} not found in split ${split}`)
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error
      }

      lgg.error(`Failed to fetch GAIA instance ${taskId}:`, error)
      throw new Error(`Failed to fetch GAIA instance ${taskId}: ${error}`)
    }
  }

  static async fetchByLevel(
    level: 1 | 2 | 3,
    split: "validation" | "test" = "validation",
    limit: number = 10,
    authToken?: string
  ): Promise<GAIAInstance[]> {
    // Use local loader if available
    if (this.useLocalLoader) {
      return GAIALocalLoader.fetchByLevel(level, split, limit)
    }
    const url = new URL(this.BASE_URL)
    url.searchParams.set("dataset", this.DATASET)
    if (this.CONFIG) {
      url.searchParams.set("config", this.CONFIG)
    }
    url.searchParams.set("split", split)
    url.searchParams.set("offset", "0")
    url.searchParams.set("length", "100")

    lgg.info(`Fetching GAIA instances for level ${level} from split ${split}`)

    const instances: GAIAInstance[] = []

    try {
      let offset = 0
      const batchSize = 100

      while (instances.length < limit) {
        url.searchParams.set("offset", offset.toString())
        url.searchParams.set("length", batchSize.toString())

        const headers: HeadersInit = {}
        if (authToken) {
          headers["Authorization"] = `Bearer ${authToken}`
        }

        const response = await fetch(url.toString(), { headers })

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error(
              `Authentication required. GAIA is a gated dataset - please provide HF_TOKEN`
            )
          }

          // Log more details about the error
          const errorText = await response
            .text()
            .catch(() => "Unable to read error response")
          lgg.error(
            `GAIA API error: ${response.status} ${response.statusText}`,
            {
              url: url.toString(),
              errorText,
              headers: Object.fromEntries(response.headers.entries()),
            }
          )

          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          )
        }

        const data = await response.json()

        // check if we have rows
        if (!data.rows || data.rows.length === 0) {
          break
        }

        // filter by level and add to our collection
        for (const item of data.rows) {
          const row = item.row
          if (row.Level === level && row.task_id !== "0-0-0-0-0") {
            // Skip if instance has a file and we're configured to skip files
            if (this.SKIP_INSTANCES_WITH_FILES && row.file_name) {
              continue
            }

            instances.push({
              task_id: row.task_id,
              Question: row.Question,
              Level: row.Level,
              "Final answer": row["Final answer"] || undefined,
              file_name: row.file_name || undefined,
            })

            if (instances.length >= limit) {
              break
            }
          }
        }

        // if we've fetched all rows, break
        if (data.rows.length < batchSize) {
          break
        }

        offset += batchSize
      }

      lgg.info(`Fetched ${instances.length} GAIA instances for level ${level}`)
      return instances
    } catch (error) {
      lgg.error(`Failed to fetch GAIA instances for level ${level}:`, error)
      throw new Error(`Failed to fetch GAIA instances: ${error}`)
    }
  }
}
