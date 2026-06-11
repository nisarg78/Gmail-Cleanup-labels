'use client'

import { useState } from 'react'
import type { ClassificationResult } from '@/lib/llm/provider'
import type { SenderSummary } from '@/lib/gmail/types'

interface ApprovalPanelProps {
  results: ClassificationResult[]
  senders: SenderSummary[]
  onApprove: (approved: ClassificationResult[]) => void
}

const ACTION_CYCLE: ClassificationResult['suggestedAction'][] = ['Keep', 'Archive', 'Unsubscribe', 'Review']

function cycleAction(
  current: ClassificationResult['suggestedAction'],
): ClassificationResult['suggestedAction'] {
  const idx = ACTION_CYCLE.indexOf(current)
  return ACTION_CYCLE[(idx + 1) % ACTION_CYCLE.length]
}

const ACTION_COLOR: Record<string, string> = {
  Keep:        'bg-green-900/40 text-green-300 border border-green-700',
  Archive:     'bg-yellow-900/40 text-yellow-300 border border-yellow-700',
  Unsubscribe: 'bg-red-900/40 text-red-300 border border-red-700',
  Review:      'bg-slate-700 text-gray-300 border border-slate-600',
}

const RISK_COLOR: Record<string, string> = {
  low:      'text-green-400',
  medium:   'text-yellow-400',
  high:     'text-orange-400',
  critical: 'text-red-400',
}

export default function ApprovalPanel({ results, senders, onApprove }: ApprovalPanelProps) {
  const [overrides, setOverrides] = useState<Record<string, ClassificationResult['suggestedAction']>>({})
  const [mode, setMode] = useState<'list' | 'one-by-one'>('list')
  const [reviewIndex, setReviewIndex] = useState(0)

  function getEffective(result: ClassificationResult): ClassificationResult {
    if (result.safetyOverride) return result
    const override = overrides[result.email]
    return override ? { ...result, suggestedAction: override } : result
  }

  const effective = results.map(getEffective)
  const stats = {
    keep:        effective.filter(r => r.suggestedAction === 'Keep').length,
    archive:     effective.filter(r => r.suggestedAction === 'Archive').length,
    unsubscribe: effective.filter(r => r.suggestedAction === 'Unsubscribe').length,
    review:      effective.filter(r => r.suggestedAction === 'Review').length,
  }

  const handleAcceptAll = () => onApprove(results.map(getEffective))

  const handleAcceptSafe = () => {
    const approved = results
      .map(getEffective)
      .filter(r => r.safetyOverride || r.riskLevel === 'low' || r.riskLevel === 'medium')
    onApprove(approved)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">
          Review Classification ({results.length} senders)
        </h2>
        <a href="/settings" className="text-sm text-indigo-400 hover:text-indigo-300">
          ⚙ LLM Settings
        </a>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 flex-wrap text-sm">
        <span className="text-green-400">Keep: {stats.keep}</span>
        <span className="text-yellow-400">Archive: {stats.archive}</span>
        <span className="text-red-400">Unsubscribe: {stats.unsubscribe}</span>
        <span className="text-gray-400">Review: {stats.review}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleAcceptAll}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Accept All ({results.length})
        </button>
        <button
          onClick={handleAcceptSafe}
          className="px-5 py-2 rounded-lg text-sm font-semibold bg-green-700 hover:bg-green-800 text-white transition-colors"
        >
          Accept Safe Only ({results.filter(r => r.safetyOverride || r.riskLevel === 'low' || r.riskLevel === 'medium').length})
        </button>
        <button
          onClick={() => setMode(m => m === 'list' ? 'one-by-one' : 'list')}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-gray-300 transition-colors"
          style={{ background: '#334155' }}
        >
          {mode === 'list' ? 'Review One by One' : 'Back to List'}
        </button>
      </div>

      {/* List mode */}
      {mode === 'list' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Sender</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Label</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Risk</th>
                <th className="px-4 py-3 text-left text-xs text-gray-400 uppercase">Reasoning</th>
              </tr>
            </thead>
            <tbody style={{ background: '#0e1117' }}>
              {results.map(result => {
                const eff = getEffective(result)
                const sender = senders.find(s => s.email === result.email)
                const locked = !!result.safetyOverride
                return (
                  <tr key={result.email} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-200">{sender?.name || result.email}</p>
                      <p className="text-xs text-gray-500">{result.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs">{eff.suggestedLabel}</td>
                    <td className="px-4 py-3">
                      {locked ? (
                        <span
                          title={result.safetyOverride}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-default ${ACTION_COLOR[eff.suggestedAction]}`}
                        >
                          🔒 {eff.suggestedAction}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            setOverrides(o => ({
                              ...o,
                              [result.email]: cycleAction(eff.suggestedAction),
                            }))
                          }
                          className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${ACTION_COLOR[eff.suggestedAction]}`}
                        >
                          {eff.suggestedAction} ↻
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${RISK_COLOR[eff.riskLevel]}`}>
                        {eff.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate">
                      {result.reasoning}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* One-by-one mode */}
      {mode === 'one-by-one' && results[reviewIndex] && (() => {
        const result = results[reviewIndex]
        const eff = getEffective(result)
        const sender = senders.find(s => s.email === result.email)
        const locked = !!result.safetyOverride
        return (
          <div
            className="rounded-xl p-6 space-y-4"
            style={{ background: '#1e293b', border: '1px solid #334155' }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-white text-lg">{sender?.name || result.email}</p>
                <p className="text-gray-400 text-sm">{result.email}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {sender?.count} emails · {eff.suggestedLabel}
                </p>
              </div>
              <span className="text-gray-500 text-sm">
                {reviewIndex + 1} / {results.length}
              </span>
            </div>

            <p className="text-gray-300 text-sm">{result.reasoning}</p>

            {locked && (
              <p className="text-orange-400 text-xs">🔒 {result.safetyOverride}</p>
            )}

            <div className="flex gap-3 flex-wrap">
              {!locked &&
                ACTION_CYCLE.map(action => (
                  <button
                    key={action}
                    onClick={() => setOverrides(o => ({ ...o, [result.email]: action }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      eff.suggestedAction === action
                        ? ACTION_COLOR[action]
                        : 'bg-slate-700 text-gray-400 border border-slate-600'
                    }`}
                  >
                    {action}
                  </button>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setReviewIndex(i => Math.max(0, i - 1))}
                disabled={reviewIndex === 0}
                className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-gray-300 disabled:opacity-40"
              >
                ← Prev
              </button>
              {reviewIndex < results.length - 1 ? (
                <button
                  onClick={() => setReviewIndex(i => i + 1)}
                  className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-gray-300"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white font-semibold"
                >
                  Done — Accept All
                </button>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
