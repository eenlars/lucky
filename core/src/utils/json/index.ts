/**
 * JSON utilities and database types for standalone core.
 * Replaces dependencies on @lucky/shared.
 */

export { JSONN, isJSON, show } from "./jsonParse"
export type { Json, Database, Enums, Tables, TablesInsert, TablesUpdate } from "@lucky/shared"
