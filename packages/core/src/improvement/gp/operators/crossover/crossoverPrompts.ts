/**
 * prompts for llm-based genetic operations
 */

export class GeneticPrompts {
  /**
   * Crossover following the genetic algorithm structure
   */
  static crossoverWorkflows(
    parent1: string,
    parent2: string,
    crossoverInstructions: string,
    aggression: number,
  ): string {
    return `you are an expert in genetic programming for workflow evolution.

PARENT 1 (base workflow):
${parent1}

PARENT 2 (donor workflow):
${parent2}

CROSSOVER OPERATION:
${crossoverInstructions}

REQUIREMENTS:
1. start with parent1 as the base structure (deepClone equivalent)
2. apply the specific crossover operation as instructed
3. maintain valid workflow structure and connectivity
4. preserve essential task capabilities
5. use aggression level ${aggression} to control modification intensity
6. ensure all nodes have valid handoffs and tools

respond with only the resulting workflow configuration - no explanations, quotes, or markdown.`
  }
}
