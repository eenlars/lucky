import { supabase } from "@/lib/supabase"
import type { DatasetMeta, WorkflowIO } from "./types"

const BUCKET = "input"

function metaPath(datasetId: string) {
  return `ingestions/${datasetId}/meta.json`
}

export async function loadDatasetMeta(datasetId: string): Promise<DatasetMeta> {
  const { data, error } = await supabase.storage.from(BUCKET).download(metaPath(datasetId))

  if (error || !data) {
    throw new Error("NOT_FOUND")
  }

  const text = await data.text()
  const raw = JSON.parse(text) as Partial<DatasetMeta>

  return {
    datasetId,
    goal: raw.goal ?? "",
    ios: Array.isArray(raw.ios) ? (raw.ios as WorkflowIO[]) : [],
    evaluation: raw.evaluation,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    type: (raw as any).type,
    file: (raw as any).file,
    onlyIncludeInputColumns: (raw as any).onlyIncludeInputColumns,
  }
}

export async function saveDatasetMeta(meta: DatasetMeta): Promise<void> {
  const json = JSON.stringify(meta, null, 2)
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(metaPath(meta.datasetId), new Blob([json], { type: "application/json" }), {
      contentType: "application/json",
      upsert: true,
    })
  if (error) throw new Error(error.message)
}
