"use client"

import { useState, useCallback } from "react"
import type { SenderSummary } from "@/lib/gmail/types"
import type { ClassificationResult, LLMConfig } from "@/lib/llm/provider"
import type { LabelCreateResult, LabelApplyResult } from "@/lib/gmail/labeler"
import { STORAGE_KEY } from "@/lib/llm/provider"
import ScanProgress from "@/app/components/ScanProgress"
import { StatsCards } from "@/app/components/StatsCards"
import SenderTable from "@/app/components/SenderTable"
import { LabelPreview } from "@/app/components/LabelPreview"
import ApprovalPanel from "@/app/components/ApprovalPanel"
import ExecutionLog, { type LogEntry, type LogLevel } from "@/app/components/ExecutionLog"
import { ExecutionResults } from "@/app/components/ExecutionResults"
import Link from "next/link"

interface DashboardClientProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

type ClassifyState = "idle" | "classifying" | "reviewing" | "approved"
type ExecuteState = "idle" | "creating" | "applying" | "done"

let logIdCounter = 0

export default function DashboardClient({ user }: DashboardClientProps) {
  const [senders, setSenders] = useState<SenderSummary[] | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const [classifyState, setClassifyState] = useState<ClassifyState>("idle")
  const [classifyProgress, setClassifyProgress] = useState({ batch: 0, total: 0 })
  const [classifyResults, setClassifyResults] = useState<ClassificationResult[]>([])
  const [classifyError, setClassifyError] = useState<string | null>(null)
  const [approvedResults, setApprovedResults] = useState<ClassificationResult[]>([])

  const [executeState, setExecuteState] = useState<ExecuteState>("idle")
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [labelResults, setLabelResults] = useState<LabelCreateResult[]>([])
  const [applyResults, setApplyResults] = useState<LabelApplyResult[]>([])
  const [executeError, setExecuteError] = useState<string | null>(null)

  const addLog = useCallback((level: LogLevel, message: string) => {
    setLogEntries(prev => [...prev, {
      id: String(++logIdCounter),
      level,
      message,
      timestamp: new Date(),
    }])
  }, [])

  const readSSEStream = useCallback(async (
    res: Response,
    onEvent: (event: Record<string, unknown>) => void
  ) => {
    if (!res.body) throw new Error("No response body")
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          onEvent(JSON.parse(line.slice(6)) as Record<string, unknown>)
        } catch { /* skip malformed */ }
      }
    }
  }, [])

  const handleClassify = useCallback(async () => {
    if (!senders) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { setClassifyError("Configure your LLM provider in Settings first."); return }
    let config: LLMConfig
    try { config = JSON.parse(raw) as LLMConfig } catch {
      setClassifyError("Invalid LLM config. Reconfigure in Settings."); return
    }
    if (config.provider === "none") {
      setClassifyError("LLM set to 'No LLM'. Configure a provider in Settings."); return
    }
    setClassifyState("classifying"); setClassifyError(null); setClassifyResults([])
    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senders, provider: config.provider, apiKey: config.apiKey, model: config.model, baseUrl: config.baseUrl }),
      })
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`)
      const allResults: ClassificationResult[] = []
      await readSSEStream(res, (event) => {
        if (event.error) throw new Error(event.error as string)
        if (event.done) { setClassifyState("reviewing"); setClassifyResults([...allResults]) }
        if (event.results) {
          allResults.push(...(event.results as ClassificationResult[]))
          setClassifyProgress({ batch: event.batch as number, total: event.totalBatches as number })
        }
      })
    } catch (err) {
      setClassifyState("idle")
      setClassifyError(err instanceof Error ? err.message : "Classification failed")
    }
  }, [senders, readSSEStream])

  const handleApprove = useCallback((approved: ClassificationResult[]) => {
    setApprovedResults(approved); setClassifyState("approved")
  }, [])

  const handleExecute = useCallback(async () => {
    if (!approvedResults.length) return
    setExecuteState("creating"); setLogEntries([]); setExecuteError(null)
    addLog("info", `Starting label execution for ${approvedResults.length} senders…`)

    try {
      // Step 1: Create labels
      addLog("info", "Creating Gmail labels…")
      const createdLabels: LabelCreateResult[] = []
      const createRes = await fetch("/api/labels", { method: "POST" })
      if (!createRes.ok) throw new Error(`Label creation failed: ${createRes.status}`)
      await readSSEStream(createRes, (event) => {
        if (event.type === "error") throw new Error(event.error as string)
        if (event.type === "progress") {
          const r = event.result as LabelCreateResult
          createdLabels.push(r)
          if (r.status === "created") addLog("success", `Created label: ${r.name}`)
          else if (r.status === "existing") addLog("info", `Label exists: ${r.name}`)
          else addLog("error", `Failed label: ${r.name} — ${r.error}`)
        }
        if (event.type === "done") {
          addLog("success", `Labels: ${event.created} created, ${event.existing} existing, ${event.failed} failed`)
          setLabelResults([...createdLabels])
        }
      })

      // Build label name → id map (inlined to avoid bundling server-only labeler.ts)
      const labelIdMap: Record<string, string> = {}
      for (const r of createdLabels) {
        if (r.id) labelIdMap[r.name.toLowerCase()] = r.id
      }

      // Step 2: Apply labels
      setExecuteState("applying")
      const assignments = approvedResults.map(r => ({
        senderEmail: r.email,
        labelName: r.suggestedLabel,
      }))
      addLog("info", `Applying labels to ${assignments.length} senders…`)

      const appliedResults: LabelApplyResult[] = []
      const applyRes = await fetch("/api/labels/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments, labelIdMap }),
      })
      if (!applyRes.ok) throw new Error(`Apply failed: ${applyRes.status}`)
      await readSSEStream(applyRes, (event) => {
        if (event.type === "error") throw new Error(event.error as string)
        if (event.type === "progress") {
          const r = event.result as LabelApplyResult
          appliedResults.push(r)
          if (r.status === "done")
            addLog("success", `${r.senderEmail} — ${r.messagesLabeled} emails → ${r.labelName}`)
          else
            addLog("error", `${r.senderEmail} — failed: ${r.error}`)
        }
        if (event.type === "done") {
          addLog("success", `Done! ${event.done} senders labeled, ${event.emailsLabeled} emails total.`)
          setApplyResults([...appliedResults])
          setExecuteState("done")
        }
      })
    } catch (err) {
      setExecuteState("idle")
      setExecuteError(err instanceof Error ? err.message : "Execution failed")
      addLog("error", err instanceof Error ? err.message : "Execution failed")
    }
  }, [approvedResults, addLog, readSSEStream])

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

          {/* Step 2: Classify */}
          {classifyState === "idle" && (
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={handleClassify}
                className="px-6 py-3 rounded-lg font-semibold text-sm text-white"
                style={{ background: "#4f46e5" }}>
                ✨ Classify with AI
              </button>
              <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-300">⚙ LLM Settings</Link>
              {classifyError && <p className="text-red-400 text-sm">{classifyError}</p>}
            </div>
          )}

          {classifyState === "classifying" && (
            <div className="rounded-xl p-4" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <p className="text-white font-medium mb-2">Classifying senders…</p>
              <p className="text-gray-400 text-sm">Batch {classifyProgress.batch} of {classifyProgress.total || "?"}</p>
              <div className="w-full bg-slate-700 rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-500"
                  style={{ width: classifyProgress.total ? `${(classifyProgress.batch / classifyProgress.total) * 100}%` : "10%" }} />
              </div>
            </div>
          )}

          {classifyState === "reviewing" && classifyResults.length > 0 && (
            <div className="rounded-xl p-6" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <ApprovalPanel results={classifyResults} senders={senders} onApprove={handleApprove} />
            </div>
          )}

          {/* Step 3: Execute */}
          {classifyState === "approved" && executeState === "idle" && (
            <div className="rounded-xl p-6 space-y-4" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-green-400 font-semibold">✓ {approvedResults.length} senders approved</p>
                  <p className="text-gray-400 text-sm">Ready to create labels and apply them in Gmail.</p>
                </div>
                <button onClick={handleExecute}
                  className="px-6 py-3 rounded-lg font-semibold text-sm text-white"
                  style={{ background: "#22c55e", color: "#000" }}>
                  🚀 Execute in Gmail
                </button>
              </div>
              {executeError && <p className="text-red-400 text-sm">{executeError}</p>}
            </div>
          )}

          {(executeState === "creating" || executeState === "applying") && (
            <div className="space-y-3">
              <p className="text-white font-medium">
                {executeState === "creating" ? "Creating labels…" : "Applying labels to emails…"}
              </p>
              <ExecutionLog entries={logEntries} title="Execution Log" />
            </div>
          )}

          {executeState === "done" && (
            <div className="space-y-6">
              <ExecutionLog entries={logEntries} title="Execution Complete" />
              <ExecutionResults labelResults={labelResults} applyResults={applyResults} />
            </div>
          )}

          <SenderTable senders={senders} />
          <LabelPreview />
        </>
      )}
    </div>
  )
}
