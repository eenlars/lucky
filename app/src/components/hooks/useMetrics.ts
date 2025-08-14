import { useState } from "react"
import type { Metrics } from "../types/evaluation"
import { FAKE_OUTPUTS } from "../types/evaluation"

export function useMetrics() {
  const [metrics, setMetrics] = useState<Metrics>({
    score: null,
    time: null,
    cost: null,
    output: null,
  })

  const simulateMetrics = () => {
    setMetrics({
      score: Math.round(Math.random() * 100),
      time: `${(Math.random() * 10 + 1).toFixed(1)}s`,
      cost: `$${(Math.random() * 0.1).toFixed(3)}`,
      output: FAKE_OUTPUTS[Math.floor(Math.random() * FAKE_OUTPUTS.length)],
    })
  }

  const resetMetrics = () => {
    setMetrics({
      score: null,
      time: null,
      cost: null,
      output: null,
    })
  }

  return {
    metrics,
    setMetrics,
    simulateMetrics,
    resetMetrics
  }
}