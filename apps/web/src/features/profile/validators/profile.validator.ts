import type { PersonalProfile } from "@/features/profile/schemas/profile.schema"

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Custom validator that runs after Zod validation
 * Checks for content quality, meaningful data, and provides suggestions
 */
export function validateProfileQuality(profile: PersonalProfile): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if profile fields are not just whitespace or meaningless
  if (profile.about !== undefined) {
    const aboutText = profile.about.trim()

    // Check for minimum meaningful length
    if (aboutText.length > 0 && aboutText.length < 20) {
      warnings.push(
        "About section is quite short. Consider adding more details to help workflows understand you better.",
      )
    }

    // Check for word count (at least 3 words for meaningful content)
    const wordCount = aboutText.split(/\s+/).filter(w => w.length > 0).length
    if (aboutText.length > 0 && wordCount < 3) {
      errors.push("About section should contain at least a few words to be meaningful.")
    }

    // Check for placeholder-like content
    const placeholderPatterns = [/^test$/i, /^lorem ipsum/i, /^asdf+$/i, /^123+$/i]
    if (placeholderPatterns.some(pattern => pattern.test(aboutText))) {
      errors.push("About section appears to contain placeholder text. Please add real information.")
    }
  }

  if (profile.goals !== undefined) {
    const goalsText = profile.goals.trim()

    // Check for minimum meaningful length
    if (goalsText.length > 0 && goalsText.length < 20) {
      warnings.push("Goals section is quite short. Consider being more specific about your objectives.")
    }

    // Check for word count
    const wordCount = goalsText.split(/\s+/).filter(w => w.length > 0).length
    if (goalsText.length > 0 && wordCount < 3) {
      errors.push("Goals section should contain at least a few words to be meaningful.")
    }

    // Check for placeholder-like content
    const placeholderPatterns = [/^test$/i, /^lorem ipsum/i, /^asdf+$/i, /^123+$/i]
    if (placeholderPatterns.some(pattern => pattern.test(goalsText))) {
      errors.push("Goals section appears to contain placeholder text. Please add real information.")
    }
  }

  // Check if profile is completely empty
  const hasAnyContent = Object.values(profile).some(value => value && value.trim().length > 0)
  if (!hasAnyContent) {
    warnings.push("Your profile is empty. Adding information helps workflows provide better personalized results.")
  }

  // Check for very similar content in both fields
  if (profile.about && profile.goals) {
    const aboutLower = profile.about.toLowerCase()
    const goalsLower = profile.goals.toLowerCase()

    if (aboutLower === goalsLower) {
      warnings.push("About and Goals sections are identical. Consider making them distinct for better clarity.")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Calculate profile completeness percentage
 */
export function calculateProfileCompleteness(profile: PersonalProfile): number {
  const fields = ["about", "goals"] as const
  const filledFields = fields.filter(field => {
    const value = profile[field]
    return value && value.trim().length > 0
  })

  return Math.round((filledFields.length / fields.length) * 100)
}
