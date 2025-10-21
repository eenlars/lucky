#!/usr/bin/env bun
/**
 * Script to migrate ALL database model configurations to gpt-5-nano
 *
 * This script updates:
 * 1. app.provider_settings.enabled_models (user model preferences) - APP SCHEMA
 * 2. public.NodeVersion.llm_model (historical node configurations) - PUBLIC SCHEMA
 * 3. public.WorkflowVersion.dsl (workflow configurations with gatewayModelId) - PUBLIC SCHEMA
 *
 * Note: Uses two different schemas:
 * - "app" schema: provider_settings
 * - "public" schema: NodeVersion, WorkflowVersion
 *
 * Safety features:
 * - Dry run mode by default
 * - Backup before changes
 * - Detailed logging
 *
 * Usage:
 *   bun scripts/migrate-to-gpt-5-nano.ts --dry-run    # See what would change
 *   bun scripts/migrate-to-gpt-5-nano.ts --execute    # Actually update
 *   bun scripts/migrate-to-gpt-5-nano.ts --backup     # Create backup only
 */

import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { createClient } from "@supabase/supabase-js"

// ============================================================================
// Configuration
// ============================================================================

const TARGET_MODEL = "gpt-5-nano" // Catalog ID format (provider#model)

interface MigrationStats {
  gatewaySettings: {
    totalRecords: number
    updatedRecords: number
    totalModelsReplaced: number
  }
  nodeVersions: {
    totalRecords: number
    updatedRecords: number
  }
  workflowVersions: {
    totalRecords: number
    updatedRecords: number
    totalNodesUpdated: number
  }
}

// ============================================================================
// Supabase Client Setup
// ============================================================================

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ============================================================================
// Backup Functions
// ============================================================================

async function createBackup() {
  console.log("📦 Creating backup of current model configurations...")

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupDir = join(process.cwd(), "backups")
  const backupFile = join(backupDir, `model-config-backup-${timestamp}.json`)

  const client = getClient()

  // Fetch all relevant data from their respective schemas
  const gatewaySettings = await client.schema("app").from("gateway_settings").select("*").throwOnError()
  const nodeVersions = await client.from("NodeVersion").select("*").throwOnError()
  const workflowVersions = await client.from("WorkflowVersion").select("*").throwOnError()

  const backup = {
    timestamp,
    gatewaySettings: gatewaySettings.data,
    nodeVersions: nodeVersions.data,
    workflowVersions: workflowVersions.data,
  }

  // Ensure backup directory exists
  try {
    const { mkdirSync } = await import("node:fs")
    mkdirSync(backupDir, { recursive: true })
  } catch {
    // Directory might already exist
  }

  writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`✅ Backup created: ${backupFile}`)
  console.log(`   - Gateway settings: ${gatewaySettings.data?.length ?? 0} records`)
  console.log(`   - Node versions: ${nodeVersions.data?.length ?? 0} records`)
  console.log(`   - Workflow versions: ${workflowVersions.data?.length ?? 0} records`)

  return backupFile
}

// ============================================================================
// Migration Functions
// ============================================================================

async function migrateGatewaySettings(dryRun: boolean): Promise<MigrationStats["gatewaySettings"]> {
  console.log("\n🔄 Migrating app.gateway_settings.enabled_models...")

  const client = getClient()
  const { data: records, error } = await client.schema("app").from("gateway_settings").select("*")

  if (error) throw error
  if (!records || records.length === 0) {
    console.log("   No records found")
    return { totalRecords: 0, updatedRecords: 0, totalModelsReplaced: 0 }
  }

  let updatedRecords = 0
  let totalModelsReplaced = 0

  for (const record of records) {
    const enabledModels = (record.enabled_models as string[]) || []

    // Check if any model needs updating (anything that's not already gpt-5-nano)
    const needsUpdate = enabledModels.some(model => model !== TARGET_MODEL)

    if (needsUpdate) {
      const originalCount = enabledModels.length
      const newModels = [TARGET_MODEL] // Set to single model

      console.log(`   ${dryRun ? "[DRY RUN] Would update" : "Updating"} record ${record.gateway_setting_id}:`)
      console.log(`     Provider: ${record.gateway}`)
      console.log(`     Old models: ${JSON.stringify(enabledModels)}`)
      console.log(`     New models: ${JSON.stringify(newModels)}`)

      if (!dryRun) {
        const { error: updateError } = await client
          .schema("app")
          .from("gateway_settings")
          .update({
            enabled_models: newModels,
            updated_at: new Date().toISOString(),
          })
          .eq("gateway_setting_id", record.gateway_setting_id)

        if (updateError) {
          console.error(`     ❌ Error updating: ${updateError.message}`)
          continue
        }
      }

      updatedRecords++
      totalModelsReplaced += originalCount
    }
  }

  console.log(`   Total records: ${records.length}`)
  console.log(`   ${dryRun ? "Would update" : "Updated"}: ${updatedRecords} records`)
  console.log(`   Total models replaced: ${totalModelsReplaced}`)

  return {
    totalRecords: records.length,
    updatedRecords,
    totalModelsReplaced,
  }
}

