import { type ZodRawShape, type ZodTypeAny, z } from "zod"

/**
 * Helper to give each property a .describe() from a map
 */
export function withDescriptions<S extends ZodRawShape, D extends { [K in keyof S]: string }>(
  shape: S,
  descs: D,
): z.ZodObject<S> {
  const shaped: S = {} as S
  for (const key in shape) {
    shaped[key] = (shape[key] as unknown as ZodTypeAny).describe(descs[key as keyof D]) as S[typeof key]
  }
  return z.object(shaped)
}
