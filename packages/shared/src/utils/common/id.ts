/**
 * Generate a short ID using crypto.randomUUID()
 * Returns first 8 characters of UUID without hyphens
 */
export const genShortId = () => {
  const fullUuid = (globalThis as any).crypto.randomUUID().replace(/-/g, "")
  return fullUuid.substring(0, 8)
}
