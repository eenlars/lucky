import { type HTMLAttributes, forwardRef } from "react"

import { cn } from "@/react-flow-visualization/lib/utils"

export const BaseNode = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { selected?: boolean }>(
  ({ className, selected, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-xl bg-card text-card-foreground shadow-sm transition-all duration-200",
        className,
        selected ? "shadow-xl ring-2 ring-blue-500 ring-offset-2 scale-[1.02]" : "",
      )}
      {...props}
    />
  ),
)

BaseNode.displayName = "BaseNode"
