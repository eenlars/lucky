/**
 * User-friendly error messages following the design guide's plain language principles
 */

export interface ErrorMessage {
  title: string
  message: string
  action?: string
}

/**
 * Convert an error into a user-friendly message
 */
export function getErrorMessage(error: unknown): ErrorMessage {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      title: "Connection lost",
      message: "Check your internet connection and try again.",
      action: "Retry",
    }
  }

  // HTTP errors
  if (error instanceof Response) {
    switch (error.status) {
      case 400:
        return {
          title: "Invalid request",
          message: "The information provided wasn't valid. Please check and try again.",
          action: "Fix and retry",
        }
      case 401:
        return {
          title: "Not signed in",
          message: "Sign in to continue.",
          action: "Sign in",
        }
      case 403:
        return {
          title: "Access denied",
          message: "You don't have permission to do this.",
        }
      case 404:
        return {
          title: "Not found",
          message: "We couldn't find what you're looking for.",
        }
      case 429:
        return {
          title: "Too many requests",
          message: "Slow down a bit and try again in a moment.",
          action: "Try again",
        }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: "Server error",
          message: "Something went wrong on our end. We're looking into it.",
          action: "Try again",
        }
      default:
        return {
          title: "Request failed",
          message: `Server returned status ${error.status}. Please try again.`,
          action: "Retry",
        }
    }
  }

  // Timeout errors
  if (error instanceof Error && error.message.includes("timeout")) {
    return {
      title: "Request timed out",
      message: "This is taking longer than expected. Please try again.",
      action: "Retry",
    }
  }

  // Parse/validation errors
  if (error instanceof SyntaxError) {
    return {
      title: "Invalid data",
      message: "The data format wasn't what we expected.",
    }
  }

  // Generic error with message
  if (error instanceof Error && error.message) {
    return {
      title: "Something went wrong",
      message: error.message,
      action: "Try again",
    }
  }

  // Unknown error
  return {
    title: "Unexpected error",
    message: "Something unexpected happened. Please try again.",
    action: "Retry",
  }
}

/**
 * Convert HTTP status code to user-friendly message
 */
export function getStatusMessage(status: number): string {
  switch (status) {
    case 200:
    case 201:
      return "Success"
    case 400:
      return "Invalid request"
    case 401:
      return "Not signed in"
    case 403:
      return "Access denied"
    case 404:
      return "Not found"
    case 429:
      return "Too many requests"
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server error"
    default:
      return `Error ${status}`
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Response) {
    // Retry on server errors and rate limiting
    return error.status >= 500 || error.status === 429
  }

  // Retry on network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }

  // Retry on timeout
  if (error instanceof Error && error.message.includes("timeout")) {
    return true
  }

  return false
}
