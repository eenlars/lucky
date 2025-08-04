// interface for genetic programming evaluators

import type { RS } from "@/utils/types"
import type { Genome } from "@gp/Genome"
import type { GenomeEvaluationResults } from "@gp/resources/gp.types"

export interface EvolutionEvaluator {
  evaluate(
    genome: Genome,
    evolutionContext?: {
      runId: string
      generationId: string
    }
  ): Promise<RS<GenomeEvaluationResults>>
}
