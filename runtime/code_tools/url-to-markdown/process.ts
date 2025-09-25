import * as cheerio from "cheerio"
import { default as TurndownService } from "turndown"

export type ProcessHtmlToMarkdownResult = {
  markdown: string
  originalLength: number
  markdownLength: number
  compressionRatio: number
  url: string | null
  extractedFrom: string
}

export async function processHtmlToMarkdown(
  html: string,
  preserveLinks = "keep-links",
  preserveImages = "keep-images",
  sourceUrl?: string
): Promise<ProcessHtmlToMarkdownResult> {
  const $ = cheerio.load(html)

  // remove unnecessary content
  $("script, style, noscript, iframe, embed, object").remove()
  $("nav, header, footer, aside").remove()
  $(".ad, .ads, .advertisement, .sidebar, .widget").remove()
  $('[class*="ad-"], [class*="ads-"], [id*="ad-"], [id*="ads-"]').remove()
  $(".cookie, .popup, .modal, .overlay").remove()
  $('form, input, button[type="submit"]').remove()
  $(".social, .share, .comments, .comment-section").remove()
  $('meta, link[rel="stylesheet"], link[rel="icon"]').remove()

  // extract main content - prioritize article, main, or content containers
  let mainContent = $("article").first()
  if (mainContent.length === 0) {
    mainContent = $("main").first()
  }
  if (mainContent.length === 0) {
    mainContent = $('[role="main"]').first()
  }
  if (mainContent.length === 0) {
    mainContent = $(".content, .post, .entry, .article").first()
  }
  if (mainContent.length === 0) {
    // fallback to body but still clean it
    mainContent = $("body")
  }

  // handle "only show" modes
  if (preserveLinks === "only-show-links") {
    const links: string[] = []
    mainContent.find("a[href]").each((_, el) => {
      const $link = $(el)
      const href = $link.attr("href")
      const text = $link.text().trim()

      if (href && text) {
        const fullUrl = href.startsWith("http")
          ? href
          : href.startsWith("//")
            ? `https:${href}`
            : sourceUrl
              ? new URL(href, sourceUrl).href
              : href
        links.push(`- [${text}](${fullUrl})`)
      }
    })

    const markdown = links.length > 0 ? links.join("\n") : "no links found"
    return {
      markdown,
      originalLength: html.length,
      markdownLength: markdown.length,
      compressionRatio: Math.round((1 - markdown.length / html.length) * 100),
      url: sourceUrl || null,
      extractedFrom: "links-only",
    }
  }

  if (preserveImages === "only-show-images") {
    const images: string[] = []
    mainContent.find("img[src]").each((_, el) => {
      const $img = $(el)
      const src = $img.attr("src")
      const alt = $img.attr("alt") || "image"

      if (src) {
        const fullUrl = src.startsWith("http")
          ? src
          : src.startsWith("//")
            ? `https:${src}`
            : sourceUrl
              ? new URL(src, sourceUrl).href
              : src
        images.push(`![${alt}](${fullUrl})`)
      }
    })

    const markdown = images.length > 0 ? images.join("\n\n") : "no images found"
    return {
      markdown,
      originalLength: html.length,
      markdownLength: markdown.length,
      compressionRatio: Math.round((1 - markdown.length / html.length) * 100),
      url: sourceUrl || null,
      extractedFrom: "images-only",
    }
  }

  // get clean html
  const cleanedHtml = mainContent.html() || ""

  // convert to markdown
  const turndownService = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
    strongDelimiter: "**",
  })

  // configure turndown rules
  if (preserveLinks === "none") {
    turndownService.addRule("removeLinks", {
      filter: "a",
      replacement: (content: string) => content,
    })
  } else if (preserveLinks === "keep-links" && sourceUrl) {
    // ensure absolute urls for links when keeping them
    turndownService.addRule("absoluteLinks", {
      filter: "a",
      replacement: (content: string, node: any) => {
        const href = node.getAttribute("href")
        if (!href) return content

        const fullUrl = href.startsWith("http")
          ? href
          : href.startsWith("//")
            ? `https:${href}`
            : new URL(href, sourceUrl).href

        return `[${content}](${fullUrl})`
      },
    })
  }

  if (preserveImages === "none") {
    turndownService.addRule("removeImages", {
      filter: "img",
      replacement: () => "",
    })
  } else if (preserveImages === "keep-images" && sourceUrl) {
    // ensure absolute urls for images when keeping them
    turndownService.addRule("absoluteImages", {
      filter: "img",
      replacement: (content: string, node: any) => {
        const src = node.getAttribute("src")
        const alt = node.getAttribute("alt") || ""

        if (!src) return ""

        const fullUrl = src.startsWith("http")
          ? src
          : src.startsWith("//")
            ? `https:${src}`
            : new URL(src, sourceUrl).href

        return `![${alt}](${fullUrl})`
      },
    })
  }

  // remove common junk elements
  turndownService.addRule("removeJunk", {
    filter: ["div", "span"],
    replacement: (content: string, node: any) => {
      // only keep div/span if they have meaningful content
      const text = node.textContent?.trim() || ""
      if (text.length < 10 && !content.trim()) {
        return ""
      }
      return content
    },
  })

  const markdown = turndownService.turndown(cleanedHtml)

  // clean up excessive whitespace
  const cleanMarkdown = markdown
    .replace(/\n\s*\n\s*\n/g, "\n\n") // max 2 consecutive newlines
    .replace(/^\s+|\s+$/g, "") // trim start/end whitespace
    .replace(/[ \t]+/g, " ") // normalize spaces

  return {
    markdown: cleanMarkdown,
    originalLength: html.length,
    markdownLength: cleanMarkdown.length,
    compressionRatio: Math.round((1 - cleanMarkdown.length / html.length) * 100),
    url: sourceUrl || null,
    extractedFrom: mainContent.prop("tagName")?.toLowerCase() || "unknown",
  }
}
