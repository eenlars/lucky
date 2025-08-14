import { envi } from "@core/utils/env.mjs"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

type GaiaRow = {
  task_id: string
  Question: string
  Level: number
  "Final answer"?: string
  file_name?: string
}

const DATASET = "gaia-benchmark/GAIA"
const CONFIG = "2023"
const BASE_URL = "https://datasets-server.huggingface.co/rows"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_DIR = join(__dirname, "output")

function getAuthToken(): string | undefined {
  return envi.HF_TOKEN || envi.HUGGING_FACE_API_KEY
}

async function fetchBatch(
  split: "validation" | "test",
  offset: number,
  length: number,
  authToken?: string
): Promise<any> {
  const url = new URL(BASE_URL)
  url.searchParams.set("dataset", DATASET)
  url.searchParams.set("config", CONFIG)
  url.searchParams.set("split", split)
  url.searchParams.set("offset", String(offset))
  url.searchParams.set("length", String(length))

  const headers: HeadersInit = {}
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`

  const res = await fetch(url.toString(), { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`
    )
  }
  return res.json()
}

function mapRow(row: any): GaiaRow | null {
  if (!row) return null
  const out: GaiaRow = {
    task_id: row.task_id,
    Question: row.Question,
    Level: Number(row.Level ?? 0),
  }
  if (row["Final answer"]) out["Final answer"] = String(row["Final answer"]) // keep GAIA key
  if (row.file_name) out.file_name = String(row.file_name)
  return out
}

async function downloadSplit(
  split: "validation" | "test",
  limit: number,
  authToken?: string
): Promise<GaiaRow[]> {
  const batchSize = 100
  let offset = 0
  const items: GaiaRow[] = []

  while (items.length < limit) {
    const batch = await fetchBatch(split, offset, batchSize, authToken)
    const rows: any[] = Array.isArray(batch.rows) ? batch.rows : []
    if (rows.length === 0) break

    for (const r of rows) {
      const mapped = mapRow(r.row)
      if (!mapped) continue
      if (mapped.task_id === "0-0-0-0-0") continue
      // Skip instances with files to match loader default behavior
      if (mapped.file_name) continue

      items.push(mapped)
      if (items.length >= limit) break
    }

    if (rows.length < batchSize) break
    offset += batchSize
  }

  return items
}

function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

function saveJSON(filename: string, data: unknown): void {
  const filepath = join(OUTPUT_DIR, filename)
  writeFileSync(filepath, JSON.stringify(data, null, 2), { encoding: "utf-8" })
}

export async function downloadGAIA({
  validationLimit = 5_000,
  testLimit = 5_000,
}: {
  validationLimit?: number
  testLimit?: number
} = {}): Promise<void> {
  const token = getAuthToken()
  ensureOutputDir()

  try {
    const [validation, test] = await Promise.all([
      downloadSplit("validation", validationLimit, token),
      downloadSplit("test", testLimit, token),
    ])

    saveJSON("validation.json", validation)
    saveJSON("test.json", test)
    saveJSON("metadata.json", {
      dataset: DATASET,
      config: CONFIG,
      splits: ["validation", "test"],
      total_items: validation.length + test.length,
      source: "datasets-server",
    })
    // eslint-disable-next-line no-console
    console.log(`GAIA downloaded to ${OUTPUT_DIR}`)
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(
      "Failed to download GAIA via datasets-server:",
      err?.message || err
    )
    // Re-throw to allow caller to fallback (e.g., to direct method)
    throw err
  }
}

// Allow running as a script with Bun/Node
if (import.meta.url === `file://${__filename}`) {
  downloadGAIA().catch(() => process.exit(1))
}
