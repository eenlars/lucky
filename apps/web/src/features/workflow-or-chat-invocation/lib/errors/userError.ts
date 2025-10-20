export function getUserFriendlyError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error)

  if (
    errorMessage.includes("API key") ||
    errorMessage.toLowerCase().includes("apikey") ||
    errorMessage.toLowerCase().includes("authentication")
  ) {
    let provider = "AI provider"
    const lower = errorMessage.toLowerCase()
    if (lower.includes("openai")) provider = "OpenAI"
    else if (lower.includes("openrouter")) provider = "OpenRouter"
    else if (lower.includes("groq")) provider = "Groq"
    else if (lower.includes("anthropic")) provider = "Anthropic"
    return `${provider} API key not configured. Please add it in Settings → Providers.`
  }
  if (/not\s+found|404/i.test(errorMessage)) {
    return "Selected model is not available. Try a different model or check your provider settings."
  }
  if (/rate\s*limit|429/i.test(errorMessage)) {
    return "Too many requests. Please wait a moment and try again."
  }
  if (/quota|insufficient|402/i.test(errorMessage)) {
    return "AI service quota exceeded or insufficient credits. Please check your provider account."
  }
  if (/403|access\s*denied|forbidden/i.test(errorMessage)) {
    return "Access denied. The model may not be available for your account."
  }
  if (/timeout|timed\s*out|408/i.test(errorMessage)) {
    return "Request timed out. Please try again with a shorter prompt."
  }
  if (/500|502|503|unavailable/i.test(errorMessage)) {
    return "AI service is temporarily unavailable. Please try again in a moment."
  }
  return "Failed to process your request. Please try again or contact support if the issue persists."
}
