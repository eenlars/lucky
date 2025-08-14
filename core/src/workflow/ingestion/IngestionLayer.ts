import { GAIALoader } from "@core/evaluation/benchmarks/gaia/GAIALoader"
import { SWEBenchLoader } from "@core/evaluation/benchmarks/swe/SWEBenchLoader"
import { truncater } from "@core/utils/common/llmify"
import { envi } from "@core/utils/env.mjs"
import { lgg } from "@core/utils/logging/Logger"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { guard } from "@core/workflow/schema/errorMessages"
import { JSONN } from "@lucky/shared"
import { CSVLoader } from "@lucky/shared/csv"
import { CONFIG } from "@runtime/settings/constants"
import type { WorkflowIO } from "./ingestion.types"

/**
 * unified ingestion layer that converts EvaluationInput to WorkflowIO[]
 * handles both text and CSV evaluation inputs
 */
export class IngestionLayer {
  static verbose = CONFIG.logging.override.Setup

  /**
   * converts EvaluationInput to WorkflowIO array
   * this is the main entry point for input processing
   */
  static async convert(evaluation: EvaluationInput): Promise<WorkflowIO[]> {
    // needs work: validation should happen first before processing
    lgg.onlyIf(this.verbose, "[IngestionLayer] converting evaluation input", {
      type: evaluation.type,
      goal: evaluation.goal,
    })

    if (evaluation.type === "text") {
      return this.convertTextEvaluation(evaluation)
    }

    if (evaluation.type === "csv") {
      return await this.convertCSVEvaluation(evaluation)
    }

    if (evaluation.type === "prompt-only") {
      return this.convertPromptOnlyEvaluation(evaluation)
    }

    if (evaluation.type === "swebench") {
      return await this.convertSWEBenchEvaluation(evaluation)
    }

    if (evaluation.type === "gaia") {
      return await this.convertGAIAEvaluation(evaluation)
    }

    // needs work: error message should include the actual type for debugging
    //likely bug: should use evaluation.type instead of entire evaluation object
    throw new Error(
      `unsupported evaluation type: ${JSON.stringify(evaluation)}`
    )
  }

  /**
   * converts text evaluation to single WorkflowIO
   */
  private static convertTextEvaluation(
    evaluation: EvaluationInput & { type: "text" }
  ): WorkflowIO[] {
    const workflowCase: WorkflowIO = {
      workflowInput: evaluation.question,
      workflowOutput: {
        output: evaluation.answer,
      },
    }

    lgg.onlyIf(
      this.verbose,
      "[IngestionLayer] created single workflow case from text"
    )
    return [workflowCase]
  }

  private static convertPromptOnlyEvaluation(
    evaluation: EvaluationInput & { type: "prompt-only" }
  ): WorkflowIO[] {
    return [
      {
        workflowInput: evaluation.goal,
        workflowOutput: {
          output: "everything is correct, always return 100%",
        },
      },
    ]
  }

