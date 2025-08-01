import { supabase } from "@/core/utils/clients/supabase/client"

interface NewerFitnessData {
  data: {
    score: number
    novelty: number
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

type FitnessData = NewerFitnessData | MiddleFitnessData | OlderFitnessData

function isNewerFormat(data: unknown): data is NewerFitnessData {
  return (
    data !== null &&
    typeof data === "object" &&
    "data" in data &&
    data.data !== null &&
    typeof data.data === "object" &&
    "score" in data.data &&
    "novelty" in data.data &&
    "accuracy" in data.data &&
    typeof (data.data as any).score === "number" &&
    typeof (data.data as any).novelty === "number" &&
    typeof (data.data as any).accuracy === "number"
  )
}

function isMiddleFormat(data: unknown): data is MiddleFitnessData {
  return (
    data !== null &&
    typeof data === "object" &&
    "data" in data &&
    data.data !== null &&
    typeof data.data === "object" &&
    "score" in data.data &&
    "dataAccuracy" in data.data &&
    !("novelty" in data.data) &&
    !("accuracy" in data.data) &&
    typeof (data.data as any).score === "number" &&
    typeof (data.data as any).dataAccuracy === "number"
  )
}

function isOlderFormat(data: unknown): data is OlderFitnessData {
  return (
    data !== null &&
    typeof data === "object" &&
    "score" in data &&
    !("data" in data) &&
    typeof (data as any).score === "number"
  )
}

function extractFitnessValues(fitnessData: unknown): {
  accuracy: number | null
  novelty: number | null
  fitness_score: number | null
} {
  if (isNewerFormat(fitnessData)) {
    return {
      accuracy: Math.round(fitnessData.data.accuracy),
      novelty: Math.round(fitnessData.data.novelty),
      fitness_score: Math.round(fitnessData.data.score),
    }
  } else if (isMiddleFormat(fitnessData)) {
    return {
      accuracy: Math.round(fitnessData.data.dataAccuracy),
      novelty: null,
      fitness_score: Math.round(fitnessData.data.score),
    }
  } else if (isOlderFormat(fitnessData)) {
    return {
      accuracy: fitnessData.extendedFitness?.dataAccuracy
        ? Math.round(fitnessData.extendedFitness.dataAccuracy)
        : null,
      novelty: null,
      fitness_score: Math.round(fitnessData.score),
    }
  } else {
    return {
      accuracy: null,
      novelty: null,
      fitness_score: null,
    }
  }
}

export async function migrateFitnessToColumns() {
  console.log("Starting fitness data migration...")

  try {
    // Get all WorkflowInvocation rows that have fitness data but missing the new columns
    const { data: rows, error: fetchError } = await supabase
      .from("WorkflowInvocation")
      .select("wf_invocation_id, fitness, accuracy, novelty, fitness_score")
      .not("fitness", "is", null)
      .or("accuracy.is.null,novelty.is.null,fitness_score.is.null")

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
        const fitnessData = row.fitness

        if (!fitnessData) {
          console.log(`- Skipped row ${row.wf_invocation_id}: no fitness data`)
          continue
        }

        // Extract values using type-safe function
        const { accuracy, novelty, fitness_score } =
          extractFitnessValues(fitnessData)

        // Only update if we have at least one value to update and it's currently null
        const updates: any = {}
        if (accuracy !== null && row.accuracy === null) {
          updates.accuracy = accuracy
        }
        if (novelty !== null && row.novelty === null) {
          updates.novelty = novelty
        }
        if (fitness_score !== null && row.fitness_score === null) {
          updates.fitness_score = fitness_score
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("WorkflowInvocation")
            .update(updates)
            .eq("wf_invocation_id", row.wf_invocation_id)

          if (updateError) {
            console.error(
              `Failed to update row ${row.wf_invocation_id}:`,
              updateError.message
            )
            errors++
          } else {
            migrated++
            console.log(
              ` Migrated row ${row.wf_invocation_id}: ${JSON.stringify(updates)}`
            )
          }
        } else {
          console.log(
            `- Skipped row ${row.wf_invocation_id}: no values to migrate or already populated`
          )
        }
      } catch (error) {
        console.error(`Error processing row ${row.wf_invocation_id}:`, error)
        errors++
      }
    }

    console.log(
      `Migration completed: ${migrated} rows migrated, ${errors} errors`
    )
  } catch (error) {
    console.error("Migration failed:", error)
    throw error
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateFitnessToColumns()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
