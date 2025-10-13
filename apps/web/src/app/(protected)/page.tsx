"use client"

import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide"
import { ChatInterface } from "@/features/chat-interface/ChatInterface"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const router = useRouter()
  const [hasStartedChat, setHasStartedChat] = useState(false)
  // In production, redirect home to the editor
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.replace("/edit")
    }
  }, [router])

  if (process.env.NODE_ENV === "production") {
    return null
  }

  const handleSendMessage = (message: string) => {
    // Mark that chat has started (hide demo button)
    if (!hasStartedChat) {
      setHasStartedChat(true)
    }
    // In full implementation, this would send to backend
    console.log("Message sent:", message)
  }

  const handleDemoClick = () => {
    // Trigger demo workflow - navigate to editor with demo preset
    window.location.href = "/edit?demo=customer-feedback"
  }

  return (
    <div className="flex flex-col h-screen bg-white pt-[env(safe-area-inset-top)]">
      <OnboardingGuide />

      {/* Demo Button - Shows before first message */}
      {!hasStartedChat && (
        <div className="border-b border-black/10 bg-gradient-to-b from-black/[0.02] to-transparent animate-in fade-in slide-in-from-top duration-500">
          <div className="max-w-3xl mx-auto px-4 pt-6 pb-3 sm:py-4 md:py-6">
            <button
              type="button"
              onClick={handleDemoClick}
              className="w-full group flex items-center justify-between p-3 sm:p-4 md:p-6 border-2 border-dashed border-black/20 rounded-2xl hover:border-black/40 hover:bg-black/[0.02] hover:shadow-sm transition-all duration-300 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-gradient-to-br from-black/5 to-black/10 flex items-center justify-center group-hover:from-black/10 group-hover:to-black/15 transition-all duration-300">
                  <Sparkles size={18} className="sm:size-5 text-black/60 group-hover:text-black/80 transition-colors" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-black mb-0.5 sm:mb-1 group-hover:text-black transition-colors">
                    Try a demo workflow
                  </h3>
                  <p className="text-xs sm:text-sm font-light text-black/60 group-hover:text-black/70 transition-colors line-clamp-2">
                    See how AI workflows can analyze customer feedback and generate insights
                  </p>
                </div>
              </div>
              <div className="text-xl sm:text-2xl text-black/40 group-hover:text-black/60 group-hover:translate-x-1 transition-all shrink-0 ml-2">
                →
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface onSendMessage={handleSendMessage} placeholder="Ask me anything about workflows..." />
      </div>
    </div>
  )
}
