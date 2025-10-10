"use client"

import { AlertCircle, CheckCircle, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "./button"

interface AlertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  variant?: "default" | "error" | "success"
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  variant = "default",
  confirmText,
  cancelText = "Close",
  onConfirm,
}: AlertDialogProps) {
  const [isVisible, setIsVisible] = useState(open)

  useEffect(() => {
    if (open) {
      setIsVisible(true)
    }
  }, [open])

  if (!isVisible) return null

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => setIsVisible(false), 200)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-md z-50 transition-all duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <div
          className={`w-[460px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-black/[0.08] dark:border-white/[0.08] transition-all duration-300 ease-out ${
            open ? "opacity-100 scale-100" : "opacity-0 scale-[0.98]"
          }`}
        >
          {/* Header with icon and close */}
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div className="flex items-center gap-3">
              {variant === "success" ? (
                <CheckCircle className="size-6 text-green-600 dark:text-green-400" strokeWidth={2} />
              ) : (
                <AlertCircle
                  className={`size-6 ${
                    variant === "error" ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
                  }`}
                  strokeWidth={2}
                />
              )}
              <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="size-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.06] flex items-center justify-center transition-colors duration-150"
            >
              <X className="size-[18px] text-foreground/40" strokeWidth={2} />
            </button>
          </div>

          {/* Content */}
          <div className="px-8 pb-6">
            <p className="text-[15px] text-foreground/60 leading-[1.5]">{description}</p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-8 pb-8 pt-2">
            {onConfirm ? (
              <>
                <button
                  onClick={handleClose}
                  className="px-5 h-9 rounded-lg text-[15px] font-medium text-foreground/70 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors duration-150"
                >
                  {cancelText}
                </button>
                <button
                  onClick={() => {
                    onConfirm()
                    handleClose()
                  }}
                  className={`px-5 h-9 rounded-lg text-[15px] font-medium transition-all duration-150 ${
                    variant === "error"
                      ? "bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 shadow-sm"
                      : "bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-sm"
                  }`}
                >
                  {confirmText || "Confirm"}
                </button>
              </>
            ) : (
              <button
                onClick={handleClose}
                className="px-5 h-9 rounded-lg text-[15px] font-medium text-foreground/70 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors duration-150"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
