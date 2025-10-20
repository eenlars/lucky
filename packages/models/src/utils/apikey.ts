/**
 * Validates that an API key is ASCII-only (no unicode, emoji, control characters)
 */
export function isValidApiKey(key: string): boolean {
  // API keys should be ASCII-only, no unicode
  // eslint-disable-next-line no-control-regex
  return /^[\x20-\x7E]+$/.test(key)
}
