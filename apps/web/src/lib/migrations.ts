import { createClient } from "@/lib/supabase/server"
import type { Json } from "@lucky/shared/client"

interface NewerFitnessData {
  data: {
    score: number
    accuracy: number
    feedback: string
    totalCostUsd: number
    totalTimeSeconds: number
  }
  success: boolean
  usdCost: number
}

interface OlderFitnessData {
  score: number
  feedback: string
  totalCost: number
  totalTime?: number
  extendedFitness?: {
    dataAccuracy?: number
    totalCostUsd?: number
    totalTimeSeconds?: number
  }
}

interface MiddleFitnessData {
  data: {
    score: number
    feedback: string
    dataAccuracy: number
    totalCostUsd: number
    totalTimeSeconds: number
  }
  success: boolean
  usdCost: number
}

type _FitnessData = NewerFitnessData | MiddleFitnessData | OlderFitnessData

function isNewerFormat(data: unknown): data is NewerFitnessData {
  if (!(data !== null && typeof data === "object" && "data" in data)) return false
  const record = data as Record<string, unknown>
  if (!(record.data !== null && typeof record.data === "object")) return false
  const innerData = record.data as Record<string, unknown>
  return (
    "score" in innerData &&
    "accuracy" in innerData &&
    typeof innerData.score === "number" &&
    typeof innerData.accuracy === "number"
  )
}

function isMiddleFormat(data: unknown): data is MiddleFitnessData {
  if (!(data !== null && typeof data === "object" && "data" in data)) return false
  const record = data as Record<string, unknown>
  if (!(record.data !== null && typeof record.data === "object")) return false
  const innerData = record.data as Record<string, unknown>
  return (
    "score" in innerData &&
    "dataAccuracy" in innerData &&
    !("accuracy" in innerData) &&
    typeof innerData.score === "number" &&
    typeof innerData.dataAccuracy === "number"
  )
}

function isOlderFormat(data: unknown): data is OlderFitnessData {
  if (!(data !== null && typeof data === "object")) return false
  const record = data as Record<string, unknown>
  return "score" in record && !("data" in record) && typeof record.score === "number"
}

function extractFitnessValues(fitnessData: unknown): {
  accuracy: number | null
  fitness: number | null
} {
  if (isNewerFormat(fitnessData)) {
    return {
      accuracy: Math.round(fitnessData.data.accuracy),
      fitness: Math.round(fitnessData.data.score),
    }
  }
  if (isMiddleFormat(fitnessData)) {
    return {
      accuracy: Math.round(fitnessData.data.dataAccuracy),
      fitness: Math.round(fitnessData.data.score),
    }
  }
  if (isOlderFormat(fitnessData)) {
    return {
      accuracy: fitnessData.extendedFitness?.dataAccuracy ? Math.round(fitnessData.extendedFitness.dataAccuracy) : null,
      fitness: Math.round(fitnessData.score),
    }
  }
  return {
    accuracy: null,
    fitness: null,
  }
}

export async function migrateFitnessToColumns() {
  const supabase = await createClient()
  console.log("Starting fitness data migration...")

  try {
    // Get all WorkflowInvocation rows that have fitness data but missing the new columns
    const { data: rows, error: fetchError } = await supabase
      .from("WorkflowInvocation")
      .select("wf_invocation_id, fitness")
      .not("fitness", "is", null)
      .or("accuracy.is.null,fitness.is.null")

    if (fetchError) {
      throw new Error(`Failed to fetch rows: ${fetchError.message}`)
    }

    if (!rows || rows.length === 0) {
      console.log("No rows found that need migration.")
      return
    }

    console.log(`Found ${rows.length} rows to migrate`)

    let migrated = 0
    let errors = 0

    for (const row of rows) {
      try {
        const fitnessData = row.fitness as Json

        if (!fitnessData) {
          console.log(`- Skipped row ${row.wf_invocation_id}: no fitness data`)
          continue
        }

        // Extract values using type-safe function
        const { accuracy, fitness } = extractFitnessValues(fitnessData)

        // Only update if we have at least one value to update and it's currently null
        const updates: { accuracy?: number; fitness?: number } = {}
        if (accuracy !== null && row.fitness === null) {
          updates.accuracy = accuracy
        }
        if (fitness !== null && row.fitness === null) {
          updates.fitness = fitness
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("WorkflowInvocation")
            .update(updates)
            .eq("wf_invocation_id", row.wf_invocation_id)

          if (updateError) {
            console.error(`Failed to update row ${row.wf_invocation_id}:`, updateError.message)
            errors++
          } else {
            migrated++
            console.log(` Migrated row ${row.wf_invocation_id}: ${JSON.stringify(updates)}`)
          }
        } else {
          console.log(`- Skipped row ${row.wf_invocation_id}: no values to migrate or already populated`)
        }
      } catch (error) {
        console.error(`Error processing row ${row.wf_invocation_id}:`, error)
        errors++
      }
    }

    console.log(`Migration completed: ${migrated} rows migrated, ${errors} errors`)
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateFitnessToColumns()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}
