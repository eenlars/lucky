/**
 * Type-safe logging types.
 * Defines what can be logged to ensure type safety throughout the codebase.
 */

/**
 * Primitive types that can be safely logged.
 */
export type LoggablePrimitive = string | number | boolean | null | undefined

/**
 * Object types that can be logged.
 */
export type LoggableObject =
  | Error
  | Record<string, unknown>
  | Array<unknown>
  | Map<unknown, unknown>
  | Set<unknown>
  | Date

/**
 * All types that can be safely logged.
 * Note: unknown is allowed to provide flexibility during migration.
 * TODO: Remove unknown from Loggable after all usages are properly typed.
 */
export type Loggable = LoggablePrimitive | LoggableObject | unknown

/**
 * Type-safe logger interface with proper typing for all methods.
 */
export interface TypeSafeLogger {
  log<T extends Loggable[]>(...args: T): Promise<void>
  onlyIf<T extends Loggable[]>(decider: boolean, ...args: T): Promise<undefined | null>
  info<T extends Loggable[]>(...args: T): Promise<void>
  warn<T extends Loggable[]>(...args: T): Promise<void>
  error<T extends Loggable[]>(...args: T): Promise<void>
  debug<T extends Loggable[]>(...args: T): Promise<void>
  trace<T extends Loggable[]>(...args: T): Promise<void>
  logAndSave<T extends Loggable[]>(fileName: string, ...args: T): Promise<void>
  finalizeWorkflowLog(): Promise<string | null>
}
