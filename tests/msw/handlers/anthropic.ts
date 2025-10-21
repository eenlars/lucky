/**
 * MSW handlers for Anthropic API
 */
import { http, HttpResponse } from "msw"

export interface AnthropicHandlerOptions {
  fail?: boolean
  overloaded?: boolean
  delay?: number
}

export function anthropicHandlers(options: AnthropicHandlerOptions = {}) {
  const { fail = false, overloaded = false, delay = 0 } = options

  return [
    http.post("https://api.anthropic.com/v1/messages", async () => {
      if (delay) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      if (overloaded) {
        return HttpResponse.json(
          { error: { type: "overloaded_error", message: "Service overloaded" } },
          { status: 529 },
        )
      }

      if (fail) {
        return HttpResponse.json({ error: { type: "api_error", message: "Internal error" } }, { status: 500 })
      }

      // Success response
      return HttpResponse.json({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [
          {
            type: "text",
            text: "This is a test response from MSW",
          },
        ],
        gatewayModelId: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: {
          input_tokens: 10,
          output_tokens: 20,
        },
      })
    }),
  ]
}
