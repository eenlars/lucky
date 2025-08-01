import { lgg } from "@/logger"
import { getMultipleWebshareProxiesFull } from "../../utils/proxies"
import { DataManager, type LocationMapLink } from "../data_manager"
import { BatchProcessor } from "./batch_processor"

export type BatchScraperConfig = {
  outputDir: string
  proxyCount: number
  resultCount: number
  allBusinessesFileName?: string
  failuresFileName?: string
  isMultipleEnabled: boolean // if true, will use multiple search
}

export type BatchScraperStats = {
  totalLocations: number
  alreadyProcessed: number
  previousFailures: number
  toProcess: number
  processedThisRun: number
  skippedThisRun: number
  errorsThisRun: number
  totalBusinesses: number
  totalFailures: number
}

export class BatchScraper {
  private dataManager: DataManager
  private batchProcessor: BatchProcessor
  private config: BatchScraperConfig

  constructor(config: BatchScraperConfig) {
    this.config = config
    this.dataManager = new DataManager({
      outputDir: config.outputDir,
      allBusinessesFileName: config.allBusinessesFileName,
      failuresFileName: config.failuresFileName,
    })
    this.batchProcessor = new BatchProcessor({
      proxyCount: config.proxyCount,
      resultCount: config.resultCount,
      isMultipleEnabled: config.isMultipleEnabled,
    })
  }

  async scrapeLocations(
    locations: LocationMapLink[],
    onProgress?: (stats: BatchScraperStats & { currentBatch: number }) => void
  ): Promise<BatchScraperStats> {
    lgg.log(`starting batch scraping with ${this.config.proxyCount} proxies`)

    // load existing data
    const { allBusinesses, failures } = this.dataManager.loadExistingData()
    const processedLocationIds =
      this.dataManager.getProcessedLocationIds(allBusinesses)
    const failedLocationIds = this.dataManager.getFailedLocationIds(failures)

    lgg.log(`found ${processedLocationIds.size} already processed location IDs`)
    lgg.log(
      `found ${failures.length} previous failures (${failedLocationIds.size} unique failed location IDs)`
    )
    lgg.log(`total locations to process: ${locations.length}`)

    // filter out already processed locations AND previously failed locations
    const locationsToProcess = this.dataManager.filterUnprocessedLocations(
      locations,
      processedLocationIds,
      failedLocationIds
    )

    lgg.log(
      `filtered down to ${locationsToProcess.length} unprocessed locations (excluding ${processedLocationIds.size} processed + ${failedLocationIds.size} failed)`
    )

    // get proxies for concurrent processing
    const proxies = await getMultipleWebshareProxiesFull(this.config.proxyCount)
    lgg.log(
      `got ${this.config.proxyCount} different proxies for concurrent processing:`
    )
    proxies.forEach((proxy, index) => {
      lgg.log(`  proxy ${index + 1}: ${proxy.ip}:${proxy.port}`)
    })

    // process all batches
    const {
      allBusinesses: newBusinesses,
      allFailures: newFailures,
      totalStats,
    } = await this.batchProcessor.processAllBatches(
      locationsToProcess,
      proxies,
      (batchIndex, batchSize, totalBusinesses, stats) => {
        // save data after each batch
        const updatedBusinesses = [...allBusinesses, ...newBusinesses]
        const updatedFailures = [...failures, ...newFailures]
        this.dataManager.saveData(updatedBusinesses, updatedFailures)

        lgg.log(
          `batch ${batchIndex} complete (${batchSize} locations). total businesses saved: ${updatedBusinesses.length}`
        )
        lgg.log(
          `progress: ${stats.processedCount} processed, ${stats.skippedCount} skipped, ${stats.errorCount} errors (${stats.totalFailures} total failures), current time: ${new Date().toISOString()}`
        )

        // call progress callback if provided
        if (onProgress) {
          const batchStats: BatchScraperStats & { currentBatch: number } = {
            totalLocations: locations.length,
            alreadyProcessed: processedLocationIds.size,
            previousFailures: failedLocationIds.size,
            toProcess: locationsToProcess.length,
            processedThisRun: stats.processedCount,
            skippedThisRun: stats.skippedCount,
            errorsThisRun: stats.errorCount,
            totalBusinesses: updatedBusinesses.length,
            totalFailures: updatedFailures.length,
            currentBatch: batchIndex,
          }
          onProgress(batchStats)
        }
      }
    )

    // final save
    const finalBusinesses = [...allBusinesses, ...newBusinesses]
    const finalFailures = [...failures, ...newFailures]
    this.dataManager.saveData(finalBusinesses, finalFailures)

    const finalStats: BatchScraperStats = {
      totalLocations: locations.length,
      alreadyProcessed: processedLocationIds.size,
      previousFailures: failedLocationIds.size,
      toProcess: locationsToProcess.length,
      processedThisRun: totalStats.processedCount,
      skippedThisRun: totalStats.skippedCount,
      errorsThisRun: totalStats.errorCount,
      totalBusinesses: finalBusinesses.length,
      totalFailures: finalFailures.length,
    }

    // final summary
    const filePaths = this.dataManager.getFilePaths()
    lgg.log(`final summary:`)
    lgg.log(`- total businesses: ${finalStats.totalBusinesses}`)
    lgg.log(`- total failures: ${finalStats.totalFailures}`)
    lgg.log(`- locations processed this run: ${finalStats.processedThisRun}`)
    lgg.log(`- locations skipped (already done): ${finalStats.skippedThisRun}`)
    lgg.log(`- locations with errors: ${finalStats.errorsThisRun}`)
    lgg.log(`- saved to ${filePaths.allBusinesses}`)
    lgg.log(`- failures saved to ${filePaths.failures}`)

    return finalStats
  }

  // get current stats without processing
  getStats(
    locations: LocationMapLink[]
  ): Omit<
    BatchScraperStats,
    "processedThisRun" | "skippedThisRun" | "errorsThisRun"
  > {
    const { allBusinesses, failures } = this.dataManager.loadExistingData()
    const processedLocationIds =
      this.dataManager.getProcessedLocationIds(allBusinesses)
    const failedLocationIds = this.dataManager.getFailedLocationIds(failures)
    const locationsToProcess = this.dataManager.filterUnprocessedLocations(
      locations,
      processedLocationIds,
      failedLocationIds
    )

    return {
      totalLocations: locations.length,
      alreadyProcessed: processedLocationIds.size,
      previousFailures: failedLocationIds.size,
      toProcess: locationsToProcess.length,
      totalBusinesses: allBusinesses.length,
      totalFailures: failures.length,
    }
  }
}
