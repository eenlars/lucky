/**
 * Combined Supabase database types from all schemas
 * Each schema is exported individually for granular imports
 */

// Export each schema's Database type with a distinct name
export type { Database as PublicDatabase } from "./public.types"
export type { Database as IamDatabase } from "./iam.types"
export type { Database as LockboxDatabase } from "./lockbox.types"
export type { Database as AppDatabase } from "./app.types"
export type { Database as MCPDatabase } from "./mcp.types"

// Export Json type from public
export type { Json } from "./public.types"

import type { Database as AppDB } from "./app.types"
import type { Database as IamDB } from "./iam.types"
import type { Database as LockboxDB } from "./lockbox.types"
import type { Database as MCPDB } from "./mcp.types"
// Combined database type (intersection of all schemas)
import type { Database as PublicDB } from "./public.types"

export type Database = PublicDB & IamDB & LockboxDB & AppDB & MCPDB

// Helper types that work with the merged Database type
export type { Enums, Tables, TablesInsert, TablesUpdate } from "./public.types"
