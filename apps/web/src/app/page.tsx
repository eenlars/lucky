import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide"
import { QuickStartCard } from "@/components/quick-start/QuickStartCard"
import Link from "next/link"

export default function HomePage() {
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
          <QuickStartCard />
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