async function migrateNodeVersions(dryRun: boolean): Promise<MigrationStats["nodeVersions"]> {
  console.log("\n🔄 Migrating public.NodeVersion.llm_model...")

  const client = getClient()
  const { data: records, error } = await client
    .from("NodeVersion")
    .select("node_version_id, llm_model, node_id, wf_version_id")
    .neq("llm_model", TARGET_MODEL) // Only fetch records that need updating

  if (error) throw error
  if (!records || records.length === 0) {
    console.log("   No records need updating")
    return { totalRecords: 0, updatedRecords: 0 }
  }

  let updatedRecords = 0

  // Process in batches to avoid overwhelming the database
  const batchSize = 100
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    console.log(`   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}...`)

    for (const record of batch) {
      console.log(
        `   ${dryRun ? "[DRY RUN] Would update" : "Updating"} node version ${record.node_version_id}: ${record.llm_model} → ${TARGET_MODEL}`,
      )

      if (!dryRun) {
        const { error: updateError } = await client
          .from("NodeVersion")
          .update({
            llm_model: TARGET_MODEL,
            updated_at: new Date().toISOString(),
          })
          .eq("node_version_id", record.node_version_id)

        if (updateError) {
          console.error(`     ❌ Error updating: ${updateError.message}`)
          continue
        }
      }

      updatedRecords++
    }
  }

  console.log(`   ${dryRun ? "Would update" : "Updated"}: ${updatedRecords} records`)

  return {
    totalRecords: records.length,
    updatedRecords,
  }
}

async function migrateWorkflowVersions(dryRun: boolean): Promise<MigrationStats["workflowVersions"]> {
  console.log("\n🔄 Migrating public.WorkflowVersion.dsl (workflow configs)...")

  const client = getClient()
  const { data: records, error } = await client.from("WorkflowVersion").select("wf_version_id, dsl")

  if (error) throw error
  if (!records || records.length === 0) {
    console.log("   No records found")
    return { totalRecords: 0, updatedRecords: 0, totalNodesUpdated: 0 }
  }

  let updatedRecords = 0
  let totalNodesUpdated = 0

  for (const record of records) {
    const dsl = record.dsl as any

    if (!dsl || !dsl.nodes || !Array.isArray(dsl.nodes)) {
      console.log(`   ⚠️  Skipping workflow ${record.wf_version_id}: invalid DSL structure`)
      continue
    }

    let workflowNeedsUpdate = false
    let nodesUpdatedInWorkflow = 0

    const updatedNodes = dsl.nodes.map((node: any) => {
      if (node.gatewayModelId && node.gatewayModelId !== TARGET_MODEL) {
        console.log(
          `     ${dryRun ? "[DRY RUN] Would update" : "Updating"} node ${node.nodeId}: ${node.gatewayModelId} → ${TARGET_MODEL}`,
        )
        workflowNeedsUpdate = true
        nodesUpdatedInWorkflow++
        return { ...node, gatewayModelId: TARGET_MODEL }
      }
      return node
    })

    if (workflowNeedsUpdate) {
      console.log(
        `   ${dryRun ? "[DRY RUN] Would update" : "Updating"} workflow ${record.wf_version_id}: ${nodesUpdatedInWorkflow} nodes`,
      )

      if (!dryRun) {
        const updatedDsl = { ...dsl, nodes: updatedNodes }

        const { error: updateError } = await client
          .from("WorkflowVersion")
          .update({ dsl: updatedDsl })
          .eq("wf_version_id", record.wf_version_id)

        if (updateError) {
          console.error(`     ❌ Error updating: ${updateError.message}`)
          continue
        }
      }

      updatedRecords++
      totalNodesUpdated += nodesUpdatedInWorkflow
    }
  }

  console.log(`   Total workflows: ${records.length}`)
  console.log(`   ${dryRun ? "Would update" : "Updated"}: ${updatedRecords} workflows`)
  console.log(`   Total nodes updated: ${totalNodesUpdated}`)

  return {
    totalRecords: records.length,
    updatedRecords,
    totalNodesUpdated,
  }
}

