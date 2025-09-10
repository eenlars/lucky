import { supabase } from "@core/utils/clients/supabase/client"
import type { Tables, TablesInsert } from "@lucky/shared"

export type DataSet = Tables<"DataSet">
export type DatasetRecord = Tables<"DatasetRecord">
export type DataSetInsert = TablesInsert<"DataSet">
export type DatasetRecordInsert = TablesInsert<"DatasetRecord">

export async function createDataSet(data: {
  name: string
  description?: string
  data_format?: string
}): Promise<DataSet> {
  const { data: result, error } = await supabase
    .from("DataSet")
    .insert({
      name: data.name,
      description: data.description,
      data_format: data.data_format,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create dataset: ${error.message}`)
  return result
}

export async function createDatasetRecord(data: {
  dataset_id: string
  workflow_input?: string
  ground_truth?: any
  output_schema_json?: any
  rubric?: any
}): Promise<DatasetRecord> {
  const { data: result, error } = await supabase
    .from("DatasetRecord")
    .insert({
      dataset_id: data.dataset_id,
      workflow_input: data.workflow_input,
      ground_truth: data.ground_truth,
      output_schema_json: data.output_schema_json,
      rubric: data.rubric,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create dataset record: ${error.message}`)
  return result
}

export async function getDataSet(dataset_id: string): Promise<DataSet | null> {
  const { data, error } = await supabase
    .from("DataSet")
    .select("*")
    .eq("dataset_id", dataset_id)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // Not found
    throw new Error(`Failed to get dataset: ${error.message}`)
  }
  return data
}

export async function listDataSets(): Promise<DataSet[]> {
  const { data, error } = await supabase
    .from("DataSet")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Failed to list datasets: ${error.message}`)
  return data || []
}

export async function getDatasetRecords(dataset_id: string): Promise<DatasetRecord[]> {
  const { data, error } = await supabase
    .from("DatasetRecord")
    .select("*")
    .eq("dataset_id", dataset_id)
    .order("created_at", { ascending: true })

  if (error) throw new Error(`Failed to get dataset records: ${error.message}`)
  return data || []
}