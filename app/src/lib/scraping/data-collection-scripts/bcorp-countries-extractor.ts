import { extractCountriesOperation } from "@/lib/scrape-countries-operation"
import { slugifyBCorp, toDomain } from "@/lib/scraping/data-collection-scripts/utils"
import { saveInLoc } from "@core/utils/fs/fileSaver"
import { lgg } from "@core/utils/logging/Logger"
import { PATHS } from "@examples/settings/constants"
import { csv } from "@lucky/shared"
import crypto from "crypto"
import fs from "fs"
const { CSVLoader } = csv

// how to run:
// tsx src/lib/count-bcorps/bcorp-countries-extractor.ts

/* ────────────────────────────────────────────────────────────────── helpers ───── */
const B_CORP_ROOT = "https://www.bcorporation.net/en-us/find-a-b-corp/company/"
const INPUT_CSV = PATHS.app + "/src/examples/evaluation/input.csv"

// progress tracking files
const PROGRESS_FILE = PATHS.node.logging + "/backup/bcorp-countries-extractor/countries-extractor-progress.json"
const RESULTS_FILE = PATHS.node.logging + "/backup/bcorp-countries-extractor/bcorp-countries-data.json"
const ERRORS_FILE = PATHS.node.logging + "/backup/bcorp-countries-extractor/bcorp-countries-errors.json"
const BACKUP_DIR = PATHS.node.logging + "/backup/bcorp-countries-extractor"

interface CountryExtractionProgress {
  timestamp: string
  processId: string
  totalCompanies: number
  processedCompanies: string[] // company names that are done
  currentBatch: number
  results: CompanyCountryData[]
  errors: ExtractionError[]
}

interface ExtractionError {
  company: string
  error: string
  timestamp: string
}

interface CompanyCountryData {
  company_name: string
  website: string
  domain: string
  bcorp_url: string
  countries: string[]
  extraction_error?: string
  timestamp: string
}

/** save progress atomically to avoid corruption */
function saveProgress(progress: CountryExtractionProgress): void {
  try {
    // ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // create backup first
    const backupPath = `${BACKUP_DIR}/countries_progress_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    saveInLoc(backupPath, progress)

    // save main progress file
    saveInLoc(PROGRESS_FILE, progress)

    lgg.log(
      `💾 countries extraction progress saved: ${progress.processedCompanies.length}/${progress.totalCompanies} companies`,
    )
  } catch (error) {
    lgg.error("❌ failed to save progress:", error)
  }
}

/** save final results with backup */
function saveResults(results: CompanyCountryData[]): void {
  try {
    // ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    // create timestamped backup
    const backupPath = `${BACKUP_DIR}/countries_results_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    saveInLoc(backupPath, results)

    // save main results file
    saveInLoc(RESULTS_FILE, results)

    lgg.log(`✅ countries data saved: ${results.length} companies to ${RESULTS_FILE}`)
  } catch (error) {
    lgg.error("❌ failed to save results:", error)
  }
}

