import { z } from "zod"

export const OpeningTimesSchema = z.object({
  monday: z.string(),
  tuesday: z.string(),
  wednesday: z.string(),
  thursday: z.string(),
  friday: z.string(),
  saturday: z.string(),
  sunday: z.string(),
})

export const StoreSchema = z.array(
  z.object({
    name: z.string().describe("Store name with location identifier"),
    address: z.string().describe("Street address only"),
    city: z.string().describe("City name"),
    country: z.string().describe("Country name"),
    postcode: z.string().describe("Postal/ZIP code"),
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .describe("Latitude and longitude coordinates"),
    bcorp_id: z
      .number()
      .int()
      .describe("B Corp certification ID (optional)")
      .nullish(),
    is_headquarters: z
      .boolean()
      .describe("True if this store is a headquarters (optional)")
      .nullish(),
    opening_times: OpeningTimesSchema.nullish(),
    owner_imgs: z
      .array(z.string().url())
      .describe("URLs of owner images (optional)")
      .nullish(),
  })
)

export const SkipReasonSchema = z.object({
  result: z.null(),
  reason: z
    .string()
    .describe("Reason why no store data was found or why it was skipped"),
})

export const OutputSchema = z.union([StoreSchema, SkipReasonSchema])

export type Store = z.infer<typeof StoreSchema>
export type SkipReason = z.infer<typeof SkipReasonSchema>
export type ExpectedOutput = z.infer<typeof OutputSchema>
