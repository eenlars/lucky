// Centralized chart color palette for experiments
// Subtle, consistent colors inspired by modern UI palettes

export const seriesPalette: string[] = [
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#6366f1", // indigo-500
  "#f43f5e", // rose-500
  "#22d3ee", // cyan-300
  "#a78bfa", // violet-400
  "#94a3b8", // slate-400
  "#60a5fa", // blue-400
]

// Alias commonly used palette name
export const categorical10 = seriesPalette

// Semantic color roles for consistent meaning across charts
export const semantic = {
  positive: "#10b981", // emerald-500
  positiveEmphasis: "#059669", // emerald-600
  negative: "#ef4444", // red-500
  negativeEmphasis: "#dc2626", // red-600
  warning: "#f59e0b", // amber-500
  info: "#0ea5e9", // sky-500
  neutral: "#64748b", // slate-500
  neutralMuted: "#94a3b8", // slate-400
  neutralStrong: "#334155", // slate-700
  critical: "#e11d48", // rose-600 (ref lines)
}

// Known model → color mapping used across experiments
export const modelColors: Record<string, string> = {
  "gpt-3.5-turbo": "#8b5cf6",
  "gpt-4o-mini": "#06b6d4",
  "gpt-4-turbo": "#f59e0b",
  o3: "#10b981",
}

// Step/category mapping for sequential bars
export const stepColors = {
  "2-step": "#8b5cf6",
  "5-step": "#06b6d4",
  "10-step": "#f59e0b",
}

// Scenario mapping for context adaptation charts
export const scenarioColors: Record<string, string> = {
  "basic-failure": "#60a5fa", // blue-400
  "larger-request": "#a78bfa", // violet-400
  "within-limit": "#f59e0b", // amber-500
}

// Axes and utility colors for grid/labels/ticks
export const axes = {
  grid: "#e5e7eb",
  label: "#475569",
  axisLine: "#94a3b8",
  tickLine: "#cbd5e1",
  referenceLine: "#e11d48",
}
