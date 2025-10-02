import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { envi } from "@core/utils/env.mjs"

type GaiaRow = {
  task_id: string
  Question: string
  Level: number
  "Final answer"?: string
  file_name?: string
}

const BASE_FILES_URL = "https://huggingface.co/datasets/gaia-benchmark/GAIA/resolve/main/2023"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const OUTPUT_DIR = join(__dirname, "output")

function getAuthToken(): string {
  if (!envi.HF_TOKEN) {
    throw new Error("HF_TOKEN is not set in environment variables")
  }
  return envi.HF_TOKEN
}

async function fetchText(url: string, authToken?: string): Promise<string> {
  const headers: HeadersInit = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` - ${body}` : ""}`)
  }
  return res.text()
}

function parseJsonlToArray(text: string): GaiaRow[] {
  const rows: GaiaRow[] = []
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const item = JSON.parse(trimmed)
      const mapped: GaiaRow = {
        task_id: item.task_id,
        Question: item.Question,
        Level: Number(item.Level ?? 0),
      }
      if (item["Final answer"]) mapped["Final answer"] = String(item["Final answer"]) // keep key
      if (item.file_name) mapped.file_name = String(item.file_name)
      // Skip instances with files to align with loader default
      if (!mapped.file_name && mapped.task_id !== "0-0-0-0-0") rows.push(mapped)
    } catch {
      // skip malformed lines
    }
  }
  return rows
}

function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

function saveJSON(filename: string, data: unknown): void {
  const filepath = join(OUTPUT_DIR, filename)
  writeFileSync(filepath, JSON.stringify(data, null, 2), { encoding: "utf-8" })
}

export async function downloadGAIAMetadata(): Promise<void> {
  const token = getAuthToken()
  ensureOutputDir()

  const files: Record<string, string> = {
    validation: "validation/metadata.jsonl",
    test: "test/metadata.jsonl",
  }

  const results: Record<"validation" | "test", GaiaRow[]> = {
    validation: [],
    test: [],
  }

  for (const [split, file] of Object.entries(files)) {
    try {
      const text = await fetchText(`${BASE_FILES_URL}/${file}`, token)
      const rows = parseJsonlToArray(text)
      results[split as keyof typeof results] = rows
      saveJSON(`${split}.json`, rows)
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to download ${split} metadata:`, e?.message || e)
    }
  }

  saveJSON("metadata.json", {
    dataset: "gaia-benchmark/GAIA",
    config: "2023",
    download_method: "metadata",
    splits: ["validation", "test"],
    total_items: results.validation.length + results.test.length,
  })

  // eslint-disable-next-line no-console
  console.log(`GAIA metadata downloaded to ${OUTPUT_DIR}`)
}

if (import.meta.url === `file://${__filename}`) {
  downloadGAIAMetadata().catch(() => process.exit(1))
}
