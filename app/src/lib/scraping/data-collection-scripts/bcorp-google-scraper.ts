/* ---------------------------------------------------------------------------
 *  bcorp-hunter
 *
 *  For every European country, find all B-Corps that operate there,
 *  count their unique Google-Maps locations, stream raw store docs into
 *  a global `all-data.json`, and persist incremental progress so a crash
 *  or timeout can resume exactly where it left off.
 *
 *  run: tsx src/lib/count-bcorps/bcorp-hunter.ts
 * ------------------------------------------------------------------------ */

import crypto from "crypto"
import fs from "fs"
import path from "path"

import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { saveInLoc } from "@examples/code_tools/file-saver/save"
import { searchGoogleMaps } from "@examples/code_tools/googlescraper/main"
import type { GoogleMapsBusiness } from "@examples/code_tools/googlescraper/main/types/GoogleMapsBusiness"
import { PATHS } from "@examples/settings/constants"
import dayjs from "dayjs"
import { CountryInEurope, deduplicateBusinesses } from "./utils"

/* ──────────────────────────────  configuration  ─────────────────────────── */

interface HunterConfig {
  resultCount: number
  batchSize: number
  parallelLimit: number
  timeoutMs: number
  searchTimeoutMs: number
}

const CONFIG: HunterConfig = {
  resultCount: 150,
  batchSize: 5, // companies per batch
  parallelLimit: 5, // concurrent Maps look-ups *inside* a batch
  timeoutMs: 300_000, // 5 min per company
  searchTimeoutMs: 120_000, // 2 min per Maps query
}

/* ──────────────────────────────  file locations  ────────────────────────── */

const month_day = dayjs().format("YYYY-MM-DD")

const COUNTRIES_DATA_FILE = PATHS.node.logging + `/exports/${month_day}/input/bcorp-countries-data.json`

const PER_COUNTRY_DIR = PATHS.node.logging + `/exports/${month_day}/output/per-country`

const ALL_DATA_FILE = PATHS.node.logging + `/exports/${month_day}/output/all-data.json`

const BACKUP_DIR = PATHS.node.logging + `/exports/${month_day}/backup`

/* ────────────────────────────────  helpers  ─────────────────────────────── */

const nowISO = () => new Date().toISOString()

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function saveSafe(filePath: string, data: unknown): void {
  ensureDir(filePath)
  saveInLoc(filePath, data)
}

