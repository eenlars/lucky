/**
 * Bridge to external tool registry
 * This file handles the dynamic import of tools from the example directory
 */

export async function loadExternalTools() {
  try {
    // Dynamic import to avoid compile-time path resolution issues
    const registryPath = "../../../../../../example/code_tools/registry"
    const { ALL_TOOLS } = await import(registryPath)
    return ALL_TOOLS
  } catch (error) {
    console.warn("Could not load external tool registry:", error)
    return []
  }
}