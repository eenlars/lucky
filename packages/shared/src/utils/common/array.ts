/**
 * Ensure input is an array. Converts single values to array, returns empty array for null/undefined
 */
export const asArray = <T = any>(input: unknown): T[] =>
  Array.isArray(input) ? input : input == null ? [] : [input as T]
