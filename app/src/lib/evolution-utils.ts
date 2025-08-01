// Client-side utilities for evolution visualization
// No "use server" directive - these are client-side functions

export interface EvolutionNode {
  // core identifiers
  invocationId: string
  versionId: string

  // evolution context
  runId?: string
  generationId?: string
  generationNumber?: number

  // performance metrics
  accuracy?: number
  fitnessScore?: number
  status: string

  // workflow metadata
  operation: string
  commitMessage: string

  // genealogy
  parentId?: string
  parent1Id?: string
  parent2Id?: string

  // timing
  startTime: string
  endTime?: string
  duration?: number

  // workflow structure
  dsl?: any

  // costs
  usdCost?: number
}

export interface EvolutionGraph {
  // the target invocation that achieved 70% accuracy
  targetNode: EvolutionNode

  // all nodes in the evolution run
  allNodes: EvolutionNode[]

  // progression timeline
  accuracyProgression: Array<{
    invocationId: string
    accuracy: number
    timestamp: string
    order: number
    generationNumber?: number
  }>

  // evolution metadata
  evolutionRun: {
    runId: string
    goalText: string
    status: string
    startTime: string
    endTime: string
    config: any
  }

  // generation info
  generation: {
    generationId: string
    number: number
    startTime: string
    endTime: string
  }

  // statistics
  stats: {
    totalInvocations: number
    successfulInvocations: number
    failedInvocations: number
    averageAccuracy: number
    maxAccuracy: number
    peakFitnessScore: number
    totalCost: number
    totalDuration: number
  }
}

// export function to create visualization data
export function createEvolutionVisualizationData(graph: EvolutionGraph) {
  return {
    // summary info
    summary: {
      targetAccuracy: graph.targetNode.accuracy,
      targetFitness: graph.targetNode.fitnessScore,
      evolutionGoal: graph.evolutionRun.goalText,
      totalIterations: graph.stats.totalInvocations,
      successRate: (
        (graph.stats.successfulInvocations / graph.stats.totalInvocations) *
        100
      ).toFixed(1),
      peakAccuracy: graph.stats.maxAccuracy,
      totalCost: graph.stats.totalCost.toFixed(4),
      evolutionDuration: Math.round(
        graph.stats.totalDuration / (1000 * 60 * 60)
      ), // hours
    },

    // timeline data for visualization
    timeline: graph.accuracyProgression.map((point, index) => ({
      x: index,
      y: point.accuracy,
      invocationId: point.invocationId,
      timestamp: point.timestamp,
      isTarget: point.invocationId === graph.targetNode.invocationId,
      generationNumber: point.generationNumber,
    })),

    // group invocations by generation for visualization
    invocationsByGeneration: (() => {
      const grouped = new Map<number, typeof graph.allNodes>()
      graph.allNodes.forEach((node) => {
        if (
          node.generationNumber !== undefined &&
          node.accuracy !== undefined &&
          node.status === "completed"
        ) {
          if (!grouped.has(node.generationNumber)) {
            grouped.set(node.generationNumber, [])
          }
          grouped.get(node.generationNumber)!.push(node)
        }
      })
      return Array.from(grouped.entries())
        .map(([gen, nodes]) => ({
          generation: gen,
          invocations: nodes.map((n) => ({
            invocationId: n.invocationId,
            accuracy: n.accuracy,
            startTime: n.startTime,
          })),
          averageAccuracy:
            nodes.reduce((sum, n) => sum + (n.accuracy || 0), 0) / nodes.length,
        }))
        .sort((a, b) => a.generation - b.generation)
    })(),

    // nodes for graph visualization
    nodes: graph.allNodes.map((node) => ({
      id: node.invocationId,
      accuracy: node.accuracy || 0,
      fitness: node.fitnessScore || 0,
      status: node.status,
      operation: node.operation,
      timestamp: node.startTime,
      isTarget: node.invocationId === graph.targetNode.invocationId,
      duration: node.duration || 0,
      cost: node.usdCost || 0,
    })),

    // key milestones
    milestones: graph.accuracyProgression
      .filter((point, index, arr) => {
        // include first, last, target, and significant jumps
        if (index === 0 || index === arr.length - 1) return true
        if (point.invocationId === graph.targetNode.invocationId) return true

        const prevAccuracy = index > 0 ? arr[index - 1].accuracy : 0
        return point.accuracy - prevAccuracy >= 10 // 10% jump
      })
      .map((point) => ({
        invocationId: point.invocationId,
        accuracy: point.accuracy,
        timestamp: point.timestamp,
        isTarget: point.invocationId === graph.targetNode.invocationId,
        description:
          point.invocationId === graph.targetNode.invocationId
            ? `Target reached: ${point.accuracy}% accuracy`
            : `Milestone: ${point.accuracy}% accuracy`,
      })),
  }
}
