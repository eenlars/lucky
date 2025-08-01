/**
 * Crossover strategy types and selection
 */

export type CrossoverType = {
  type: "behavioralBlend" | "structureCrossover" | "patternFusion" | "hybrid"
  aggressiveness: "aggressive" | "moderate" | "minimal"
}

/**
 * Select crossover type randomly with weighted distribution following pseudocode
 * swapSubPath: 50%, blendPrompts: 30%, handoverShuffle: 20%
 */
export function selectCrossoverType(): CrossoverType["type"] {
  const rand = Math.random()
  if (rand < 0.5) return "behavioralBlend"
  if (rand < 0.8) return "structureCrossover" // 0.5 + 0.3
  if (rand < 1.0) return "patternFusion" // 0.8 + 0.2
  return "hybrid" // fallback (should rarely be reached)
}

export function getCrossoverVariability(): {
  aggressiveness: CrossoverType["aggressiveness"]
  intensity: number
} {
  const rand = Math.random()
  if (rand < 0.3) return { aggressiveness: "aggressive", intensity: 0.6 }
  if (rand < 0.7) return { aggressiveness: "moderate", intensity: 0.4 }
  return { aggressiveness: "minimal", intensity: 0.2 }
}
