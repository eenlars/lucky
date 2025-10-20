// interface for genetic programming evaluators

import type { Genome } from "@core/improvement/gp/Genome"
import type { GenomeEvaluationResults } from "@core/improvement/gp/resources/gp.types"
import type { RS } from "@lucky/shared"

export interface EvolutionEvaluator {
  evaluate(
    genome: Genome,
    evolutionContext?: {
      runId: string
      generationId: string
    },
  ): Promise<RS<GenomeEvaluationResults>>
}
