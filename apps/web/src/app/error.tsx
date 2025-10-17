"use client"

import { Button } from "@/components/ui/button"
import { useEffect } from "react"

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Something went wrong!</h2>
        <p className="text-muted-foreground">{error.message || "An unexpected error occurred"}</p>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  )
}
