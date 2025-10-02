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
  dsl?: Record<string, unknown>

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
    config: Record<string, unknown>
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
  // Defensive guards: tolerate partial graphs (e.g., no explicit target node)
  const targetNode: EvolutionNode | undefined =
    graph.targetNode || graph.allNodes.find(n => n.status === "completed") || graph.allNodes[graph.allNodes.length - 1]

  const totalInvocations: number = graph.stats?.totalInvocations ?? graph.allNodes.length ?? 0
  const successfulInvocations: number =
    graph.stats?.successfulInvocations ?? graph.allNodes.filter(n => n.status === "completed").length
  const successRateStr = totalInvocations > 0 ? ((successfulInvocations / totalInvocations) * 100).toFixed(1) : "0.0"
  const peakAccuracy: number =
    graph.stats?.maxAccuracy ??
    (graph.allNodes.length > 0
      ? Math.max(0, ...graph.allNodes.map(n => (typeof n.accuracy === "number" ? n.accuracy : 0)))
      : 0)
  const totalCostStr = (graph.stats?.totalCost ?? 0).toFixed(4)
  const evolutionDurationHours = Math.round((graph.stats?.totalDuration ?? 0) / (1000 * 60 * 60))

  return {
    // summary info
    summary: {
      targetAccuracy: targetNode?.accuracy ?? peakAccuracy ?? 0,
      targetFitness: targetNode?.fitnessScore ?? graph.stats?.peakFitnessScore ?? 0,
      evolutionGoal: graph.evolutionRun?.goalText ?? "",
      totalIterations: totalInvocations,
      successRate: successRateStr,
      peakAccuracy: peakAccuracy,
      totalCost: totalCostStr,
      evolutionDuration: evolutionDurationHours, // hours
    },

    // timeline data for visualization
    timeline: graph.accuracyProgression.map((point, index) => ({
      x: index,
      y: point.accuracy,
      invocationId: point.invocationId,
      timestamp: point.timestamp,
      isTarget: targetNode ? point.invocationId === targetNode.invocationId : false,
      generationNumber: point.generationNumber,
    })),

    // group invocations by generation for visualization
    invocationsByGeneration: (() => {
      const grouped = new Map<number, typeof graph.allNodes>()
      graph.allNodes.forEach(node => {
        if (node.generationNumber !== undefined && node.accuracy !== undefined && node.status === "completed") {
          if (!grouped.has(node.generationNumber)) {
            grouped.set(node.generationNumber, [])
          }
          grouped.get(node.generationNumber)!.push(node)
        }
      })
      return Array.from(grouped.entries())
        .map(([gen, nodes]) => ({
          generation: gen,
          invocations: nodes.map(n => ({
            invocationId: n.invocationId,
            accuracy: n.accuracy,
            startTime: n.startTime,
          })),
          averageAccuracy: nodes.reduce((sum, n) => sum + (n.accuracy || 0), 0) / nodes.length,
        }))
        .sort((a, b) => a.generation - b.generation)
    })(),

    // nodes for graph visualization
    nodes: graph.allNodes.map(node => ({
      id: node.invocationId,
      accuracy: node.accuracy || 0,
      fitness: node.fitnessScore || 0,
      status: node.status,
      operation: node.operation,
      timestamp: node.startTime,
      isTarget: targetNode ? node.invocationId === targetNode.invocationId : false,
      duration: node.duration || 0,
      cost: node.usdCost || 0,
    })),

    // key milestones
    milestones: graph.accuracyProgression
      .filter((point, index, arr) => {
        // include first, last, target, and significant jumps
        if (index === 0 || index === arr.length - 1) return true
        if (targetNode && point.invocationId === targetNode.invocationId) return true

        const prevAccuracy = index > 0 ? arr[index - 1].accuracy : 0
        return point.accuracy - prevAccuracy >= 10 // 10% jump
      })
      .map(point => ({
        invocationId: point.invocationId,
        accuracy: point.accuracy,
        timestamp: point.timestamp,
        isTarget: targetNode ? point.invocationId === targetNode.invocationId : false,
        description:
          targetNode && point.invocationId === targetNode.invocationId
            ? `Target reached: ${point.accuracy}% accuracy`
            : `Milestone: ${point.accuracy}% accuracy`,
      })),
  }
}
