"use client"

import { useState, useCallback } from "react"
import type { SenderSummary } from "@/lib/gmail/types"
import type { ClassificationResult, LLMConfig } from "@/lib/llm/provider"
import { STORAGE_KEY } from "@/lib/llm/provider"
import ScanProgress from "@/app/components/ScanProgress"
import { StatsCards } from "@/app/components/StatsCards"
import SenderTable from "@/app/components/SenderTable"
import { LabelPreview } from "@/app/components/LabelPreview"
import ApprovalPanel from "@/app/components/ApprovalPanel"
import Link from "next/link"

interface DashboardClientProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

type ClassifyState = "idle" | "classifying" | "reviewing" | "approved"

export default function DashboardClient({ user }: DashboardClientProps) {
  const [senders, setSenders] = useState<SenderSummary[] | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const [classifyState, setClassifyState] = useState<ClassifyState>("idle")
  const [classifyProgress, setClassifyProgress] = useState({ batch: 0, total: 0 })
  const [classifyResults, setClassifyResults] = useState<ClassificationResult[]>([])
  const [classifyError, setClassifyError] = useState<string | null>(null)
  const [approvedResults, setApprovedResults] = useState<ClassificationResult[]>([])

  const handleClassify = useCallback(async () => {
    if (!senders) return

    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setClassifyError("Configure your LLM provider in Settings first.")
      return
    }

    let config: LLMConfig
    try {
      config = JSON.parse(raw) as LLMConfig
    } catch {
      setClassifyError("Invalid LLM config. Please reconfigure in Settings.")
      return
    }

    if (config.provider === "none") {
      setClassifyError("LLM is set to 'No LLM'. Configure a provider in Settings to classify.")
      return
    }

    setClassifyState("classifying")
    setClassifyError(null)
    setClassifyResults([])

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senders,
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
          baseUrl: config.baseUrl,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`Server error: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      const allResults: ClassificationResult[] = []

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.error) throw new Error(event.error)
            if (event.done) {
              setClassifyState("reviewing")
              setClassifyResults([...allResults])
              return
            }
            if (event.results) {
              allResults.push(...event.results)
              setClassifyProgress({ batch: event.batch, total: event.totalBatches })
            }
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
              throw e
            }
          }
        }
      }
    } catch (err) {
      setClassifyState("idle")
      setClassifyError(err instanceof Error ? err.message : "Classification failed")
    }
  }, [senders])

  const handleApprove = useCallback((approved: ClassificationResult[]) => {
    setApprovedResults(approved)
    setClassifyState("approved")
  }, [])

  return (
    <div className="space-y-8">
      <ScanProgress
        onComplete={(s) => { setSenders(s); setScanError(null) }}
        onError={(msg) => setScanError(msg)}
      />

      {scanError && <p className="text-red-400 text-sm">{scanError}</p>}

      {senders && (
        <>
          <StatsCards senders={senders} />

          {/* Classify button */}
          {classifyState === "idle" && (
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={handleClassify}
                className="px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors"
                style={{ background: "#4f46e5" }}
              >
                ✨ Classify with AI
              </button>
              <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-300">
                ⚙ LLM Settings
              </Link>
              {classifyError && (
                <p className="text-red-400 text-sm">{classifyError}</p>
              )}
            </div>
          )}

          {/* Classifying progress */}
          {classifyState === "classifying" && (
            <div className="rounded-xl p-4" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <p className="text-white font-medium mb-2">Classifying senders…</p>
              <p className="text-gray-400 text-sm">
                Batch {classifyProgress.batch} of {classifyProgress.total || "?"}
              </p>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{
                    width: classifyProgress.total
                      ? `${(classifyProgress.batch / classifyProgress.total) * 100}%`
                      : "10%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Approval panel */}
          {classifyState === "reviewing" && classifyResults.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <ApprovalPanel
                results={classifyResults}
                senders={senders}
                onApprove={handleApprove}
              />
            </div>
          )}

          {/* Approved — ready for execution */}
          {classifyState === "approved" && (
            <div className="rounded-xl p-6 text-center" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <p className="text-green-400 font-semibold text-lg mb-2">
                ✓ {approvedResults.length} senders approved
              </p>
              <p className="text-gray-400 text-sm">
                Label execution coming in the next step.
              </p>
            </div>
          )}

          <SenderTable senders={senders} />
          <LabelPreview />
        </>
      )}
    </div>
  )
}
