/**
 * Minimal database types for standalone core.
 * Copied from @lucky/shared but simplified for core's needs.
 *
 * These types are used primarily for Supabase persistence, which is optional in core.
 * For full database schema, see @lucky/shared/database.types.ts
 */

/**
 * Generic JSON type compatible with Supabase/PostgreSQL JSON columns
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

/**
 * Placeholder for database enums.
 * Actual enum types are defined in the full database schema.
 */
export type Enums<T extends string = string> = T

/**
 * Generic placeholder for table row types.
 * Actual table types are defined in the full database schema.
 */
export type Tables<T extends string = string> = Record<string, any>

/**
 * Generic placeholder for table insert types.
 * Actual insert types are defined in the full database schema.
 */
export type TablesInsert<T extends string = string> = Record<string, any>

/**
 * Generic placeholder for table update types.
 * Actual update types are defined in the full database schema.
 */
export type TablesUpdate<T extends string = string> = Record<string, any>

/**
 * Minimal database type for core standalone operation.
 * For full schema, import from @lucky/shared in the monorepo.
 */
export type Database = {
  public: {
    Tables: Record<string, any>
    Enums: Record<string, any>
  }
}