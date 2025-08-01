"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function LoginPage() {
  const [clickCount, setClickCount] = useState(0)
  const router = useRouter()

  const handleSetAuth = () => {
    const newCount = clickCount + 1
    setClickCount(newCount)

    if (newCount >= 5) {
      document.cookie = "auth=true; path=/; max-age=31536000" // 1 year
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-8">Login</h1>
        <button
          onClick={handleSetAuth}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Set Authentication Cookie
        </button>
      </div>
    </div>
  )
}
