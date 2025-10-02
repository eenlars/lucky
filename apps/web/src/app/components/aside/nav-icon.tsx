import type React from "react"

interface NavIconProps {
  children: React.ReactNode
  isActive?: boolean
  className?: string
}

export function NavIcon({ children, isActive: _isActive = false, className = "" }: NavIconProps) {
  return <div className={`${className}`}>{children}</div>
}
