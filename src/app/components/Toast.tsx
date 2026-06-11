"use client"

import { useEffect } from "react"

export type ToastType = "success" | "error" | "info"

interface ToastProps {
  message: string
  type?: ToastType
  onDismiss: () => void
  duration?: number  // ms, default 3000
}

const TYPE_STYLE: Record<ToastType, string> = {
  success: "bg-green-900/90 border-green-700 text-green-200",
  error:   "bg-red-900/90 border-red-700 text-red-200",
  info:    "bg-slate-800/90 border-slate-600 text-gray-200",
}

export function Toast({ message, type = "info", onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  return (
    <div
      className={`px-4 py-3 rounded-lg border text-sm font-medium shadow-lg max-w-sm ${TYPE_STYLE[type]}`}
      role="alert"
    >
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-xs">✕</button>
      </div>
    </div>
  )
}
