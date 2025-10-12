"use client"

// Detect if a string likely contains Markdown syntax
export const isMarkdownContent = (content: string): boolean => {
  if (!content || typeof content !== "string") return false
  const markdownPatterns = [
    /^#{1,6}\s+/m, // Headers
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /`[^`]+`/, // Inline code
    /```[\s\S]*?```/, // Code blocks
    /^\s*[-*+]\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
    /\[([^\]]+)\]\(([^)]+)\)/, // Links
    /^\s*>\s+/m, // Blockquotes
    /\|.*\|/, // Tables
  ]
  return markdownPatterns.some(pattern => pattern.test(content))
}
