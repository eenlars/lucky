/**
 * Animation Utility Functions
 *
 * Helpers for smooth, Gaudí-inspired organic animations
 */

// ============================================================================
// Animation Constants
// ============================================================================

export const ANIMATION_DURATION = {
  instant: 100,
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
} as const

export const EASING = {
  linear: "linear",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  organic: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Gaudí-inspired bounce
  smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
} as const

// ============================================================================
// Tailwind Animation Classes
// ============================================================================

export const ANIMATIONS = {
  // Entry animations
  fadeIn: "animate-in fade-in",
  slideInFromBottom: "animate-in slide-in-from-bottom-4",
  slideInFromTop: "animate-in slide-in-from-top-4",
  slideInFromLeft: "animate-in slide-in-from-left-4",
  slideInFromRight: "animate-in slide-in-from-right-4",
  scaleIn: "animate-in zoom-in-95",

  // Exit animations
  fadeOut: "animate-out fade-out",
  slideOutToBottom: "animate-out slide-out-to-bottom-4",
  slideOutToTop: "animate-out slide-out-to-top-4",
  scaleOut: "animate-out zoom-out-95",

  // Combined animations
  messageEntry: "animate-in fade-in slide-in-from-bottom-4 duration-500",
  messageExit: "animate-out fade-out slide-out-to-bottom-4 duration-300",
  quickFade: "animate-in fade-in duration-300",
  smoothSlide: "animate-in slide-in-from-bottom-2 duration-400",
} as const

// ============================================================================
// Stagger Animation Helper
// ============================================================================

export function getStaggerDelay(index: number, baseDelay = 50): string {
  return `${index * baseDelay}ms`
}

export function getStaggerStyle(index: number, baseDelay = 50): React.CSSProperties {
  return {
    animationDelay: getStaggerDelay(index, baseDelay),
  }
}

// ============================================================================
// Transition Classes
// ============================================================================

export const TRANSITIONS = {
  all: "transition-all",
  colors: "transition-colors",
  opacity: "transition-opacity",
  transform: "transition-transform",
  shadow: "transition-shadow",

  // With durations
  allFast: "transition-all duration-150",
  allNormal: "transition-all duration-300",
  allSlow: "transition-all duration-500",

  colorsFast: "transition-colors duration-150",
  colorsNormal: "transition-colors duration-300",

  transformFast: "transition-transform duration-150",
  transformNormal: "transition-transform duration-300",
} as const

// ============================================================================
// Hover/Active States
// ============================================================================

export const INTERACTIVE_STATES = {
  scale: {
    hover: "hover:scale-105",
    active: "active:scale-95",
    hoverActive: "hover:scale-105 active:scale-95",
  },
  opacity: {
    hover: "hover:opacity-80",
    active: "active:opacity-60",
  },
  brightness: {
    hover: "hover:brightness-110",
    active: "active:brightness-90",
  },
  translate: {
    hoverUp: "hover:-translate-y-0.5",
    hoverRight: "hover:translate-x-0.5",
  },
} as const

// ============================================================================
// Loading Animations
// ============================================================================

export const LOADING_ANIMATIONS = {
  spin: "animate-spin",
  pulse: "animate-pulse",
  bounce: "animate-bounce",
  ping: "animate-ping",
} as const

// ============================================================================
// Custom Animation Keyframes (for Tailwind config)
// ============================================================================

export const CUSTOM_KEYFRAMES = {
  "slide-in-bottom": {
    "0%": { transform: "translateY(100%)", opacity: "0" },
    "100%": { transform: "translateY(0)", opacity: "1" },
  },
  "slide-out-bottom": {
    "0%": { transform: "translateY(0)", opacity: "1" },
    "100%": { transform: "translateY(100%)", opacity: "0" },
  },
  "fade-in-scale": {
    "0%": { opacity: "0", transform: "scale(0.95)" },
    "100%": { opacity: "1", transform: "scale(1)" },
  },
  shimmer: {
    "0%": { backgroundPosition: "-1000px 0" },
    "100%": { backgroundPosition: "1000px 0" },
  },
  "typing-dot": {
    "0%, 60%, 100%": { transform: "translateY(0)" },
    "30%": { transform: "translateY(-10px)" },
  },
}

// ============================================================================
// Animation Utils
// ============================================================================

/**
 * Compose multiple animation classes
 */
export function composeAnimations(...animations: string[]): string {
  return animations.filter(Boolean).join(" ")
}

/**
 * Get animation class with duration and easing
 */
export function getAnimationClass(
  animation: string,
  duration?: keyof typeof ANIMATION_DURATION,
  _easing?: keyof typeof EASING,
): string {
  const classes = [animation]

  if (duration) {
    classes.push(`duration-${ANIMATION_DURATION[duration]}`)
  }

  // Easing classes would need to be defined in tailwind.config
  // For now, we'll use inline styles or data attributes

  return classes.join(" ")
}

/**
 * Generate inline animation style
 */
export function getAnimationStyle(duration?: number, easing?: string, delay?: number): React.CSSProperties {
  return {
    animationDuration: duration ? `${duration}ms` : undefined,
    animationTimingFunction: easing,
    animationDelay: delay ? `${delay}ms` : undefined,
  }
}

// ============================================================================
// Intersection Observer Helper (for scroll animations)
// ============================================================================

export function observeElement(
  element: Element,
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit,
): () => void {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        callback(entry.isIntersecting)
      })
    },
    {
      threshold: 0.1,
      ...options,
    },
  )

  observer.observe(element)

  return () => observer.disconnect()
}

// ============================================================================
// Scroll Animation Helper
// ============================================================================

export function smoothScrollTo(element: HTMLElement, options?: ScrollIntoViewOptions): void {
  element.scrollIntoView({
    behavior: "smooth",
    block: "end",
    ...options,
  })
}

export function smoothScrollToBottom(container: HTMLElement): void {
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth",
  })
}
