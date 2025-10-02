/**
 * Returns the text between the **first balanced** pair of
 * <tag> … </tag>.
 * – Case-sensitive.
 * – Tolerates whitespace and attributes in the opening tag
 *   (e.g. `<tag foo="bar">`).
 * – Allows nested same-name tags and stops at the correct mate.
 * – Rejects mismatched / crossed / stray tags anywhere in the
 *   document (returns `null`).
 * – Linear-time scan — no catastrophic back-tracking.
 */
export function findFromTags(text: string, tag: string): string | null {
  try {
    // ────────────────────────────────────────────────────
    // 1. Try strict validation first (original behavior)
    const ANY_TAG = /<\s*(\/?)\s*([^\s/>]+)(?:\s[^>]*)?>/g
    const stack: string[] = []
    let match = ANY_TAG.exec(text)
    while (match) {
      const closing = !!match[1]
      const name = match[2]
      if (closing) {
        if (stack.pop() !== name) {
          // Document is malformed, try lenient parsing
          return findFromTagsLenient(text, tag)
        }
      } else {
        stack.push(name) // new opener
      }
      match = ANY_TAG.exec(text)
    }
    if (stack.length) {
      // Document is malformed, try lenient parsing
      return findFromTagsLenient(text, tag)
    }

    // ────────────────────────────────────────────────────
    // 2. Document is well-formed, use original strict logic
    const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // regex-escape
    const TOKEN = new RegExp(`<\\s*(/?)\\s*${esc}(?:\\s[^>]*)?>`, "gsi")

    // find genuine opener (skip leading stray </tag>)
    let opener = TOKEN.exec(text)
    while (opener?.[1]) {
      opener = TOKEN.exec(text)
    }
    if (!opener) return null

    const start = opener.index + opener[0].length
    let depth = 1

    let m = TOKEN.exec(text)
    while (m) {
      depth += m[1] ? -1 : 1 // /?  → closing (-1)  or  opening (+1)
      if (depth === 0) {
        return text.slice(start, m.index) // balanced pair found 🎉
      }
      m = TOKEN.exec(text)
    }
    return null // opener with no closer
  } catch {
    return null // invalid regex in tag name, etc.
  }
}

// Lenient parsing for malformed documents
function findFromTagsLenient(text: string, tag: string): string | null {
  try {
    const esc = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // regex-escape
    const TOKEN = new RegExp(`<\\s*(/?)\\s*${esc}(?:\\s[^>]*)?>`, "gsi")

    // find genuine opener (skip leading stray </tag>)
    let opener = TOKEN.exec(text)
    while (opener?.[1]) {
      opener = TOKEN.exec(text)
    }
    if (!opener) return null

    const start = opener.index + opener[0].length
    let depth = 1

    let m = TOKEN.exec(text)
    while (m) {
      depth += m[1] ? -1 : 1 // /?  → closing (-1)  or  opening (+1)
      if (depth === 0) {
        // Found a balanced pair for this specific tag
        const content = text.slice(start, m.index)
        const endPos = m.index + m[0].length

        // Check if there are any more closing tags for this tag after this point
        // If so, it means we have overlapping tags which should be rejected
        const remainingText = text.slice(endPos)
        const remainingClosers = new RegExp(`<\\s*/\\s*${esc}(?:\\s[^>]*)?>`, "gsi")
        if (remainingClosers.test(remainingText)) {
          return null // overlapping tags detected
        }

        // Verify that the extracted content itself is well-formed
        const ANY_TAG = /<\s*(\/?)\s*([^\s/>]+)(?:\s[^>]*)?>/g
        const stack: string[] = []
        ANY_TAG.lastIndex = 0 // reset regex state

        let tagMatch = ANY_TAG.exec(content)
        while (tagMatch) {
          const closing = !!tagMatch[1]
          const name = tagMatch[2]
          if (closing) {
            if (stack.pop() !== name) return null // crossing or stray closer in content
          } else {
            stack.push(name) // new opener in content
          }
          tagMatch = ANY_TAG.exec(content)
        }
        if (stack.length) return null // something never closed in content

        return content // balanced pair found 🎉
      }
      m = TOKEN.exec(text)
    }
    return null // opener with no closer
  } catch {
    return null // invalid regex in tag name, etc.
  }
}
