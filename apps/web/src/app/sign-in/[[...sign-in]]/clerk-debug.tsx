"use client"

import { useEffect, useState } from "react"

export function ClerkDebug() {
  const [debug, setDebug] = useState({
    clerkLoaded: false,
    clerkInstance: false,
    publishableKey: "",
    scriptPresent: false,
    errors: [] as string[],
  })

  useEffect(() => {
    const checkClerk = () => {
      const errors: string[] = []

      // Check if Clerk global exists
      const clerkLoaded = typeof window !== "undefined" && "Clerk" in window
      const clerkInstance = clerkLoaded && !!(window as any).Clerk

      // Check for publishable key
      const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "NOT FOUND"

      // Check if script tag is present
      const scripts = Array.from(document.querySelectorAll("script"))
      const clerkScript = scripts.find(s => s.src.includes("clerk") || s.getAttribute("data-clerk-publishable-key"))
      const scriptPresent = !!clerkScript

      if (!scriptPresent) {
        errors.push("Clerk script tag not found in DOM")
      }

      if (!publishableKey || publishableKey === "NOT FOUND") {
        errors.push("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found")
      }

      // Check for CSP errors
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
      if (cspMeta) {
        errors.push(`CSP meta tag found: ${cspMeta.getAttribute("content")?.substring(0, 100)}...`)
      }

      setDebug({
        clerkLoaded,
        clerkInstance,
        publishableKey: `${publishableKey.substring(0, 20)}...`,
        scriptPresent,
        errors,
      })
    }

    // Check immediately and after a delay
    checkClerk()
    const timeout = setTimeout(checkClerk, 2000)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 max-w-md rounded-lg border border-red-500 bg-white p-4 text-xs shadow-lg dark:bg-gray-800">
      <h3 className="mb-2 font-bold text-red-600">Clerk Debug Info</h3>
      <div className="space-y-1">
        <div>
          window.Clerk exists: <strong>{debug.clerkLoaded ? "✅ Yes" : "❌ No"}</strong>
        </div>
        <div>
          Clerk instance: <strong>{debug.clerkInstance ? "✅ Yes" : "❌ No"}</strong>
        </div>
        <div>
          Script in DOM: <strong>{debug.scriptPresent ? "✅ Yes" : "❌ No"}</strong>
        </div>
        <div>
          Publishable key: <strong>{debug.publishableKey}</strong>
        </div>
        {debug.errors.length > 0 && (
          <div className="mt-2 border-t pt-2">
            <strong className="text-red-600">Issues:</strong>
            <ul className="list-inside list-disc">
              {debug.errors.map((err, i) => (
                <li key={i} className="text-red-600">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
