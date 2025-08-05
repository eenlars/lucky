import { lgg } from "@core/utils/logging/Logger"
import * as cheerio from "cheerio"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      )
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract logo
    let logo = null
    const logoElement = $(
      "html > body > div:nth-child(1) > main > div > div:nth-child(1) > div:nth-child(2) > div > img"
    )
    if (logoElement.length > 0) {
      const logoSrc = logoElement.attr("src")
      if (logoSrc && !logoSrc.toLowerCase().includes("bcorp")) {
        logo = logoSrc
      }
    }

    // Extract banner
    let banner = null
    const bannerElement = $(
      "html > body > div:nth-child(1) > main > div > div:nth-child(1) > div:nth-child(1) > div > img"
    )
    if (bannerElement.length > 0) {
      banner = bannerElement.attr("src")
    }

    // Extract h1 text
    let title = null
    const titleElement = $(
      "html > body > div:nth-child(1) > main > div > div:nth-child(3) > div:nth-child(3) > h1"
    )
    if (titleElement.length > 0) {
      title = titleElement.text().trim()
    }

    return NextResponse.json({ logo, banner, title })
  } catch (error) {
    lgg.error("Error processing request:", error)
    return NextResponse.json(
      { error: "Failed to process the request" },
      { status: 500 }
    )
  }
}
