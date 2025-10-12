/**
 * Combined Supabase database types from all schemas
 * This merges public, iam, lockbox, app, and mcp schemas into a single Database type
 */

import type { Database as AppDatabase } from "./app.types"
import type { Database as CoreDatabase } from "./database.types"
import type { Database as MCPDatabase } from "./mcp.types"

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = CoreDatabase & AppDatabase & MCPDatabase

// Re-export helper types from database.types
export type { Enums, Tables, TablesInsert, TablesUpdate } from "./database.types"
