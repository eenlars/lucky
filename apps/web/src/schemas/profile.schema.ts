import { z } from "zod"

export const PROFILE_FIELD_LIMITS = {
  about: 500,
  goals: 500,
} as const

export const personalProfileSchema = z.object({
  about: z
    .string()
    .max(PROFILE_FIELD_LIMITS.about, `About must be ${PROFILE_FIELD_LIMITS.about} characters or less`)
    .nullish()
    .transform(val => val?.trim() || undefined),
  goals: z
    .string()
    .max(PROFILE_FIELD_LIMITS.goals, `Goals must be ${PROFILE_FIELD_LIMITS.goals} characters or less`)
    .nullish()
    .transform(val => val?.trim() || undefined),
})

export type PersonalProfile = z.infer<typeof personalProfileSchema>
