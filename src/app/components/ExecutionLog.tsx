'use client'

import { useEffect, useRef } from 'react'

export type LogLevel = 'info' | 'success' | 'error' | 'warning'

export interface LogEntry {
  id: string
  level: LogLevel
  message: string
  timestamp: Date
}

interface ExecutionLogProps {
  entries: LogEntry[]
  title?: string
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  info: 'text-gray-400',
  success: 'text-green-400',
  error: 'text-red-400',
  warning: 'text-yellow-400',
}

const LEVEL_PREFIX: Record<LogLevel, string> = {
  info: '  ',
  success: '✓ ',
  error: '✗ ',
  warning: '⚠ ',
}

export default function ExecutionLog({ entries, title }: ExecutionLogProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [entries])

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: '#0a0e17', border: '1px solid #334155' }}
    >
      {title && (
        <div
          className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider"
          style={{ background: '#111827', borderBottom: '1px solid #1e293b' }}
        >
          {title}
        </div>
      )}
      <div
        ref={containerRef}
        className="overflow-y-auto p-4 space-y-0.5 font-mono text-sm"
        style={{ maxHeight: '400px' }}
      >
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-2 leading-relaxed">
            <span className="text-gray-600 text-xs whitespace-nowrap mt-0.5">
              {entry.timestamp.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            <span className={LEVEL_COLOR[entry.level]}>
              {LEVEL_PREFIX[entry.level]}
              {entry.message}
            </span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="text-gray-600 italic">Waiting to start…</div>
        )}
      </div>
    </div>
  )
}
