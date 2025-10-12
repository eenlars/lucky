import type React from "react"

interface NavIconProps {
  children: React.ReactNode
  className?: string
}

export function NavIcon({ children, className = "" }: NavIconProps) {
  return <div className={className}>{children}</div>
}