// ============================================================================
// Main Migration Function
// ============================================================================

async function migrate(options: { dryRun: boolean; createBackup: boolean }) {
  console.log("🚀 Starting model configuration migration")
  console.log(`   Target gatewayModelId: ${TARGET_MODEL}`)
  console.log(`   Mode: ${options.dryRun ? "DRY RUN (no changes will be made)" : "EXECUTE (changes will be applied)"}`)
  console.log("")

  // Create backup if requested or if executing
  if (options.createBackup || !options.dryRun) {
    await createBackup()
  }

  const stats: MigrationStats = {
    gatewaySettings: { totalRecords: 0, updatedRecords: 0, totalModelsReplaced: 0 },
    nodeVersions: { totalRecords: 0, updatedRecords: 0 },
    workflowVersions: { totalRecords: 0, updatedRecords: 0, totalNodesUpdated: 0 },
  }

  try {
    // Run all migrations
    stats.gatewaySettings = await migrateGatewaySettings(options.dryRun)
    stats.nodeVersions = await migrateNodeVersions(options.dryRun)
    stats.workflowVersions = await migrateWorkflowVersions(options.dryRun)

    // Print summary
    console.log(`\n${"=".repeat(80)}`)
    console.log("📊 MIGRATION SUMMARY")
    console.log("=".repeat(80))
    console.log("\nGateway Settings (app.gateway_settings):")
    console.log(`  Total records: ${stats.gatewaySettings.totalRecords}`)
    console.log(`  ${options.dryRun ? "Would update" : "Updated"}: ${stats.gatewaySettings.updatedRecords}`)
    console.log(`  Models replaced: ${stats.gatewaySettings.totalModelsReplaced}`)

    console.log("\nNode Versions (public.NodeVersion):")
    console.log(`  Total records: ${stats.nodeVersions.totalRecords}`)
    console.log(`  ${options.dryRun ? "Would update" : "Updated"}: ${stats.nodeVersions.updatedRecords}`)

    console.log("\nWorkflow Versions (public.WorkflowVersion):")
    console.log(`  Total workflows: ${stats.workflowVersions.totalRecords}`)
    console.log(`  ${options.dryRun ? "Would update" : "Updated"}: ${stats.workflowVersions.updatedRecords}`)
    console.log(`  Nodes updated: ${stats.workflowVersions.totalNodesUpdated}`)

    const totalUpdates =
      stats.gatewaySettings.updatedRecords + stats.nodeVersions.updatedRecords + stats.workflowVersions.updatedRecords

    console.log(`\n${"=".repeat(80)}`)
    if (options.dryRun) {
      console.log(`✅ Dry run complete. Would update ${totalUpdates} total records.`)
      console.log("\nTo execute the migration, run:")
      console.log("  bun scripts/migrate-to-gpt-5-nano.ts --execute")
    } else {
      console.log(`✅ Migration complete! Updated ${totalUpdates} total records.`)
    }
    console.log(`${"=".repeat(80)}\n`)
  } catch (error) {
    console.error("\n❌ Migration failed:", error)
    process.exit(1)
  }
}

// ============================================================================
// CLI Handler
// ============================================================================

async function main() {
  const args = process.argv.slice(2)

  const dryRun = args.includes("--dry-run")
  const execute = args.includes("--execute")
  const backupOnly = args.includes("--backup")

  if (backupOnly) {
    await createBackup()
    return
  }

  if (!dryRun && !execute) {
    console.log("⚠️  No mode specified. Running in DRY RUN mode by default.")
    console.log("   Use --execute to apply changes, or --dry-run to explicitly preview.\n")
  }

  await migrate({
    dryRun: !execute,
    createBackup: true,
  })
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
