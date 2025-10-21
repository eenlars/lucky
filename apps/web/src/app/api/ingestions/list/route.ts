import { alrighty } from "@/lib/api/server"
import { listDataSets } from "@/lib/db/dataset"
import { logException } from "@/lib/error-logger"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest) {
  // Require authentication
  const { isAuthenticated } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createClient()

  try {
    // First try to get datasets from the database
    try {
      const datasets = await listDataSets()
      if (datasets.length > 0) {
        return alrighty(
          "ingestions/list",
          datasets.map(ds => ({
            dataset_id: ds.dataset_id,
            name: ds.name,
            description: ds.description,
            data_format: ds.data_format || "unknown",
            created_at: ds.created_at,
          })),
        )
      }
    } catch (dbError) {
      console.error("Database query failed, falling back to storage:", dbError)
    }

    // Fallback to storage-based approach for backward compatibility
    const bucket = "input"
    const { data, error } = await supabase.storage.from(bucket).list("ingestions", {
      limit: 1000,
      search: ".json",
    })
    if (error) {
      return NextResponse.json({ error: `Listing failed: ${error.message}` }, { status: 500 })
    }

    const manifests = data?.filter(f => f.name.endsWith(".json")) || []
    const results = await Promise.all(
      manifests.map(async file => {
        const path = `ingestions/${file.name}`
        const { data: blob, error: dlErr } = await supabase.storage.from(bucket).download(path)
        if (dlErr || !blob) return null
        try {
          const text = await blob.text()
          const json = JSON.parse(text)
          return json
        } catch {
          return null
        }
      }),
    )

    return alrighty(
      "ingestions/list",
      results.filter(Boolean).map((ds: any) => ({
        dataset_id: ds.datasetId || ds.dataset_id,
        name: ds.name || ds.fileName,
        description: null,
        data_format: ds.type || ds.data_format || "unknown",
        created_at: ds.createdAt || ds.created_at || new Date().toISOString(),
      })),
    )
  } catch (error) {
    logException(error, {
      location: "/api/ingestions/list",
    })
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}
