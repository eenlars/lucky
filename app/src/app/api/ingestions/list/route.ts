import { supabase } from "@core/utils/clients/supabase/client"
import { NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest) {
  try {
    const bucket = "input"

    // List marker files at ingestions/*.json to avoid recursive folder walking
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
