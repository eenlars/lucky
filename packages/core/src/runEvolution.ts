import type { CoreContext } from './interfaces'
import type { EvaluationInput } from '@workflow/ingestion/ingestion.types'

export interface EvolutionOptions {
  mode?: 'cultural' | 'genetic'
}

export async function runEvolution(
  context: CoreContext,
  input: EvaluationInput,
  options: EvolutionOptions = {}
) {
  const { logger, runtime } = context
  const mode = options.mode || runtime.CONFIG.evolution.mode
  
  logger.info(`Starting evolution in ${mode} mode`)
  
  if (mode === 'cultural') {
    // Import and run cultural evolution
    const { default: culturalMain } = await import('./main')
    return await culturalMain()
  } else {
    // Import and run genetic programming
    const { EvolutionEngine } = await import('@improvement/gp/evolutionengine')
    const engine = new EvolutionEngine()
    return await engine.run(input)
  }
}