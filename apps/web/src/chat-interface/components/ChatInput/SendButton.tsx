/**
 * SendButton Component
 *
 * Beautiful, animated send button
 */

"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2, Send } from "lucide-react"

interface SendButtonProps {
  onClick: () => void
  disabled?: boolean
  isLoading?: boolean
}

export function SendButton({ onClick, disabled, isLoading }: SendButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-11 w-11",
        "rounded-full",
        "bg-chat-primary hover:bg-chat-primary/90",
        "text-white",
        "flex items-center justify-center",
        "transition-all",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "shrink-0",
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        transitionDuration: "200ms",
      }}
      aria-label="Send message"
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
    </Button>
  )
}
