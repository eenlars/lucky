import * as React from "react"

import { cn } from "@/react-flow-visualization/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base reset to avoid visual misalignment (especially left side)
        "flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground outline-none",
        // Remove rings entirely on focus and rely on border color only
        "focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus:ring-offset-0 shadow-none focus:shadow-none focus:border-gray-400",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
