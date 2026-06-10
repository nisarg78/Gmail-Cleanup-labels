"use client"

import { useState, useEffect, useCallback } from "react"
import type { SenderSummary, ScanProgressEvent } from "@/lib/gmail/types"

interface ScanProgressProps {
  onComplete: (senders: SenderSummary[]) => void
  onError: (message: string) => void
}

type ScanState = "idle" | "scanning" | "done" | "error"

interface Progress {
  phase: string
  scanned: number
  total: number
  percent: number
}

export default function ScanProgress({
  onComplete,
  onError,
}: ScanProgressProps) {
  const [state, setState] = useState<ScanState>("idle")
  const [progress, setProgress] = useState<Progress>({
    phase: "",
    scanned: 0,
    total: 0,
    percent: 0,
  })
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  // Map phase enum to user-friendly labels
  const phaseLabels: Record<string, string> = {
    listing: "Listing messages…",
    fetching: "Fetching metadata…",
    aggregating: "Aggregating senders…",
    done: "Scan complete",
    error: "Error",
  }

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [eventSource])

  const handleStartScan = useCallback(() => {
    setState("scanning")
    setErrorMessage("")
    setProgress({ phase: "", scanned: 0, total: 0, percent: 0 })

    const es = new EventSource("/api/gmail/scan")

    es.addEventListener("message", (event) => {
      try {
        const data: ScanProgressEvent = JSON.parse(event.data)

        setProgress({
          phase: phaseLabels[data.phase] || data.phase,
          scanned: data.scanned,
          total: data.total,
          percent: data.percent,
        })

        if (data.done && data.senders) {
          setState("done")
          es.close()
          setEventSource(null)
          onComplete(data.senders)
        }

        if (data.error) {
          setState("error")
          setErrorMessage(data.error)
          es.close()
          setEventSource(null)
          onError(data.error)
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : "Failed to parse event"
        setState("error")
        setErrorMessage(err)
        es.close()
        setEventSource(null)
        onError(err)
      }
    })

    es.addEventListener("error", () => {
      setState("error")
      setErrorMessage("Connection lost. Please try again.")
      es.close()
      setEventSource(null)
      onError("Connection lost")
    })

    setEventSource(es)
  }, [onComplete, onError])

  const handleRetry = useCallback(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
    handleStartScan()
  }, [eventSource, handleStartScan])

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      {state === "idle" && (
        <div className="space-y-4">
          <button
            onClick={handleStartScan}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Scan
          </button>
          <p className="text-gray-300 text-sm">
            Scan your Gmail inbox to get AI-powered label suggestions
          </p>
        </div>
      )}

      {state === "scanning" && (
        <div className="space-y-4">
          <div>
            <p className="text-gray-300 text-sm font-medium mb-2">
              {progress.phase}
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-400">
            <span>
              {progress.scanned.toLocaleString()} /{" "}
              {progress.total.toLocaleString()} messages
            </span>
            <span className="font-semibold text-gray-300">
              {Math.round(progress.percent)}%
            </span>
          </div>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-3">
          <p className="text-green-400 font-semibold">Scan complete!</p>
          <p className="text-gray-300 text-sm">
            {progress.scanned.toLocaleString()} messages scanned
          </p>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-4">
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm font-medium">{errorMessage}</p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Retry Scan
          </button>
        </div>
      )}
    </div>
  )
}