function mem(label: string) {
  const mb = (b: number) => Math.round(b / 1024 / 1024)
  const u = process.memoryUsage()
  lgg.log(`💾 ${label.padEnd(15)} rss=${mb(u.rss)} MB  heap=${mb(u.heapUsed)}/${mb(u.heapTotal)} MB`)
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function parallelLimit<T, R>(items: T[], limit: number, fn: (i: T) => Promise<R>): Promise<R[]> {
  const ret: R[] = []
  let idx = 0
  const pool: Promise<void>[] = []

  const enqueue = async () => {
    const i = idx++
    if (i >= items.length) return
    ret[i] = await fn(items[i])
    await enqueue()
  }

  for (let i = 0; i < Math.min(limit, items.length); i++) {
    pool.push(enqueue())
  }
  await Promise.all(pool)
  return ret
}

/* ───────────────────────────────  types  ────────────────────────────────── */

interface CompanyCountryData {
  company_name: string
  website: string
  domain: string
  bcorp_url: string
  countries: string[]
  extraction_error?: string
  timestamp: string
}

interface BusinessResult {
  storeName: string
  stores: GoogleMapsBusiness[] | null
  domain: string
  website: string
  bcorp_url: string
  totalUniqueStores: number
  targetCountryStores: number
  extraction_error?: string
  timestamp: string
}

interface ProcessingError {
  company: string
  error: string
  timestamp: string
}

interface ProcessingProgress {
  timestamp: string
  processId: string
  country: CountryInEurope
  totalCompanies: number
  processedCompanies: string[]
  currentBatch: number
  results: BusinessResult[]
  errors: ProcessingError[]
}

interface BusinessWithMetadata extends GoogleMapsBusiness {
  bcorp: {
    company_name: string
    domain: string
    website: string
    bcorp_url: string
  }
  country: {
    name: string
    code: string
    aliases?: string[]
  }
  processingMetadata: {
    processId: string
    batchNumber: number
    searchQuery: string
    timestamp: string
  }
}

interface AllDataFile {
  metadata: {
    lastUpdated: string
    totalBusinesses: number
    totalCountries: number
    totalBCorps: number
    processingStarted: string
    version: string
  }
  businesses: BusinessWithMetadata[]
}

/* ────────────────────────────  persistence  ─────────────────────────────── */

function progressFile(country: CountryInEurope) {
  return `${PER_COUNTRY_DIR}/${country.code.toLowerCase()}-progress.json`
}
function resultFile(country: CountryInEurope) {
  return `${PER_COUNTRY_DIR}/${country.code.toLowerCase()}-counts.json`
}

function saveProgress(p: ProcessingProgress) {
  const backup = `${BACKUP_DIR}/progress_${p.country.code}_${nowISO().replace(/[:.]/g, "-")}.json`
  saveSafe(backup, p)
  saveSafe(progressFile(p.country), p)
  lgg.log(`💾 saved progress for ${p.country.code}: ${p.processedCompanies.length}/${p.totalCompanies}`)
}

function saveResults(results: BusinessResult[], country: CountryInEurope) {
  const backup = `${BACKUP_DIR}/results_${country.code}_${nowISO().replace(/[:.]/g, "-")}.json`
  saveSafe(backup, results)
  saveSafe(resultFile(country), results)
  lgg.log(`✅ results saved: ${country.code} – ${results.length} companies`)
}

function loadProgress(total: number, country: CountryInEurope): ProcessingProgress {
  try {
    if (fs.existsSync(progressFile(country))) {
      const p = JSON.parse(fs.readFileSync(progressFile(country), "utf8"))
      p.totalCompanies = total // sync count in case dataset changed
      return p
    }
  } catch {
    /* ignore */
  }

  return {
    timestamp: nowISO(),
    processId: crypto.randomBytes(4).toString("hex"),
    country,
    totalCompanies: total,
    processedCompanies: [],
    currentBatch: 0,
    results: [],
    errors: [],
  }
}

function loadAllData(): AllDataFile {
  if (!fs.existsSync(ALL_DATA_FILE)) {
    return {
      metadata: {
        lastUpdated: "",
        totalBusinesses: 0,
        totalCountries: 0,
        totalBCorps: 0,
        processingStarted: nowISO(),
        version: "2.2.1",
      },
      businesses: [],
    }
  }
  return JSON.parse(fs.readFileSync(ALL_DATA_FILE, "utf8"))
}

function saveAllData(all: AllDataFile) {
  const backup = `${BACKUP_DIR}/all_data_${nowISO().replace(/[:.]/g, "-")}.json`
  saveSafe(backup, all)

  all.metadata.lastUpdated = nowISO()
  all.metadata.totalBusinesses = all.businesses.length
  all.metadata.totalCountries = new Set(all.businesses.map(b => b.country.code)).size
  all.metadata.totalBCorps = new Set(all.businesses.map(b => b.bcorp.company_name)).size

  saveSafe(ALL_DATA_FILE, all)
  lgg.log(`💾 all-data updated (${all.businesses?.length} stores)`)
}

/* ──────────────────────────────  core helpers  ──────────────────────────── */

function companyOperatesInCountry(company: CompanyCountryData, country: CountryInEurope) {
  const variants = [country.name.toLowerCase(), ...(country.aliases ?? []).map(a => a.toLowerCase())]
  return company.countries.some(c => variants.some(v => c.toLowerCase().includes(v)))
}

/* ───────────────────────── single-company processing  ───────────────────── */

async function handleCompany(
  company: CompanyCountryData,
  country: CountryInEurope,
  processId: string,
  batchNo: number,
): Promise<{ result: BusinessResult; stores?: BusinessWithMetadata[] }> {
  lgg.log(`🔍 ${country.code} – ${company.company_name}`)

  const query = `${company.company_name} ${country.name}`

  const gm = await Promise.race([
    searchGoogleMaps({ mode: "multiple", query, resultCount: CONFIG.resultCount }, { enableLogging: false }),
    new Promise<never>((_, r) => setTimeout(() => r(new Error("Maps timeout")), CONFIG.searchTimeoutMs)),
  ])

  if (!gm.success) {
    const fail: BusinessResult = {
      storeName: company.company_name,
      stores: null,
      domain: company.domain,
      website: company.website,
      bcorp_url: company.bcorp_url,
      totalUniqueStores: 0,
      targetCountryStores: 0,
      extraction_error: gm.error ?? "unknown error",
      timestamp: nowISO(),
    }
    return { result: fail }
  }

  const uniq = deduplicateBusinesses(gm.output.businesses ?? [])
  const good: BusinessResult = {
    stores: uniq,
    storeName: company.company_name,
    domain: company.domain,
    website: company.website,
    bcorp_url: company.bcorp_url,
    totalUniqueStores: uniq.length,
    targetCountryStores: uniq.length,
    timestamp: nowISO(),
  }

  // attach metadata before returning stores
  const storesWithMeta = uniq.map<BusinessWithMetadata>(b => ({
    ...b,
    bcorp: {
      company_name: company.company_name,
      domain: company.domain,
      website: company.website,
      bcorp_url: company.bcorp_url,
    },
    country: {
      name: country.name,
      code: country.code,
      aliases: country.aliases,
    },
    processingMetadata: {
      processId,
      batchNumber: batchNo,
      searchQuery: query,
      timestamp: nowISO(),
    },
  }))

  return { result: good, stores: storesWithMeta }
}

/* ─────────────────────────────  batching engine  ────────────────────────── */

async function processBatch(companies: CompanyCountryData[], progress: ProcessingProgress, allData: AllDataFile) {
  const batches = chunk(companies, CONFIG.batchSize)

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b]
    progress.currentBatch = b + 1
    lgg.log(`🌀  ${progress.country.code} batch ${b + 1}/${batches.length}`)

    // run with parallel limit
    const results = await parallelLimit(batch, CONFIG.parallelLimit, async company => {
      // wrap each company in its own timeout
      try {
        return await Promise.race([
          handleCompany(company, progress.country, progress.processId, b + 1),
          new Promise<{
            result: BusinessResult
            stores?: BusinessWithMetadata[]
          }>((_, r) =>
            setTimeout(
              () =>
                r({
                  result: {
                    storeName: company.company_name,
                    stores: null,
                    domain: company.domain,
                    website: company.website,
                    bcorp_url: company.bcorp_url,
                    totalUniqueStores: 0,
                    targetCountryStores: 0,
                    extraction_error: "global timeout",
                    timestamp: nowISO(),
                  },
                }),
              CONFIG.timeoutMs,
            ),
          ),
        ])
      } catch (e) {
        return {
          result: {
            storeName: company.company_name,
            stores: null,
            domain: company.domain,
            website: company.website,
            bcorp_url: company.bcorp_url,
            totalUniqueStores: 0,
            targetCountryStores: 0,
            extraction_error: (e as Error).message,
            timestamp: nowISO(),
          },
        }
      }
    })

    /* integrate results */
    for (let i = 0; i < batch.length; i++) {
      const company = batch[i]
      const { result } = results[i]
      const stores = results[i].stores

      progress.processedCompanies.push(company.company_name)
      progress.results.push(result)

      if (result.extraction_error) {
        progress.errors.push({
          company: company.company_name,
          error: result.extraction_error,
          timestamp: nowISO(),
        })
      }

      if (stores?.length) {
        if (isNir(allData.businesses)) {
          allData.businesses = []
        }
        allData.businesses.push(...stores)
      }
    }

    saveProgress(progress)
    mem(`${progress.country.code}-batch${b + 1}`)
    await new Promise(r => setTimeout(r, 1_000)) // short breather
  }
}

