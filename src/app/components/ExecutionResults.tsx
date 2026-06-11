"use client"

import { useState } from "react"
import type { LabelCreateResult, LabelApplyResult } from "@/lib/gmail/labeler"

interface ExecutionResultsProps {
  labelResults: LabelCreateResult[]
  applyResults: LabelApplyResult[]
}

const MANUAL_STEPS = [
  {
    title: "Archive",
    desc: "In Gmail: click each label in the sidebar → Check All → Archive. (3 clicks per label)",
  },
  {
    title: "Unsubscribe",
    desc: 'Gmail ☰ → "Manage subscriptions" → work through the Unsubscribe Candidates label.',
  },
  {
    title: "Delete",
    desc: "After unsubscribing, search each sender → Select All → Delete permanently.",
  },
  {
    title: "To Review",
    desc: 'Open the "To Review" label → manually decide on each sender.',
  },
]

export function ExecutionResults({ labelResults, applyResults }: ExecutionResultsProps) {
  const [checked, setChecked] = useState<boolean[]>(new Array(MANUAL_STEPS.length).fill(false))

  const labelsCreated = labelResults.filter(r => r.status === 'created').length
  const labelsExisting = labelResults.filter(r => r.status === 'existing').length
  const emailsLabeled = applyResults.filter(r => r.status === 'done').reduce((sum, r) => sum + r.messagesLabeled, 0)
  const sendersProcessed = applyResults.filter(r => r.status === 'done').length
  const sendersFailed = applyResults.filter(r => r.status === 'failed')

  const handleExportCSV = () => {
    const headers = ['Sender Email', 'Label', 'Emails Labeled', 'Status']
    const rows = applyResults.map(r => [r.senderEmail, r.labelName, r.messagesLabeled.toString(), r.status])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inboxpilot-results.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleStep = (i: number) =>
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <h2 className="text-xl font-bold text-white">Execution Complete</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Labels Created", value: labelsCreated, color: "#22c55e" },
          { label: "Already Existed", value: labelsExisting, color: "#94a3b8" },
          { label: "Emails Labeled", value: emailsLabeled.toLocaleString(), color: "#4f46e5" },
          { label: "Senders Done", value: sendersProcessed, color: "#22c55e" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border p-4"
               style={{ background: '#1e293b', borderColor: '#334155' }}>
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Failed senders */}
      {sendersFailed.length > 0 && (
        <div className="rounded-xl p-4 border border-red-800/50" style={{ background: '#1e293b' }}>
          <p className="text-red-400 text-sm font-medium mb-2">{sendersFailed.length} senders failed:</p>
          <ul className="space-y-1">
            {sendersFailed.map(r => (
              <li key={r.senderEmail} className="text-xs text-gray-400">
                {r.senderEmail} — {r.error || 'Unknown error'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual steps */}
      <div className="rounded-xl p-5 border" style={{ background: '#1e293b', borderColor: '#334155' }}>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Remaining Manual Steps
        </h3>
        <ol className="space-y-3">
          {MANUAL_STEPS.map((step, i) => (
            <li key={i}
              className={`flex gap-3 cursor-pointer group`}
              onClick={() => toggleStep(i)}
            >
              <span className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center text-xs transition-colors ${
                checked[i]
                  ? 'bg-green-600 border-green-600 text-white'
                  : 'border-gray-600 group-hover:border-gray-400'
              }`}>
                {checked[i] ? '✓' : ''}
              </span>
              <div className={checked[i] ? 'opacity-50' : ''}>
                <span className="text-sm font-medium text-gray-200">{i + 1}. {step.title}</span>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Export */}
      <button
        onClick={handleExportCSV}
        className="px-5 py-2 rounded-lg text-sm font-medium text-gray-300 transition-colors border"
        style={{ background: '#1e293b', borderColor: '#334155' }}
      >
        ↓ Export Results as CSV
      </button>
    </div>
  )
}
