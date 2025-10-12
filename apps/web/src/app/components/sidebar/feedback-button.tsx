"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageSquare } from "lucide-react"
import { useEffect, useState } from "react"
import { GeneralFeedbackDialog } from "./general-feedback-dialog"

export function FeedbackButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Handle global keyboard shortcut ⌘⇧F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "F") {
        e.preventDefault()
        setIsDialogOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  return (
    <>
      <div className="relative h-[32px] mb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setIsDialogOpen(true)}
              className="fixed left-[19px] w-[32px] h-[32px] flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors duration-200 rounded border border-[#DCDAD2] dark:border-[#2C2C2C] hover:bg-sidebar-accent"
              aria-label="Send feedback"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            Send feedback ⌘⇧F
          </TooltipContent>
        </Tooltip>
      </div>

      <GeneralFeedbackDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}
