/**
 * UI-related utility functions
 */

/**
 * Check if a model should be visible in the UI based on environment
 */
export function isUIVisibleModel(model: { uiHiddenInProd?: boolean; disabled?: boolean }, env?: string): boolean {
  const isProduction = env === "production"
  if (!isProduction) {
    return true
  }
  return !(model.uiHiddenInProd || model.disabled)
}
