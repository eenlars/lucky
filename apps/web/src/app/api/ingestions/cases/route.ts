import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { createClient } from "@/lib/supabase/server"
import { IngestionLayer } from "@lucky/core/workflow/ingestion/IngestionLayer"
import type { EvaluationInput } from "@lucky/core/workflow/ingestion/ingestion.types"
import { type NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult) return authResult

  // Ensure core is initialized
  ensureCoreInit()

  const supabase = await createClient()

  const body = await handleBody("ingestions/cases", req)
  if (isHandleBodyError(body)) return body

  const { datasetId } = body as { datasetId: string }
  if (!datasetId) {
    return fail("ingestions/cases", "Missing datasetId", { code: "MISSING_DATASET_ID", status: 400 })
  }

  try {

    const bucket = "input"
    const manifestPath = `ingestions/${datasetId}.json`
    const { data: manifestBlob, error: manifestError } = await supabase.storage.from(bucket).download(manifestPath)
    if (manifestError || !manifestBlob) {
      return fail("ingestions/cases", `Manifest not found for ${datasetId}`, {
        code: "MANIFEST_NOT_FOUND",
        status: 404,
      })
    }

    const manifest = JSON.parse(await manifestBlob.text()) as {
      folder: string
      type: string
    }

    const metaPath = `${manifest.folder}/meta.json`
    const { data: metaBlob, error: metaError } = await supabase.storage.from(bucket).download(metaPath)
    if (metaError || !metaBlob) {
      return fail("ingestions/cases", `meta.json not found for ${datasetId}`, {
        code: "META_NOT_FOUND",
        status: 404,
      })
    }
    const meta = JSON.parse(await metaBlob.text()) as any

    // Build EvaluationInput expected by IngestionLayer
    let evaluation: EvaluationInput
    if (meta.type === "csv") {
      // Prefer downloading to a local temp file to avoid public access requirements
      const { data: csvBlob, error: csvErr } = await supabase.storage.from(bucket).download(meta.file.path)
      if (csvErr || !csvBlob) {
        return fail("ingestions/cases", "Failed to download CSV", {
          code: "CSV_DOWNLOAD_ERROR",
          status: 500,
        })
      }
      const arrayBuffer = await csvBlob.arrayBuffer()
      const dir = join(tmpdir(), "ingestions")
      try {
        mkdirSync(dir, { recursive: true })
      } catch {}
      const localPath = join(dir, `${datasetId}-${meta.file.name}`)
      writeFileSync(localPath, Buffer.from(arrayBuffer))
      evaluation = {
        type: "csv",
        inputFile: localPath,
        goal: meta.goal || "",
        evaluation: meta.evaluation || undefined,
        onlyIncludeInputColumns: meta.onlyIncludeInputColumns || undefined,
        workflowId: "adhoc-ui",
      }
    } else if (meta.type === "text") {
      // Download the text data file
      const { data: textBlob, error: textErr } = await supabase.storage.from(bucket).download(meta.file.path)
      if (textErr || !textBlob) {
        return fail("ingestions/cases", "Failed to download text data", {
          code: "TEXT_DOWNLOAD_ERROR",
          status: 500,
        })
      }
      const textData = JSON.parse(await textBlob.text())
      evaluation = {
        type: "text",
        question: textData.question || "",
        answer: textData.answer || "",
        goal: textData.goal || meta.goal || "",
        workflowId: "adhoc-ui",
      }
    } else {
      return fail("ingestions/cases", "Unsupported ingestion type", {
        code: "UNSUPPORTED_TYPE",
        status: 400,
      })
    }

    const cases = await IngestionLayer.convert(evaluation)
    return alrighty("ingestions/cases", {
      success: true,
      cases: cases as any,
    })
  } catch (_error) {
    return fail("ingestions/cases", "Internal server error", { code: "INTERNAL_ERROR", status: 500 })
  }
}

// Utility: best-effort public URL builder (anon client). If RLS blocks, user must configure bucket public.
// Note: kept for reference (not used when we download to tmp file). Using ts-expect-error satisfies lints only when we actually need it.
async function _getPublicTempUrl(_bucket: string, _path: string): Promise<string> {
  // Intentionally unused; return original path as a no-op.
  return _path
}
