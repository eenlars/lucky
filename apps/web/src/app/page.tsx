"use client"

import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide"
import { AutoDemoCard } from "@/components/quick-start/AutoDemoCard"
import { QuickStartCard } from "@/components/quick-start/QuickStartCard"
import { trackEvent } from "@/lib/analytics"
import { isFeatureEnabled, isInTreatmentGroup } from "@/lib/feature-flags"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function HomePage() {
  const [shouldAutoRun, setShouldAutoRun] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Check if this is user's first visit
    const hasCompletedDemo = localStorage.getItem("lucky_demo_completed")
    const isFirst = !hasCompletedDemo

    setIsFirstVisit(isFirst)

    // Track first visit
    if (isFirst) {
      trackEvent("first_visit")
    }

    // Determine if we should auto-run based on feature flag and A/B test
    if (isFirst) {
      const featureEnabled = isFeatureEnabled("AUTO_RUN_FIRST_DEMO")
      const inTreatment = isInTreatmentGroup(25) // 25% rollout

      // Track treatment assignment
      if (featureEnabled) {
        trackEvent(inTreatment ? "treatment_assigned" : "control_assigned")
      }

      setShouldAutoRun(featureEnabled && inTreatment)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white pt-24">
      <OnboardingGuide />
      <div className="max-w-4xl mx-auto px-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extralight text-black tracking-tight mb-6">AI Workflows That Learn</h1>
          <p className="text-lg font-light text-black/60 tracking-wide">
            Create workflows that automatically optimize themselves to solve your tasks better
          </p>
        </div>

        <div className="mb-16">
          {isFirstVisit && shouldAutoRun ? <AutoDemoCard autoRun={true} /> : <QuickStartCard />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <Link
            href="/edit"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">✎</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Create</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">Build your workflow</p>
          </Link>

          <Link
            href="/invocations"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">●</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">History</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">See past runs</p>
          </Link>

          <Link
            href="/evolution"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">◊</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Learning</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">Watch workflows improve</p>
          </Link>

          <Link
            href="/edit?mode=eval"
            className="group flex flex-col items-center p-8 transition-all duration-300 hover:translate-y-[-2px]"
          >
            <div className="w-16 h-16 mb-6 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-black/10 transition-colors duration-300">
              <span className="text-2xl">⇪</span>
            </div>
            <h3 className="text-xl font-light text-black mb-2">Test</h3>
            <p className="text-sm font-light text-black/50 text-center tracking-wide">Try with your data</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
