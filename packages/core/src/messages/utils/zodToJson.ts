import type { ZodTypeAny } from "zod"
import { zodToJsonSchema } from "zod-to-json-schema"

export function zodToJson(zodSchema: ZodTypeAny): string {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    $refStrategy: "none",
  })

  // try {
  //   zodResponseFormat(zodSchema, "response")
  // } catch (error) {
  //   lgg.error(
  //     "WARNING: zodToJson failed, this will have consequences if using openai.",
  //     JSONN.show(error)
  //   )
  // }

  return cleanJson(jsonSchema)
}

function cleanJson(json: any) {
  return JSON.parse(JSON.stringify(json, null, 2).replace(/[\n\s]+/g, " "))
}
