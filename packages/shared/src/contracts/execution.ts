import { z } from "zod"

export const ZPrincipal = z.object({
  clerk_id: z.string(),
  scopes: z.array(z.string()),
  auth_method: z.enum(["api_key", "session"]),
})

export type Principal = z.infer<typeof ZPrincipal>
