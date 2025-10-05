/* eslint-disable no-restricted-imports */
"use server"

import { supabase } from "@/lib/supabase"
import type { Tables } from "@lucky/shared/client"

import type { EvolutionGraph, EvolutionNode } from "@/lib/evolution-utils"

export async function traceWorkflowEvolution(invocationId: string): Promise<EvolutionGraph | null> {
  console.log(`Tracing evolution for invocation: ${invocationId}`)

  // 1. get the target invocation
  const { data: targetInvocation, error: invError } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("wf_invocation_id", invocationId)
    .maybeSingle()

  if (invError || !targetInvocation) {
    console.error("Failed to fetch target invocation:", invError)
    return null
  }

  // 2. get the workflow version
  const { data: targetVersion, error: versionError } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("wf_version_id", targetInvocation.wf_version_id)
    .maybeSingle()

  if (versionError || !targetVersion) {
    console.error("Failed to fetch target version:", versionError)
    return null
  }

  // 3. get evolution run info
  let evolutionRun = null
  if (targetInvocation.run_id) {
    const { data: runData, error: runError } = await supabase
      .from("EvolutionRun")
      .select("*")
      .eq("run_id", targetInvocation.run_id)
      .single()

    if (!runError && runData) {
      evolutionRun = {
        runId: runData.run_id,
        goalText: runData.goal_text,
        status: runData.status,
        startTime: runData.start_time,
        endTime: runData.end_time || "",
        config: runData.config,
      }
    }
  }

  // 4. get generation info
  let generation = null
  if (targetInvocation.generation_id) {
    const { data: genData, error: genError } = await supabase
      .from("Generation")
      .select("*")
      .eq("generation_id", targetInvocation.generation_id)
      .single()

    if (!genError && genData) {
      generation = {
        generationId: genData.generation_id,
        number: genData.number,
        startTime: genData.start_time,
        endTime: genData.end_time || "",
      }
    }
  }

  // 5. get all invocations from the same evolution run
  let allInvocations: Tables<"WorkflowInvocation">[] = []
  let allVersions: Tables<"WorkflowVersion">[] = []
  let allGenerations: Tables<"Generation">[] = []

  if (targetInvocation.run_id) {
    const { data: invocations, error: invocationsError } = await supabase
      .from("WorkflowInvocation")
      .select("*")
      .eq("run_id", targetInvocation.run_id)
      .order("start_time", { ascending: true })

    if (!invocationsError && invocations) {
      allInvocations = invocations
    }

    // get all versions for these invocations
    const versionIds = allInvocations.map(inv => inv.wf_version_id)
    if (versionIds.length > 0) {
      const { data: versions, error: versionsError } = await supabase
        .from("WorkflowVersion")
        .select("*")
        .in("wf_version_id", versionIds)

      if (!versionsError && versions) {
        allVersions = versions
      }
    }

    // get all generations for this run
    const { data: generations, error: generationsError } = await supabase
      .from("Generation")
      .select("*")
      .eq("run_id", targetInvocation.run_id)
      .order("number", { ascending: true })

    if (!generationsError && generations) {
      allGenerations = generations
    }
  } else {
    // single invocation run
    allInvocations = [targetInvocation]
    allVersions = [targetVersion]
  }

  // 6. create evolution nodes
  const allNodes: EvolutionNode[] = allInvocations.map(inv => {
    const version = allVersions.find(v => v.wf_version_id === inv.wf_version_id)

    // Find the generation for this invocation
    const invGeneration = allGenerations.find(g => g.generation_id === inv.generation_id)

    const startTime = new Date(inv.start_time)
    const endTime = inv.end_time ? new Date(inv.end_time) : null
    const duration = endTime ? endTime.getTime() - startTime.getTime() : null

    return {
      invocationId: inv.wf_invocation_id,
      versionId: inv.wf_version_id,
      runId: inv.run_id || undefined,
      generationId: inv.generation_id || undefined,
      generationNumber: invGeneration?.number || generation?.number,
      accuracy: inv.accuracy || undefined,
      fitnessScore: inv.fitness_score || undefined,
      status: inv.status,
      operation: version?.operation || "unknown",
      commitMessage: version?.commit_message || "",
      parentId: version?.parent_id || undefined,
      parent1Id: version?.parent1_id || undefined,
      parent2Id: version?.parent2_id || undefined,
      startTime: inv.start_time,
      endTime: inv.end_time || undefined,
      duration: duration || undefined,
      dsl:
        version?.dsl && typeof version.dsl === "object" && version.dsl !== null
          ? (version.dsl as Record<string, unknown>)
          : undefined,
      usdCost: inv.usd_cost,
    }
  })

  // 7. create accuracy progression
  const accuracyProgression = allNodes
    .filter(node => node.accuracy !== undefined && node.status === "completed")
    .map((node, index) => ({
      invocationId: node.invocationId,
      accuracy: node.accuracy!,
      timestamp: node.startTime,
      order: index + 1,
      generationNumber: node.generationNumber,
    }))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  // 8. calculate statistics
  const successfulNodes = allNodes.filter(n => n.status === "completed")
  const failedNodes = allNodes.filter(n => n.status === "failed")
  const accuracies = successfulNodes.filter(n => n.accuracy !== undefined).map(n => n.accuracy!)
  const fitnessScores = successfulNodes.filter(n => n.fitnessScore !== undefined).map(n => n.fitnessScore!)

  const stats = {
    totalInvocations: allNodes.length,
    successfulInvocations: successfulNodes.length,
    failedInvocations: failedNodes.length,
    averageAccuracy: accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0,
    maxAccuracy: accuracies.length > 0 ? Math.max(...accuracies) : 0,
    peakFitnessScore: fitnessScores.length > 0 ? Math.max(...fitnessScores) : 0,
    totalCost: allNodes.reduce((sum, n) => sum + (n.usdCost || 0), 0),
    totalDuration: evolutionRun
      ? new Date(evolutionRun.endTime || new Date()).getTime() - new Date(evolutionRun.startTime).getTime()
      : 0,
  }

  // 9. find target node
  const targetNode = allNodes.find(n => n.invocationId === invocationId)!

  return {
    targetNode,
    allNodes,
    accuracyProgression,
    evolutionRun: {
      ...evolutionRun!,
      config:
        evolutionRun!.config && typeof evolutionRun!.config === "object" && evolutionRun!.config !== null
          ? (evolutionRun!.config as Record<string, unknown>)
          : {},
    },
    generation: generation!,
    stats,
  }
}
