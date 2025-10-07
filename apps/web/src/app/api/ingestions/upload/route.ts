import { requireAuth } from "@/lib/api-auth"
import { createDataSet, createDatasetRecord } from "@/lib/db/dataset"
import { supabase } from "@/lib/supabase"
import { genShortId } from "@lucky/shared/client"
import { type NextRequest, NextResponse } from "next/server"

type IngestionType = "csv" | "text"

export async function POST(req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const formData = await req.formData()

    const file = formData.get("file") as File | null
    const type = (formData.get("type") as IngestionType | null) ?? null
    const goal = (formData.get("goal") as string | null) ?? ""
    const evaluation = (formData.get("evaluation") as string | null) ?? undefined
    const onlyIncludeInputColumnsRaw = (formData.get("onlyIncludeInputColumns") as string | null) ?? ""

    // text-specific fields
    const question = (formData.get("question") as string | null) ?? ""
    const answer = (formData.get("answer") as string | null) ?? ""

    if (!type) {
      return NextResponse.json({ error: "Missing ingestion type" }, { status: 400 })
    }

    if (type === "csv") {
      if (!file) {
        return NextResponse.json({ error: "CSV requires a file" }, { status: 400 })
      }
      if (!goal) {
        return NextResponse.json({ error: "CSV ingestion requires a goal" }, { status: 400 })
      }
    }

    if (type === "text") {
      if (!question || !answer) {
        return NextResponse.json({ error: "Text ingestion requires question and answer" }, { status: 400 })
      }
    }

    const datasetId = `ing_${genShortId()}`
    const bucket = "input" // user provided bucket name
    const folder = `ingestions/${datasetId}`

    let uploadPath = ""
    let fileName = ""

    if (type === "csv" && file) {
      // Upload CSV file
      uploadPath = `${folder}/${file.name}`
      fileName = file.name
      const { error: uploadError } = await supabase.storage.from(bucket).upload(uploadPath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      })
      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }
    } else if (type === "text") {
      // Create text data file
      const textData = {
        type: "text",
        question,
        answer,
        goal,
        workflowId: datasetId,
      }
      uploadPath = `${folder}/data.json`
      fileName = "data.json"
      const { error: uploadError } = await supabase.storage.from(bucket).upload(
        uploadPath,
        new Blob([JSON.stringify(textData, null, 2)], {
          type: "application/json",
        }),
        {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/json",
        },
      )
      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }
    }

    // Build metadata
    const onlyIncludeInputColumns = onlyIncludeInputColumnsRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    const meta = {
      datasetId,
      type,
      goal,
      evaluation: evaluation ?? null,
      onlyIncludeInputColumns: onlyIncludeInputColumns.length ? onlyIncludeInputColumns : undefined,
      file: {
        path: uploadPath,
        name: fileName,
        contentType: type === "text" ? "application/json" : file?.type || "application/octet-stream",
        size: type === "text" ? new Blob([JSON.stringify({ question, answer })]).size : file?.size || 0,
      },
      createdAt: new Date().toISOString(),
    }

    // Write meta.json in the dataset folder
    const { error: metaError } = await supabase.storage
      .from(bucket)
      .upload(`${folder}/meta.json`, new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), {
        upsert: true,
        contentType: "application/json",
      })
    if (metaError) {
      return NextResponse.json({ error: `Failed to write meta.json: ${metaError.message}` }, { status: 500 })
    }

    // Write a manifest at root for easy listing: ingestions/{datasetId}.json
    const manifest = {
      datasetId,
      folder,
      metaPath: `${folder}/meta.json`,
      type,
      fileName,
      createdAt: meta.createdAt,
    }
    const { error: manifestError } = await supabase.storage.from(bucket).upload(
      `ingestions/${datasetId}.json`,
      new Blob([JSON.stringify(manifest, null, 2)], {
        type: "application/json",
      }),
      { upsert: true, contentType: "application/json" },
    )
    if (manifestError) {
      return NextResponse.json({ error: `Failed to write manifest: ${manifestError.message}` }, { status: 500 })
    }

    // Create database entries
    try {
      const dataset = await createDataSet({
        name: type === "csv" && fileName ? fileName : `Dataset ${datasetId}`,
        description: goal,
        data_format: type,
      })

      // Create dataset records based on type
      if (type === "text") {
        await createDatasetRecord({
          dataset_id: dataset.dataset_id,
          workflow_input: question,
          ground_truth: answer,
        })
      } else if (type === "csv" && file) {
        // Parse CSV and create records
        try {
          const csvText = await file.text()
          const lines = csvText.split("\n").filter(line => line.trim())
          if (lines.length > 1) {
            const headers = lines[0].split(",").map(h => h.trim())

            // Find input and output columns
            const inputCol = headers.findIndex(
              h => h.toLowerCase().includes("input") || h.toLowerCase().includes("question"),
            )
            let outputCol = headers.findIndex(
              h =>
                h.toLowerCase().includes("output") ||
                h.toLowerCase().includes("answer") ||
                h.toLowerCase().includes("expected"),
            )

            // If evaluation column is specified, use that
            if (evaluation?.startsWith("column:")) {
              const evalColName = evaluation.slice(7)
              outputCol = headers.findIndex(h => h === evalColName)
            }

            // Create records for each row
            for (let i = 1; i < lines.length && i <= 50; i++) {
              // Limit to 50 records for performance
              const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""))
              if (values.length >= headers.length) {
                const input = inputCol >= 0 ? values[inputCol] : values[0] || ""
                const output = outputCol >= 0 ? values[outputCol] : values[values.length - 1] || ""

                if (input && output) {
                  await createDatasetRecord({
                    dataset_id: dataset.dataset_id,
                    workflow_input: input,
                    ground_truth: output,
                  })
                }
              }
            }
          }
        } catch (csvError) {
          console.error("CSV parsing failed:", csvError)
          // Don't fail - the dataset is still created
        }
      }
    } catch (dbError) {
      console.error("Database creation failed:", dbError)
      // Don't fail the entire request - storage upload succeeded
    }

    return NextResponse.json({ success: true, dataset: meta })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
