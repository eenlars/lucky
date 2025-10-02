import { type HTMLAttributes, forwardRef } from "react"

import { cn } from "@/react-flow-visualization/lib/utils"

export const BaseNode = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { selected?: boolean }>(
  ({ className, selected, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-lg border-2 bg-card p-6 text-card-foreground shadow-md transition-all duration-200",
        className,
        selected ? "border-primary shadow-xl scale-105" : "border-border",
        "hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]",
      )}
      {...props}
    />
  ),
)

BaseNode.displayName = "BaseNode"
