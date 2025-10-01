import { lgg } from "@core/utils/logging/Logger"

// this will mostly be read by the llm, so it should be a short string
const emptyContent = "empty content - this should not happen and is a bug!"

// removes new lines, tabs, and extra spaces to make a string more readable for llm
export const llmify = (string: string) => {
  if (typeof string !== "string" || string == null) {
    lgg.warn("llmify called on null or undefined")
    return emptyContent
  }
  return String(string)
    .trim()
    .replace(/[\n\r\s]+/g, " ")
}

export const truncater = (string: string, maxLength: number) => {
  if (typeof string !== "string" || string == null) {
    lgg.warn("truncater called on null or undefined")
    return emptyContent
  }
  return string.length > maxLength ? string.slice(0, maxLength) + "truncated..." : string
}