/* ───────────────────────────── country pipeline  ────────────────────────── */

async function processCountry(country: CountryInEurope, allCompanies: CompanyCountryData[], allData: AllDataFile) {
  lgg.log(`\n🌍  ${country.name} (${country.code})`)

  const companies = allCompanies.filter(c => companyOperatesInCountry(c, country))

  if (!companies.length) {
    lgg.log("   ∅  no relevant companies – writing empty file.")
    saveResults([], country)
    return
  }

  const progress = loadProgress(companies.length, country)

  /* prune already done */
  const todo = companies.filter(c => !progress.processedCompanies.includes(c.company_name))
  if (!todo.length && progress.results.length) {
    lgg.log("   ✔  already complete – emitting cached results.")
    saveResults(progress.results, country)
    return
  }

  await processBatch(todo, progress, allData)

  /* final dedupe & persist */
  const final = [...progress.results].reduce<Map<string, BusinessResult>>((m, r) => {
    const k = r.storeName.toLowerCase().trim()
    if (!m.has(k)) m.set(k, r)
    return m
  }, new Map())

  saveResults([...final.values()], country)
  lgg.log(`🎯 done: ${final.size}/${companies.length} companies`)
}

/* ────────────────────────────────  main  ────────────────────────────────── */

;(async () => {
  lgg.log("bcorp-hunter v2.2 starting …")

  /* 1. Input data sanity */
  if (!fs.existsSync(COUNTRIES_DATA_FILE)) {
    lgg.error(`Countries data not found at ${COUNTRIES_DATA_FILE}`)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(COUNTRIES_DATA_FILE, "utf8"))
  const companies: CompanyCountryData[] = raw.data ?? raw
  lgg.log(`📊 loaded ${companies.length} B-Corps with country data`)

  /* 2. Global store sink */
  const allData = loadAllData()

  /* 3. Walk every European country */
  // for (const country of europeanCountries) {
  const country = {
    name: "Netherlands",
    code: "NL",
    aliases: ["Netherlands, the", "Netherlands the"], // case insensitive
  }
  try {
    await processCountry(country, companies, allData)
  } catch (e) {
    lgg.error(`⚠️  failed on ${country.code}:`, e)
  }
  // }

  /* 4. Persist the master file */
  saveAllData(allData)
  mem("final")
  lgg.log("\n✅  bcorp-hunter completed successfully.")
  process.exit(0)
})().catch(e => {
  lgg.error("Fatal top-level error:", e)
  process.exit(1)
})
