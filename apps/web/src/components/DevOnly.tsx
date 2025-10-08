"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { useEffect } from "react"

interface DevOnlyProps {
  children: ReactNode
}

export function DevOnly({ children }: DevOnlyProps) {
  const router = useRouter()

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.push("/")
    }
  }, [router])

  if (process.env.NODE_ENV === "production") {
    return null
  }

  return <>{children}</>
}
