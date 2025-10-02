import { mkdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { requireAuth } from "@/lib/api-auth"
import { ensureCoreInit } from "@/lib/ensure-core-init"
import { supabase } from "@/lib/supabase"
import { IngestionLayer } from "@lucky/core/workflow/ingestion/IngestionLayer"
import type { EvaluationInput } from "@lucky/core/workflow/ingestion/ingestion.types"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  // Ensure core is initialized
  ensureCoreInit()

  try {
    const body = await req.json()
    const { datasetId } = body as { datasetId: string }
    if (!datasetId) {
      return NextResponse.json({ error: "Missing datasetId" }, { status: 400 })
    }

    const bucket = "input"
    const manifestPath = `ingestions/${datasetId}.json`
    const { data: manifestBlob, error: manifestError } = await supabase.storage.from(bucket).download(manifestPath)
    if (manifestError || !manifestBlob) {
      return NextResponse.json({ error: `Manifest not found for ${datasetId}` }, { status: 404 })
    }

    const manifest = JSON.parse(await manifestBlob.text()) as {
      folder: string
      type: string
    }

    const metaPath = `${manifest.folder}/meta.json`
    const { data: metaBlob, error: metaError } = await supabase.storage.from(bucket).download(metaPath)
    if (metaError || !metaBlob) {
      return NextResponse.json({ error: `meta.json not found for ${datasetId}` }, { status: 404 })
    }
    const meta = JSON.parse(await metaBlob.text()) as any

    // Build EvaluationInput expected by IngestionLayer
    let evaluation: EvaluationInput
    if (meta.type === "csv") {
      // Prefer downloading to a local temp file to avoid public access requirements
      const { data: csvBlob, error: csvErr } = await supabase.storage.from(bucket).download(meta.file.path)
      if (csvErr || !csvBlob) {
        return NextResponse.json({ error: "Failed to download CSV" }, { status: 500 })
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
        return NextResponse.json({ error: "Failed to download text data" }, { status: 500 })
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
      return NextResponse.json({ error: "Unsupported ingestion type" }, { status: 400 })
    }

    const cases = await IngestionLayer.convert(evaluation)
    return NextResponse.json({ success: true, cases })
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Utility: best-effort public URL builder (anon client). If RLS blocks, user must configure bucket public.
// Note: kept for reference (not used when we download to tmp file). Using ts-expect-error satisfies lints only when we actually need it.
async function _getPublicTempUrl(_bucket: string, _path: string): Promise<string> {
  // Intentionally unused; return original path as a no-op.
  return _path
}
