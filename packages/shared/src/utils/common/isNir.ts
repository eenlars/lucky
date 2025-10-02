export const isNir = (value: unknown): value is null | undefined => {
  if (typeof value === "undefined" || value === null) return true
  if (typeof value === "string") {
    return value.length === 0 || value === "undefined" || value === "null" || value === "{}"
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return true
    return value.every(v => isNir(v))
  }
  if (typeof value === "object") {
    // More thorough empty object check
    return (
      Object.keys(value).length === 0 &&
      Object.getOwnPropertyNames(value).length === 0 &&
      Object.getOwnPropertySymbols(value).length === 0
    )
  }
  return false
}

// returns the real value if it's not null or undefined, otherwise returns defaultReturn
export const bunk = <T, S>(value: T, defaultReturn: S): T | S => {
  return isNir(value) ? defaultReturn : (value as T)
}
