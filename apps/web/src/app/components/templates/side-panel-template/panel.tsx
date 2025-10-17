"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"

export interface SidePanelTemplateProps {
  isOpen: boolean
  isExpanded?: boolean
  onClose: () => void
  onToggleExpanded?: () => void
  header: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  ariaLabel?: string
}

export function SidePanelTemplate({
  isOpen,
  isExpanded = false,
  onClose,
  onToggleExpanded,
  header,
  children,
  footer,
  ariaLabel = "Side panel",
}: SidePanelTemplateProps) {
  const panelRef = useRef<HTMLDialogElement>(null)

  // handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // focus trap - keep focus within panel when open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const firstElement = focusableElements[0] as HTMLElement
      if (firstElement) {
        setTimeout(() => firstElement.focus(), 100)
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* backdrop - click to close */}
      <div
        className={cn(
          "fixed inset-0 bg-black/10 z-40 transition-all duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel with elastic slide animation */}
      <dialog
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 h-screen bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 shadow-2xl overflow-hidden flex flex-col",
          // elastic easing
          "transition-all duration-[240ms]",
          isOpen ? "translate-x-0" : "translate-x-full",
          isExpanded ? "w-[680px]" : "w-[420px]",
        )}
        style={{
          transitionTimingFunction: isOpen ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-modal="true"
        aria-label={ariaLabel}
        open
      >
        {/* header */}
        {header}

        {/* content area - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">{children}</div>
        </div>

        {/* footer */}
        {footer}
      </dialog>
    </>
  )
}
