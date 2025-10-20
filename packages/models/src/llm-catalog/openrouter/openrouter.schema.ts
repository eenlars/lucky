import { z } from "zod"

/** Reusable enums / helpers */
const IOmodality = z.enum(["text", "image", "file", "audio"])

/** architecture */
const ArchitectureSchema = z.object({
  // e.g. "text->text", "text+image->text+image"
  modality: z.string(),
  input_modalities: z.array(IOmodality),
  output_modalities: z.array(IOmodality),
  tokenizer: z.string(),
  instruct_type: z.string().nullable().optional(),
})

/** pricing: numbers are provided as strings in the sample */
const PricingSchema = z
  .object({
    prompt: z.string().optional(),
    completion: z.string().optional(),
    request: z.string().optional(),
    image: z.string().optional(),
    web_search: z.string().optional(),
    internal_reasoning: z.string().optional(),
    input_cache_read: z.string().optional(),
    input_cache_write: z.string().optional(),
  })
  // allow unexpected provider-specific keys like future pricing fields
  .passthrough()

/** top_provider */
const TopProviderSchema = z.object({
  context_length: z.number(),
  max_completion_tokens: z.number().nullable().optional(),
  is_moderated: z.boolean(),
})

/** limits can be null or (future) object */
const PerRequestLimitsSchema = z.union([z.null(), z.object({}).passthrough()]).nullable()

/** default_parameters vary widely; allow numbers/strings/null per key */
const DefaultParametersSchema = z.union([z.null(), z.object({}).catchall(z.union([z.number(), z.string(), z.null()]))])

/** one model entry */
export const ModelSchemaOpenRouter = z.object({
  id: z.string(),
  canonical_slug: z.string(),
  hugging_face_id: z.string(),
  name: z.string(),
  created: z.number(), // epoch seconds
  description: z.string(),
  context_length: z.number(),

  architecture: ArchitectureSchema,
  pricing: PricingSchema,
  top_provider: TopProviderSchema,

  per_request_limits: PerRequestLimitsSchema,

  supported_parameters: z.array(z.string()),
  default_parameters: DefaultParametersSchema,
})

export type ModelSchemaOpenRouter = z.infer<typeof ModelSchemaOpenRouter>