/** save error data separately for analysis */
function saveErrors(errors: ExtractionError[], errorResults: CompanyCountryData[]): void {
  try {
    // ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const errorData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: errors.length,
        totalCompaniesWithErrors: errorResults.length,
      },
      errors: errors,
      companiesWithErrors: errorResults,
    }

    // create timestamped backup
    const backupPath = `${BACKUP_DIR}/countries_errors_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    saveInLoc(backupPath, errorData)

    // save main errors file
    saveInLoc(ERRORS_FILE, errorData)

    lgg.log(
      `📝 error data saved: ${errors.length} errors and ${errorResults.length} companies with errors to ${ERRORS_FILE}`,
    )
  } catch (error) {
    lgg.error("❌ failed to save error data:", error)
  }
}

/** load existing progress or create new */
function loadProgress(totalCompanies: number): CountryExtractionProgress {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"))
      lgg.log(
        `🔄 resuming countries extraction: ${data.processedCompanies.length}/${data.totalCompanies} companies already processed`,
      )
      return data
    }
  } catch (error) {
    lgg.log("⚠️ could not load progress file, starting fresh")
  }

  return {
    timestamp: new Date().toISOString(),
    processId: crypto.randomBytes(4).toString("hex"),
    totalCompanies,
    processedCompanies: [],
    currentBatch: 0,
    results: [],
    errors: [],
  }
}

/** process companies in batches with incremental saving */
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  progress: CountryExtractionProgress,
): Promise<R[]> {
  const results: R[] = [...progress.results] as R[]

  for (let i = progress.currentBatch * batchSize; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(items.length / batchSize)

    lgg.log(`countries-extractor: processing batch ${batchNumber}/${totalBatches} (${batch.length} companies)`)

    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)

    // update progress after each batch
    progress.currentBatch = batchNumber
    progress.results = results as CompanyCountryData[]
    saveProgress(progress)

    // small delay between batches to be respectful
    if (i + batchSize < items.length) {
      lgg.log("countries-extractor: waiting 1s between batches...")
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return results
}

;(async () => {
  /* 1️⃣  load the CSV ---------------------------------------------------------- */
  lgg.log("countries-extractor: starting sustainable company countries extraction script.")
  const loader = new CSVLoader(INPUT_CSV)

  type Row = { company_name: string; website: string }
  const allRows = (await loader.loadAsJSON<Row>()).filter(r => r.company_name && r.website)
  lgg.log(`countries-extractor: loaded ${allRows.length} rows from csv.`)

  /* 1️⃣a load/create progress tracking ---------------------------------------- */
  const progress = loadProgress(allRows.length)

  // filter out already processed companies
  const rows = allRows.filter(row => !progress.processedCompanies.includes(row.company_name))

  // deduplicate rows by company name to prevent processing duplicates
  const seenCompanies = new Set<string>()
  const uniqueRows = rows.filter(row => {
    const key = row.company_name.toLowerCase().trim()
    if (seenCompanies.has(key)) {
      lgg.log(`⚠️ skipping duplicate company in CSV: ${row.company_name}`)
      return false
    }
    seenCompanies.add(key)
    return true
  })

  lgg.log(`countries-extractor: ${rows.length} companies remaining to process (${uniqueRows.length} unique).`)

  if (uniqueRows.length === 0) {
    lgg.log("✅ all countries already extracted! loading final results...")
    const finalResults = progress.results
    lgg.log(`📊 final count: ${finalResults.length} companies processed`)

    saveResults(finalResults)
    return
  }

  /* 2️⃣  extract countries for all companies ---------------------------------- */
  const BATCH_SIZE = 100 // extract countries from 5 companies at a time
  lgg.log(`countries-extractor: starting controlled batch processing (batch size: ${BATCH_SIZE}).`)

  const companyData = await processBatch<{ company_name: string; website: string }, CompanyCountryData>(
    uniqueRows, // use uniqueRows instead of rows
    BATCH_SIZE,
    async ({ company_name, website }: { company_name: string; website: string }): Promise<CompanyCountryData> => {
      lgg.log(`countries-extractor: processing company: ${company_name}`)
      const slug = slugifyBCorp(company_name)
      const bCorpUrl = `${B_CORP_ROOT}${slug}/`

      let result: CompanyCountryData

      try {
        /* extract "operates in" countries from the certification directory page */
        lgg.log(`countries-extractor: extracting countries for ${company_name}...`)
        const { countries, error: countryError } = await extractCountriesOperation(bCorpUrl)

        result = {
          company_name,
          website,
          domain: toDomain(website),
          bcorp_url: bCorpUrl,
          countries,
          extraction_error: countryError || undefined,
          timestamp: new Date().toISOString(),
        }

        if (countryError) {
          lgg.log(`countries-extractor: ⚠️ error extracting countries for ${company_name}: ${countryError}`)
        } else {
          lgg.log(
            `countries-extractor: ✅ extracted ${countries.length} countries for ${company_name}: ${countries.join(", ")}`,
          )
        }

        // mark as processed
        progress.processedCompanies.push(company_name)
      } catch (err) {
        const error = (err as Error).message
        lgg.error(`countries-extractor: ❌ fatal error processing ${company_name}: ${error}`)

        // still mark as processed to avoid infinite retry
        progress.processedCompanies.push(company_name)
        progress.errors.push({
          company: company_name,
          error,
          timestamp: new Date().toISOString(),
        })

        // create minimal result for failed company
        result = {
          company_name,
          website,
          domain: toDomain(website),
          bcorp_url: bCorpUrl,
          countries: [],
          extraction_error: error,
          timestamp: new Date().toISOString(),
        }
      }

      return result as CompanyCountryData
    },
    progress,
  )

  /* 3️⃣  save final results & show stats --------------------------------------- */
  const allResults = [...progress.results, ...companyData]

  // deduplicate final results by company name to handle any existing duplicates
  const finalResultsMap = new Map<string, CompanyCountryData>()
  for (const result of allResults) {
    const key = result.company_name.toLowerCase().trim()
    if (!finalResultsMap.has(key)) {
      finalResultsMap.set(key, result)
    } else {
      lgg.log(`⚠️ deduplicating final result for: ${result.company_name}`)
    }
  }
  const finalResults = Array.from(finalResultsMap.values())

  // separate successful results from error results
  const successfulResults = finalResults.filter(result => !result.extraction_error)
  const errorResults = finalResults.filter(result => result.extraction_error)

  lgg.log("countries-extractor: finished all processing. saving final results.")
  lgg.log(`📊 processed ${finalResults.length} companies total`)
  lgg.log(`✅ successful extractions: ${successfulResults.length}`)
  lgg.log(`❌ encountered ${progress.errors.length} errors (${errorResults.length} companies with extraction errors)`)

  // save successful results
  saveResults(successfulResults)

  // save error data separately if there are any errors
  if (progress.errors.length > 0 || errorResults.length > 0) {
    saveErrors(progress.errors, errorResults)
  }

  // also log sample for console viewing
  lgg.log("📋 sample successful results:")
  lgg.log(JSON.stringify(successfulResults.slice(0, 3), null, 2))

  if (errorResults.length > 0) {
    lgg.log("📋 sample error results:")
    lgg.log(JSON.stringify(errorResults.slice(0, 3), null, 2))
  }

  lgg.log(
    `✅ countries-extractor completed successfully! results saved to ${RESULTS_FILE}, errors saved to ${ERRORS_FILE}`,
  )
})().catch(err => {
  lgg.error("countries-extractor: fatal error:", err)
  process.exit(1)
})
