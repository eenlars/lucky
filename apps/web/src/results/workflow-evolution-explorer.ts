/* eslint-disable no-restricted-imports */
import { createStandaloneClient } from "@/lib/supabase/standalone"

// test with the actual invocation ID to see what data we have
export async function exploreWorkflowInvocation(invocationId: string) {
  const supabase = createStandaloneClient(true)
  console.log(`Exploring workflow invocation: ${invocationId}`)

  // get the workflow invocation
  const { data: invocation, error } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("wf_invocation_id", invocationId)
    .single()

  if (error) {
    console.error("Error fetching invocation:", error)
    return null
  }

  console.log("Invocation data:", {
    id: invocation.wf_invocation_id,
    version_id: invocation.wf_version_id,
    run_id: invocation.run_id,
    generation_id: invocation.generation_id,
    accuracy: invocation.accuracy,
    fitness_score: invocation.fitness_score,
    status: invocation.status,
    start_time: invocation.start_time,
    end_time: invocation.end_time,
  })

  return invocation
}

// explore the workflow version and evolution data
export async function exploreEvolutionChain(invocationId: string) {
  const supabase = createStandaloneClient(true)
  console.log("\n=== EXPLORING EVOLUTION CHAIN ===")

  // start with the invocation
  const invocation = await exploreWorkflowInvocation(invocationId)
  if (!invocation) return null

  console.log("\n--- WORKFLOW VERSION ---")
  // get the workflow version
  const { data: workflowVersion, error: versionError } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("wf_version_id", invocation.wf_version_id)
    .single()

  if (versionError) {
    console.error("Error fetching workflow version:", versionError)
    return null
  }

  console.log("Workflow version data:", {
    id: workflowVersion.wf_version_id,
    operation: workflowVersion.operation,
    parent_id: workflowVersion.parent_id,
    parent1_id: workflowVersion.parent1_id,
    parent2_id: workflowVersion.parent2_id,
    generation_id: workflowVersion.generation_id,
    commit_message: workflowVersion.commit_message,
    created_at: workflowVersion.created_at,
  })

  console.log("\n--- GENERATION ---")
  // get the generation info
  if (workflowVersion.generation_id) {
    const { data: generation, error: genError } = await supabase
      .from("Generation")
      .select("*")
      .eq("generation_id", workflowVersion.generation_id)
      .single()

    if (!genError && generation) {
      console.log("Generation:", {
        id: generation.generation_id,
        number: generation.number,
        run_id: generation.run_id,
        best_workflow_version_id: generation.best_workflow_version_id,
        comment: generation.comment,
        start_time: generation.start_time,
        end_time: generation.end_time,
      })
    }
  }

  console.log("\n--- EVOLUTION RUN ---")
  // get the evolution run
  if (invocation.run_id) {
    const { data: evolutionRun, error: runError } = await supabase
      .from("EvolutionRun")
      .select("*")
      .eq("run_id", invocation.run_id)
      .single()

    if (!runError && evolutionRun) {
      console.log("Evolution run:", {
        run_id: evolutionRun.run_id,
        goal_text: evolutionRun.goal_text,
        status: evolutionRun.status,
        start_time: evolutionRun.start_time,
        end_time: evolutionRun.end_time,
        config: evolutionRun.config,
      })
    }
  }

  return { invocation, workflowVersion }
}

// get all invocations from the same evolution run
export async function exploreEvolutionRunInvocations(runId: string) {
  const supabase = createStandaloneClient(true)
  console.log(`\n=== EXPLORING ALL INVOCATIONS IN RUN ${runId} ===`)

  const { data: invocations, error } = await supabase
    .from("WorkflowInvocation")
    .select("*")
    .eq("run_id", runId)
    .order("start_time", { ascending: true })

  if (error) {
    console.error("Error fetching invocations:", error)
    return
  }

  console.log(`Found ${invocations.length} invocations in this run`)

  // show progression
  invocations.forEach((inv, index) => {
    console.log(`${index + 1}. ${inv.wf_invocation_id}:`, {
      accuracy: inv.accuracy,
      fitness_score: inv.fitness_score,
      status: inv.status,
      start_time: inv.start_time,
      generation_id: inv.generation_id,
    })
  })

  return invocations
}

// get all workflow versions from the same generation
export async function exploreGenerationVersions(generationId: string) {
  const supabase = createStandaloneClient(true)
  console.log(`\n=== EXPLORING ALL VERSIONS IN GENERATION ${generationId} ===`)

  const { data: versions, error } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("generation_id", generationId)
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching versions:", error)
    return
  }

  console.log(`Found ${versions.length} versions in this generation`)

  versions.forEach((version, index) => {
    console.log(`${index + 1}. ${version.wf_version_id}:`, {
      operation: version.operation,
      parent_id: version.parent_id,
      commit_message: `${version.commit_message?.substring(0, 80)}...`,
      created_at: version.created_at,
    })
  })

  return versions
}

// test calls
exploreEvolutionChain("b463376e")
  .then(async result => {
    console.log("\n=== EXPLORATION COMPLETE ===")

    if (result?.invocation.run_id) {
      await exploreEvolutionRunInvocations(result.invocation.run_id)
    }

    if (result?.invocation.generation_id) {
      await exploreGenerationVersions(result.invocation.generation_id)
    }
  })
  .catch(err => {
    console.error("Exploration failed:", err)
  })
