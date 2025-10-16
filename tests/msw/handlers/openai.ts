/**
 * MSW handlers for OpenAI API
 */
import { http, HttpResponse } from "msw"

export interface OpenAIHandlerOptions {
  fail?: boolean
  rateLimited?: boolean
  delay?: number
}

export function openaiHandlers(options: OpenAIHandlerOptions = {}) {
  const { fail = false, rateLimited = false, delay = 0 } = options

  return [
    http.post("https://api.openai.com/v1/chat/completions", async () => {
      if (delay) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      if (rateLimited) {
        return HttpResponse.json(
          { error: { message: "Rate limit exceeded", type: "rate_limit_error" } },
          { status: 429 },
        )
      }

      if (fail) {
        return HttpResponse.json({ error: { message: "Internal server error", type: "api_error" } }, { status: 500 })
      }

      // Success response
      return HttpResponse.json({
        id: "chatcmpl-test",
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-4",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "This is a test response from MSW",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      })
    }),
  ]
}
