import { lgg } from "@core/utils/logging/Logger"
import { htmlToMarkdown } from "@lucky/tools/utils"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 })
  }
  try {
    const result = await htmlToMarkdown({
      url,
      preserveLinks: "none",
      preserveImages: "none",
    })
    return new Response(result.markdown, {
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error) {
    lgg.error(error)
    return NextResponse.json({ error: "Failed to convert URL to markdown" }, { status: 500 })
  }
}