  /**
   * converts CSV evaluation to multiple WorkflowIO cases
   */
  private static async convertCSVEvaluation(
    evaluation: EvaluationInput & { type: "csv" }
  ): Promise<WorkflowIO[]> {
    guard(evaluation.inputFile, "CSV evaluation type requires inputFile")

    try {
      const csvLoader = new CSVLoader(evaluation.inputFile)
      const csvData = await csvLoader.loadAsJSON<Record<string, any>>()

      lgg.onlyIf(this.verbose, "[IngestionLayer] loaded CSV data", {
        rows: csvData.length,
        columns: csvData.length > 0 ? Object.keys(csvData[0]) : [],
      })

      // parse evaluation to extract column name for expected output
      const expectedOutputColumnName = this.parseEvaluation(
        evaluation.evaluation
      )

      // create workflow cases from CSV rows
      const workflowCases: WorkflowIO[] = csvData.map(
        (row: Record<string, any>, index: number) => {
          // filter row data to only include specified columns if onlyIncludeInputColumns is provided
          const filteredRow = evaluation.onlyIncludeInputColumns
            ? Object.fromEntries(
                Object.entries(row).filter(([key]) =>
                  evaluation.onlyIncludeInputColumns!.includes(key)
                )
              )
            : row

          // create input by combining goal with row data
          const rowContext = Object.entries(filteredRow)
            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
            .join("\n")

          const workflowInput = `${evaluation.goal}\n\nCurrent data:\n${rowContext}`

          // determine expected output for this row
          const workflowOutput = this.determineExpectedOutput(
            row,
            expectedOutputColumnName,
            index
          )

          return {
            workflowInput,
            workflowOutput: workflowOutput,
          }
        }
      )

      lgg.onlyIf(this.verbose, "[IngestionLayer] generated workflow cases", {
        count: workflowCases.length,
        first: truncater(JSONN.show(workflowCases[0], 2), 100),
      })

      // calculate number of cases to select based on configured percentage
      const numCasesToSelect = Math.max(
        1,
        Math.min(workflowCases.length, CONFIG.ingestion.taskLimit)
      )

      // use proper random sampling instead of array sort for performance
      const selectedCases = workflowCases
        .sort(() => Math.random() - 0.5)
        .slice(0, numCasesToSelect)

      return selectedCases
    } catch (error) {
      lgg.error("[IngestionLayer] failed to process CSV", error)
      throw new Error(
        `failed to convert CSV evaluation: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * parse evaluation string to extract column reference
   */
  private static parseEvaluation(
    evaluation: string | undefined
  ): string | null {
    if (!evaluation) {
      return null
    }

    if (!evaluation.startsWith("column:")) {
      throw new Error(
        `evaluation must be a column reference in format 'column:columnName', got: ${evaluation}`
      )
    }

    const columnName = evaluation.slice(7) // remove 'column:' prefix
    guard(columnName, "column name cannot be empty after 'column:' prefix")

    return columnName
  }

  /**
   * determine expected output for a specific CSV row
   */
  private static determineExpectedOutput(
    row: Record<string, any>,
    columnName: string | null,
    rowIndex: number
  ): any {
    // if no column name is specified, return a default message
    if (!columnName) {
      return "no expected output specified"
    }

    // check if the column exists in the row
    if (!(columnName in row)) {
      throw new Error(
        `column '${columnName}' not found in CSV row ${rowIndex}. Available columns: ${Object.keys(row).join(", ")}`
      )
    }

    const columnValue = row[columnName]

    // if the column value is null or undefined, return null
    if (columnValue == null) return null

    // if the column value is not a string, return as-is
    if (typeof columnValue !== "string") return columnValue

    // try to parse the column value as JSON
    try {
      return JSON.parse(columnValue)
    } catch (error) {
      return String(truncater(columnValue, 1000))
    }
  }

  /**
   * converts SWE-bench evaluation to multiple WorkflowIO cases (configurable limit)
   */
  private static async convertSWEBenchEvaluation(
    _evaluation: EvaluationInput & { type: "swebench" }
  ): Promise<WorkflowIO[]> {
    try {
      // fetch the SWE-bench instance data
      const workflowCases = await SWEBenchLoader.fetchAsWorkflowIO()

      if (workflowCases.length === 0) {
        throw new Error("no SWE-bench instances available")
      }

      // return up to configured limit of workflow cases
      const limit = Math.min(CONFIG.ingestion.taskLimit, 100)
      const casesToReturn = workflowCases.slice(0, limit)

      lgg.onlyIf(this.verbose, "[IngestionLayer] loaded SWE-bench cases", {
        totalAvailable: workflowCases.length,
        returned: casesToReturn.length,
      })

      return casesToReturn
    } catch (error) {
      lgg.error("[IngestionLayer] failed to process SWE-bench", error)
      throw new Error(
        `failed to convert SWE-bench evaluation: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  /**
   * converts GAIA evaluation to multiple WorkflowIO cases (configurable limit)
   */
  private static async convertGAIAEvaluation(
    evaluation: EvaluationInput & { type: "gaia" }
  ): Promise<WorkflowIO[]> {
    try {
      lgg.onlyIf(this.verbose, "[IngestionLayer] fetching GAIA instances", {
        level: evaluation.level,
        split: evaluation.split,
      })

      lgg.info("[GAIALoader] Using local cached GAIA data")

      // get HF token from environment if available (prefer runtime env over test/static mock)
      const authToken =
        process.env.HF_TOKEN ||
        process.env.HUGGING_FACE_API_KEY ||
        envi.HF_TOKEN ||
        envi.HUGGING_FACE_API_KEY

      if (!authToken) {
        lgg.warn(
          "[IngestionLayer] HF_TOKEN or HUGGING_FACE_API_KEY not found in environment. GAIA is a gated dataset and may require authentication."
        )
      }

      // fetch multiple GAIA instances by level (up to configured limit)
      const limit = Math.min(CONFIG.ingestion.taskLimit, 100)
      const instances = await GAIALoader.fetchByLevel(
        evaluation.level || 1,
        evaluation.split || "validation",
        limit,
        authToken
      )

      // convert each instance to WorkflowIO
      const workflowCases: WorkflowIO[] = instances.map((instance) => {
        // compose the workflow input
        let workflowInput = `${evaluation.goal}

Task ID: ${instance.task_id}
Level: ${instance.Level}

Question:
${instance.Question}`

        // add file information if present
        if (instance.file_name) {
          workflowInput += `

Note: This task includes an attached file: ${instance.file_name}
The file content should be processed as part of solving this task.`

          lgg.info(
            `[IngestionLayer] GAIA task ${instance.task_id} has associated file: ${instance.file_name}`
          )
        }

        // the expected output is the final answer
        const workflowOutput = instance["Final answer"] || ""

        return {
          workflowInput,
          workflowOutput: {
            output: workflowOutput,
          },
        }
      })

      lgg.onlyIf(
        this.verbose,
        "[IngestionLayer] created workflow cases from GAIA",
        {
          level: evaluation.level,
          totalInstances: instances.length,
          casesGenerated: workflowCases.length,
        }
      )

      return workflowCases
    } catch (error) {
      // If authentication fails, create a fallback case explaining the issue
      if (
        error instanceof Error &&
        error.message.includes("Authentication required")
      ) {
        lgg.warn(
          "[IngestionLayer] GAIA authentication failed, creating fallback case"
        )
        const fallbackCase: WorkflowIO = {
          workflowInput: `${evaluation.goal}

Note: GAIA dataset requires authentication. Please set HF_TOKEN or HUGGING_FACE_API_KEY environment variable to access real GAIA tasks.

Fallback Question: What is 2 + 2?`,
          workflowOutput: {
            output: "4",
          },
        }
        return [fallbackCase]
      }

      lgg.error("[IngestionLayer] failed to process GAIA", error)
      throw new Error(
        `failed to convert GAIA evaluation: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}
