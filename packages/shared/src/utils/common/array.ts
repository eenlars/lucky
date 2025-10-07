/**
 * Ensure input is an array. Converts single values to array, returns empty array for null/undefined
 */
export const asArray = <T>(input: T | T[] | null | undefined): T[] =>
  Array.isArray(input) ? input : input == null ? [] : [input]
