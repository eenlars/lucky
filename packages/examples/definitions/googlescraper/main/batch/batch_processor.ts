import type { ProxyResponse } from "../../utils/proxies"
import type { LocationMapLink, ProcessFailure } from "../data_manager"
import { type SearchInput, searchGoogleMaps } from "../main"

export type ProcessResult = {
  skipped: boolean
  businesses: any[]
  error?: boolean
  failure?: ProcessFailure
}

export type BatchProcessorConfig = {
  proxyCount: number
  resultCount: number
  isMultipleEnabled: boolean
}

export class BatchProcessor {
  private proxyCount: number
  private resultCount: number
  private isMultipleEnabled: boolean

  constructor(config: BatchProcessorConfig) {
    this.proxyCount = config.proxyCount
    this.resultCount = config.resultCount
    this.isMultipleEnabled = config.isMultipleEnabled
  }

  async processLocation(
    location: LocationMapLink,
    _proxy: ProxyResponse,
    processedLocationIds: Set<number>,
  ): Promise<ProcessResult> {
    // skip if already processed
    if (processedLocationIds.has(location.location_id)) {
      return { skipped: true, businesses: [] }
    }

    const input: SearchInput = this.isMultipleEnabled
      ? {
          mode: "multiple",
          query: location.link,
          resultCount: this.resultCount,
        }
      : {
          mode: "url",
          url: location.link,
        }

    const { output, success } = await searchGoogleMaps(input)

    if (!success) {
      return {
        skipped: false,
        businesses: [],
        error: true,
        failure: {
          location_id: location.location_id,
          url: location.link,
          timestamp: new Date().toISOString(),
          error_message: typeof output === "string" ? output : JSON.stringify(output),
        },
      }
    }

    const { businesses } = output

    // append new businesses with location info
    const businessesWithLocation = businesses.map(business => ({
      ...business,
      sourceLocation: location,
      scrapedAt: new Date().toISOString(),
    }))

    return { skipped: false, businesses: businessesWithLocation, error: false }
  }

  async processBatch(
    locations: LocationMapLink[],
    proxies: ProxyResponse[],
  ): Promise<{
    newBusinesses: any[]
    newFailures: ProcessFailure[]
    skippedCount: number
    processedCount: number
    errorCount: number
  }> {
    // create tasks array - one task per location in batch
    const tasks: Promise<ProcessResult>[] = []

    locations.forEach((location, index) => {
      tasks.push(this.processLocation(location, proxies[index], new Set())) // empty set since we pre-filter
    })

    // wait for all tasks to complete
    const results = await Promise.all(tasks)

    const newBusinesses: any[] = []
    const newFailures: ProcessFailure[] = []
    let skippedCount = 0
    let processedCount = 0
    let errorCount = 0

    results.forEach(result => {
      if (result.skipped) {
        skippedCount++
      } else if (result.error) {
        errorCount++
        if (result.failure) {
          newFailures.push(result.failure)
        }
      } else {
        processedCount++
        newBusinesses.push(...result.businesses)
      }
    })

    return {
      newBusinesses,
      newFailures,
      skippedCount,
      processedCount,
      errorCount,
    }
  }

  async processAllBatches(
    locations: LocationMapLink[],
    proxies: ProxyResponse[],
    onBatchComplete?: (
      batchIndex: number,
      batchSize: number,
      totalBusinesses: number,
      stats: {
        processedCount: number
        skippedCount: number
        errorCount: number
        totalFailures: number
      },
    ) => void,
  ): Promise<{
    allBusinesses: any[]
    allFailures: ProcessFailure[]
    totalStats: {
      processedCount: number
      skippedCount: number
      errorCount: number
    }
  }> {
    const allBusinesses: any[] = []
    const allFailures: ProcessFailure[] = []
    let totalProcessedCount = 0
    let totalSkippedCount = 0
    let totalErrorCount = 0

    // process in batches
    for (let i = 0; i < locations.length; i += this.proxyCount) {
      const batch = locations.slice(i, i + this.proxyCount)

      const { newBusinesses, newFailures, skippedCount, processedCount, errorCount } = await this.processBatch(
        batch,
        proxies,
      )

      allBusinesses.push(...newBusinesses)
      allFailures.push(...newFailures)
      totalProcessedCount += processedCount
      totalSkippedCount += skippedCount
      totalErrorCount += errorCount

      // call progress callback if provided
      if (onBatchComplete) {
        onBatchComplete(Math.floor(i / this.proxyCount) + 1, batch.length, allBusinesses.length, {
          processedCount: totalProcessedCount,
          skippedCount: totalSkippedCount,
          errorCount: totalErrorCount,
          totalFailures: allFailures.length,
        })
      }
    }

    return {
      allBusinesses,
      allFailures,
      totalStats: {
        processedCount: totalProcessedCount,
        skippedCount: totalSkippedCount,
        errorCount: totalErrorCount,
      },
    }
  }
}
