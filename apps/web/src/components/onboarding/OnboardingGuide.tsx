"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const ONBOARDING_STORAGE_KEY = "lucky_onboarding_completed"

interface OnboardingStep {
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome",
    description: "This system helps you create AI workflows that learn and improve themselves. Let's get you started.",
  },
  {
    title: "What you'll do",
    description:
      "Create a workflow, test it with real inputs, and watch it optimize itself to solve your specific task better over time.",
  },
  {
    title: "Start simple",
    description: "Begin by creating your first workflow. You can test it immediately - no configuration needed.",
    action: {
      label: "Create your first workflow",
      href: "/edit",
    },
  },
]

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompleted = localStorage.getItem(ONBOARDING_STORAGE_KEY)
    if (!hasCompleted) {
      // Small delay before showing to avoid flash
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip()
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext()
      } else if (e.key === "ArrowLeft" && currentStep > 0) {
        setCurrentStep(currentStep - 1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isVisible, currentStep])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      localStorage.setItem(ONBOARDING_STORAGE_KEY, "true")
    }, 300)
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleClose()
    }
  }

  const handleSkip = () => {
    handleClose()
  }

  if (!isVisible) return null

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
    >
      <div
        className={`relative max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-8 ${
          isClosing ? "animate-out fade-out zoom-out-95 duration-300" : "animate-in fade-in zoom-in-95 duration-300"
        }`}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close onboarding"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="flex gap-1 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  index <= currentStep ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>

          <h2 id="onboarding-title" className="text-2xl font-light text-gray-900 dark:text-gray-100 mb-3">
            {step.title}
          </h2>
          <p id="onboarding-description" className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        <div className="flex gap-3">
          {!isLastStep && (
            <Button onClick={handleSkip} variant="outline" className="flex-1">
              Skip
            </Button>
          )}
          {step.action ? (
            <Link href={step.action.href} className="flex-1" onClick={handleClose}>
              <Button className="w-full">{step.action.label}</Button>
            </Link>
          ) : (
            <Button onClick={handleNext} className="flex-1">
              {isLastStep ? "Get started" : "Next"}
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-center">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              I've used this before
            </button>
          </div>
          <div className="text-center text-xs text-gray-400 dark:text-gray-500">
            Use arrow keys to navigate • ESC to close
          </div>
        </div>
      </div>
    </div>
  )
}

// Export a hook to manually trigger onboarding or reset it
export function useOnboarding() {
  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    window.location.reload()
  }

  const hasCompletedOnboarding = () => {
    return !!localStorage.getItem(ONBOARDING_STORAGE_KEY)
  }

  return { resetOnboarding, hasCompletedOnboarding }
}
