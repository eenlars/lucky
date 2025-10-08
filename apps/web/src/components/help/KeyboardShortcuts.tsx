"use client"

import { Command } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

/**
 * Global keyboard shortcuts following Mac/Web conventions
 * Press Cmd+K or Ctrl+K to open command palette
 */
export function KeyboardShortcuts() {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

      // Show keyboard shortcuts help: Cmd/Ctrl + /
      if (cmdOrCtrl && e.key === "/") {
        e.preventDefault()
        setShowHelp(!showHelp)
        return
      }

      // Close help: Escape
      if (e.key === "Escape" && showHelp) {
        setShowHelp(false)
        return
      }

      // Navigation shortcuts
      if (cmdOrCtrl && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "h":
            e.preventDefault()
            router.push("/")
            break
          case "e":
            e.preventDefault()
            router.push("/edit")
            break
          case "i":
            e.preventDefault()
            router.push("/invocations")
            break
          case "l":
            e.preventDefault()
            router.push("/evolution")
            break
          case "s":
            e.preventDefault()
            router.push("/settings")
            break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router, showHelp])

  if (!showHelp) {
    return (
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 z-40 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
        title="Keyboard shortcuts"
      >
        <Command className="w-3 h-3" />
        <span className="hidden sm:inline">Shortcuts</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <ShortcutRow label="Home" keys={["⌘", "⇧", "H"]} />
          <ShortcutRow label="Create" keys={["⌘", "⇧", "E"]} />
          <ShortcutRow label="History" keys={["⌘", "⇧", "I"]} />
          <ShortcutRow label="Learning" keys={["⌘", "⇧", "L"]} />
          <ShortcutRow label="Settings" keys={["⌘", "⇧", "S"]} />
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
            <ShortcutRow label="Show shortcuts" keys={["⌘", "/"]} />
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          On Windows/Linux, use Ctrl instead of ⌘
        </p>
      </div>
    </div>
  )
}

function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}
