"use client"

import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[InboxPilot error]", error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0e1117" }}>
      <div className="text-center space-y-4 max-w-md">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-bold text-white">Something went wrong</h2>
        <p className="text-gray-400 text-sm">{error.message || "An unexpected error occurred."}</p>
        {error.digest && <p className="text-gray-600 text-xs">Error ID: {error.digest}</p>}
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "#4f46e5" }}
        >
          Try again
        </button>
      </div>
    </main>
  )
}
