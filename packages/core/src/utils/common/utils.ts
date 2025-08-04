// just like in the database
export const genShortId = () => {
  const fullUuid = crypto.randomUUID().replace(/-/g, "")
  return fullUuid.substring(0, 8)
}

export const asArray = <T = any>(input: unknown): T[] =>
  Array.isArray(input) ? input : input == null ? [] : [input as T]
