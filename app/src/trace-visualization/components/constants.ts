export const STATUS_TO_COLOR = {
  completed: "bg-green-500",
  failed: "bg-red-500",
  running: "bg-yellow-500",
  default: "bg-muted",
}

export const formatCost = (cost: number | null) => (cost != null ? `$${(cost * 1000).toFixed(4)} × 10³` : "mini$0.0000")
