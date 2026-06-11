"use client"

import { useState, useCallback } from "react"
import { Toast, type ToastType } from "./Toast"

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let toastIdCounter = 0

/**
 * Toast queue hook. Returns `showToast` to enqueue a notification and a
 * `ToastContainer` element that renders the stack (fixed, bottom-right).
 * Multiple toasts stack vertically and auto-dismiss after their duration.
 */
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++toastIdCounter
    setToasts(prev => [...prev, { id, message, type }])
  }, [])

  const ToastContainer = (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => dismissToast(t.id)}
        />
      ))}
    </div>
  )

  return { showToast, dismissToast, ToastContainer }
}
