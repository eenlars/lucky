import { redirect } from "next/navigation"
import type { ReactNode } from "react"

interface DevOnlyProps {
  children: ReactNode
}

export function DevOnly({ children }: DevOnlyProps) {
  if (process.env.NODE_ENV === "production") {
    redirect("/")
  }

  return <>{children}</>
}
