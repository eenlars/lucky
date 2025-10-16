"use client"

import { OnboardingGuide } from "@/components/onboarding/OnboardingGuide"
import { ChatInterface } from "@/features/chat-interface/ChatInterface"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const router = useRouter()
  const [hasStartedChat, setHasStartedChat] = useState(false)
  const [useSimulation, setUseSimulation] = useState(true)

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

      {/* Mode Toggle */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {useSimulation ? "Simulation Mode" : "Real AI Mode"}
          </div>
          <button
            type="button"
            onClick={() => setUseSimulation(!useSimulation)}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {useSimulation ? "Switch to Real AI" : "Switch to Simulation"}
          </button>
        </div>
      </div>

      {/* Demo Prompt Box - Shows before first message */}
      {!hasStartedChat && (
        <div className="flex items-center justify-center py-8">
          <button
            type="button"
            onClick={handleDemoClick}
            className="group flex flex-col bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 w-[720px] max-w-[calc(100vw-2rem)]"
          >
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800">
                <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-400" strokeWidth={1.5} />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-1">Try a demo workflow</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  See how AI workflows can analyze customer feedback and generate insights
                </p>
              </div>
              <div className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors">
                →
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          onSendMessage={handleSendMessage}
          placeholder="Ask me anything about workflows..."
          useSimulation={useSimulation}
          modelName={useSimulation ? undefined : "openai#gpt-5-nano"}
          nodeId="home-chat"
          systemPrompt="You are a helpful AI assistant for workflow automation. Be concise and clear."
        />
      </div>
    </div>
  )
}
