import { supabase } from "@core/utils/clients/supabase/client"
import { NextRequest, NextResponse } from "next/server"
import { listDataSets } from "@/lib/db/dataset"
import { requireAuth } from "@/lib/api-auth"

export async function GET(_req: NextRequest) {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    // First try to get datasets from the database
    try {
      const datasets = await listDataSets()
      if (datasets.length > 0) {
        return NextResponse.json({
          success: true,
          datasets: datasets.map(ds => ({
            datasetId: ds.dataset_id,
            name: ds.name,
            description: ds.description,
            data_format: ds.data_format,
            createdAt: ds.created_at,
            type: ds.data_format,
          })),
        })
      }
    } catch (dbError) {
      console.error("Database query failed, falling back to storage:", dbError)
    }

    // Fallback to storage-based approach for backward compatibility
    const bucket = "input"
    const { data, error } = await supabase.storage
      .from(bucket)
      .list("ingestions", {
        limit: 1000,
        search: ".json",
      })
    if (error) {
      return NextResponse.json(
        { error: `Listing failed: ${error.message}` },
        { status: 500 }
      )
    }

    const manifests = data?.filter((f) => f.name.endsWith(".json")) || []
    const results = await Promise.all(
      manifests.map(async (file) => {
        const path = `ingestions/${file.name}`
        const { data: blob, error: dlErr } = await supabase.storage
          .from(bucket)
          .download(path)
        if (dlErr || !blob) return null
        try {
          const text = await blob.text()
          const json = JSON.parse(text)
          return json
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({
      success: true,
      datasets: results.filter(Boolean),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
