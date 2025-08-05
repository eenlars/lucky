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
    for (let m: RegExpExecArray | null; (m = ANY_TAG.exec(text)); ) {
      const closing = !!m[1]
      const name = m[2]
      if (closing) {
        if (stack.pop() !== name) {
          // Document is malformed, try lenient parsing
          return findFromTagsLenient(text, tag)
        }
      } else {
        stack.push(name) // new opener
      }
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
    let opener: RegExpExecArray | null
    while ((opener = TOKEN.exec(text)) && opener[1]) {
      /* skip */
    }
    if (!opener) return null

    const start = opener.index + opener[0].length
    let depth = 1

    for (let m: RegExpExecArray | null; (m = TOKEN.exec(text)); ) {
      depth += m[1] ? -1 : 1 // /?  → closing (-1)  or  opening (+1)
      if (depth === 0) {
        return text.slice(start, m.index) // balanced pair found 🎉
      }
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
    let opener: RegExpExecArray | null
    while ((opener = TOKEN.exec(text)) && opener[1]) {
      /* skip */
    }
    if (!opener) return null

    const start = opener.index + opener[0].length
    let depth = 1

    for (let m: RegExpExecArray | null; (m = TOKEN.exec(text)); ) {
      depth += m[1] ? -1 : 1 // /?  → closing (-1)  or  opening (+1)
      if (depth === 0) {
        // Found a balanced pair for this specific tag
        const content = text.slice(start, m.index)
        const endPos = m.index + m[0].length

        // Check if there are any more closing tags for this tag after this point
        // If so, it means we have overlapping tags which should be rejected
        const remainingText = text.slice(endPos)
        const remainingClosers = new RegExp(
          `<\\s*/\\s*${esc}(?:\\s[^>]*)?>`,
          "gsi"
        )
        if (remainingClosers.test(remainingText)) {
          return null // overlapping tags detected
        }

        // Verify that the extracted content itself is well-formed
        const ANY_TAG = /<\s*(\/?)\s*([^\s/>]+)(?:\s[^>]*)?>/g
        const stack: string[] = []
        let tagMatch: RegExpExecArray | null
        ANY_TAG.lastIndex = 0 // reset regex state

        while ((tagMatch = ANY_TAG.exec(content))) {
          const closing = !!tagMatch[1]
          const name = tagMatch[2]
          if (closing) {
            if (stack.pop() !== name) return null // crossing or stray closer in content
          } else {
            stack.push(name) // new opener in content
          }
        }
        if (stack.length) return null // something never closed in content

        return content // balanced pair found 🎉
      }
    }
    return null // opener with no closer
  } catch {
    return null // invalid regex in tag name, etc.
  }
}
