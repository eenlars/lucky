"use server"
import { supabase } from "@utils/clients/supabase/client"

/**
 * Cleanup function that removes WorkflowInvocations associated with EvolutionRuns
 * where the description (goal_text or notes) contains "test" (case-insensitive)
 */
export const cleanupTestEvolutionRunInvocations = async () => {
  // 1. Find EvolutionRuns with test-related descriptions
  const { data: testRuns, error: runsError } = await supabase
    .from("EvolutionRun")
    .select("run_id")
    .or("goal_text.ilike.%test%,notes.ilike.%test%")

  if (runsError) throw runsError

  if (!testRuns || testRuns.length === 0) {
    return {
      success: true,
      deletedInvocations: 0,
      testRunIds: [],
      message: "No EvolutionRuns with 'test' in description found",
    }
  }

  const runIds = testRuns.map((run) => run.run_id)

  // 2. Delete WorkflowInvocations referencing those runs
  const { error: invocationsError, count } = await supabase
    .from("WorkflowInvocation")
    .delete()
    .in("run_id", runIds)

  if (invocationsError) throw invocationsError

  return {
    success: true,
    deletedInvocations: count || 0,
    testRunIds: runIds,
    message: `Deleted ${count || 0} WorkflowInvocations from ${runIds.length} test EvolutionRuns`,
  }
}

/**
 * Alternative cleanup function that also removes the EvolutionRuns themselves
 * Use with caution as this removes the run records entirely
 */
export const cleanupTestEvolutionRunsCompletely = async () => {
  console.log("🔍 Starting complete cleanup process...")

  // 1. Find EvolutionRuns with test-related descriptions
  console.log("📋 Step 1: Finding test EvolutionRuns...")
  const { data: testRuns, error: runsError } = await supabase
    .from("EvolutionRun")
    .select("run_id")
    .or("goal_text.ilike.%test%,notes.ilike.%test%")

  if (runsError) {
    console.error("❌ Error finding test runs:", runsError)
    throw runsError
  }

  if (!testRuns || testRuns.length === 0) {
    console.log("ℹ️ No test EvolutionRuns found")
    return {
      success: true,
      deletedInvocations: 0,
      deletedRuns: 0,
      testRunIds: [],
      message: "No EvolutionRuns with 'test' in description found",
    }
  }

  const runIds = testRuns.map((run) => run.run_id)
  console.log(`📊 Found ${runIds.length} test EvolutionRuns to delete`)
  console.log(
    `🔗 Run IDs: ${runIds.slice(0, 5).join(", ")}${runIds.length > 5 ? "..." : ""}`
  )

  // 2. Delete WorkflowInvocations first (foreign key constraint)
  console.log("🗑️ Step 2: Deleting WorkflowInvocations...")
  const invocationsDeleteResult = await supabase
    .from("WorkflowInvocation")
    .delete()
    .in("run_id", runIds)

  if (invocationsDeleteResult.error) {
    console.error(
      "❌ Error deleting WorkflowInvocations:",
      invocationsDeleteResult.error
    )
    throw invocationsDeleteResult.error
  }

  const invocationsCount = invocationsDeleteResult.count || 0
  console.log(`✅ Deleted ${invocationsCount} WorkflowInvocations`)

  // 3. Delete the EvolutionRuns themselves
  console.log("🗑️ Step 3: Deleting EvolutionRuns...")
  const runsDeleteResult = await supabase
    .from("EvolutionRun")
    .delete()
    .in("run_id", runIds)

  if (runsDeleteResult.error) {
    console.error("❌ Error deleting EvolutionRuns:", runsDeleteResult.error)
    console.error(
      "Full error object:",
      JSON.stringify(runsDeleteResult.error, null, 2)
    )
    throw runsDeleteResult.error
  }

  // For delete operations, we might need to explicitly get the count
  const actualDeletedCount = runIds.length // We know we tried to delete all of them
  console.log(`✅ Attempted to delete ${actualDeletedCount} EvolutionRuns`)

  // Let's verify the deletion worked by querying again
  console.log("🔍 Step 4: Verifying deletion...")
  const { data: remainingRuns, error: verifyError } = await supabase
    .from("EvolutionRun")
    .select("run_id")
    .in("run_id", runIds)

  if (verifyError) {
    console.error("❌ Error verifying deletion:", verifyError)
  } else {
    const remainingCount = remainingRuns?.length || 0
    const actuallyDeleted = runIds.length - remainingCount
    console.log(
      `📊 Verification: ${actuallyDeleted} EvolutionRuns actually deleted, ${remainingCount} remaining`
    )

    return {
      success: true,
      deletedInvocations: invocationsCount,
      deletedRuns: actuallyDeleted,
      testRunIds: runIds,
      message: `Deleted ${invocationsCount} WorkflowInvocations and ${actuallyDeleted} EvolutionRuns`,
    }
  }

  return {
    success: true,
    deletedInvocations: invocationsCount,
    deletedRuns: actualDeletedCount,
    testRunIds: runIds,
    message: `Deleted ${invocationsCount} WorkflowInvocations and ${actualDeletedCount} EvolutionRuns`,
  }
}

/**
 * Preview function to see what would be cleaned up without actually deleting
 */
export const previewTestEvolutionRunCleanup = async () => {
  // Find EvolutionRuns with test-related descriptions
  const { data: testRuns, error: runsError } = await supabase
    .from("EvolutionRun")
    .select("run_id, goal_text, notes, status, start_time")
    .or("goal_text.ilike.%test%,notes.ilike.%test%")

  if (runsError) throw runsError

  if (!testRuns || testRuns.length === 0) {
    return {
      testRuns: [],
      invocationsCount: 0,
      message: "No EvolutionRuns with 'test' in description found",
    }
  }

  const runIds = testRuns.map((run) => run.run_id)

  // Count WorkflowInvocations that would be deleted
  const { data: invocations, error: invocationsError } = await supabase
    .from("WorkflowInvocation")
    .select("wf_invocation_id", { count: "exact" })
    .in("run_id", runIds)

  if (invocationsError) throw invocationsError

  return {
    testRuns,
    invocationsCount: invocations?.length || 0,
    message: `Found ${testRuns.length} test EvolutionRuns with ${invocations?.length || 0} associated WorkflowInvocations`,
  }
}
