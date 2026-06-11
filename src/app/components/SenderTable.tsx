'use client'

import { useState, useMemo, useEffect } from 'react'
import { SenderSummary } from '@/lib/gmail/types'

interface SenderTableProps {
  senders: SenderSummary[]
}

type SortKey = 'name' | 'count' | 'oldestDate' | 'newestDate' | 'heuristicCategory' | 'suggestedAction'
type SortDir = 'asc' | 'desc'
type FilterTab = 'all' | 'newsletter' | 'receipt' | 'automated' | 'unknown'

const SUGGESTED_ACTION: Record<SenderSummary['heuristicCategory'], string> = {
  newsletter: 'Unsubscribe',
  promo:      'Archive',
  automated:  'Archive',
  receipt:    'Archive',
  security:   'Keep',
  unknown:    'Review',
}

const ROW_STYLE: Record<SenderSummary['heuristicCategory'], string> = {
  newsletter: 'border-l-2 border-red-500 bg-red-900/5',
  promo:      'border-l-2 border-yellow-500 bg-yellow-900/5',
  automated:  'border-l-2 border-yellow-500 bg-yellow-900/5',
  receipt:    'border-l-2 border-blue-500 bg-blue-900/5',
  security:   'border-l-2 border-green-500 bg-green-900/5',
  unknown:    '',
}

const ACTION_STYLE: Record<string, string> = {
  'Unsubscribe': 'bg-red-900/40 text-red-300',
  'Archive':     'bg-yellow-900/40 text-yellow-300',
  'Keep':        'bg-green-900/40 text-green-300',
  'Review':      'bg-slate-700 text-gray-300',
}

const CAT_STYLE: Record<SenderSummary['heuristicCategory'], string> = {
  newsletter: 'bg-gray-700 text-gray-300',
  promo:      'bg-yellow-900/40 text-yellow-300',
  automated:  'bg-slate-700 text-slate-300',
  receipt:    'bg-blue-900/40 text-blue-300',
  security:   'bg-green-900/40 text-green-300',
  unknown:    'bg-slate-800 text-gray-400',
}

function matchesFilter(s: SenderSummary, f: FilterTab): boolean {
  if (f === 'all') return true
  if (f === 'automated') return s.heuristicCategory === 'automated' || s.heuristicCategory === 'promo'
  if (f === 'unknown') return s.heuristicCategory === 'unknown' || s.heuristicCategory === 'security'
  return s.heuristicCategory === f
}

const formatDate = (iso: string) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

const PAGE_SIZE = 50

export default function SenderTable({ senders }: SenderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [filter, search])

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-white select-none"
      onClick={() => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(k); setSortDir('desc') }
      }}
    >
      {label}
      {sortKey === k && <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return senders.filter(s =>
      matchesFilter(s, filter) &&
      (q === '' || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    )
  }, [senders, filter, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'count') cmp = a.count - b.count
      else if (sortKey === 'oldestDate' || sortKey === 'newestDate')
        cmp = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime()
      else if (sortKey === 'suggestedAction')
        cmp = SUGGESTED_ACTION[a.heuristicCategory].localeCompare(SUGGESTED_ACTION[b.heuristicCategory])
      else cmp = (a[sortKey] as string).localeCompare(b[sortKey] as string)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageData = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'newsletter', 'receipt', 'automated', 'unknown'] as FilterTab[]).map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {' '}
            <span className="text-xs opacity-70">
              ({f === 'all' ? senders.length : senders.filter(s => matchesFilter(s, f)).length})
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2 rounded-lg text-sm text-gray-200 placeholder-gray-500 outline-none focus:ring-1 focus:ring-indigo-500"
        style={{ background: '#1e293b', border: '1px solid #334155' }}
      />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #334155' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <tr>
                <SortHeader label="Sender" k="name" />
                <SortHeader label="Emails" k="count" />
                <SortHeader label="Oldest" k="oldestDate" />
                <SortHeader label="Newest" k="newestDate" />
                <SortHeader label="Category" k="heuristicCategory" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Unsub</th>
                <SortHeader label="Action" k="suggestedAction" />
              </tr>
            </thead>
            <tbody style={{ background: '#0e1117' }}>
              {pageData.map(s => {
                const action = SUGGESTED_ACTION[s.heuristicCategory]
                return (
                  <tr key={s.email} className={`${ROW_STYLE[s.heuristicCategory]} border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-100">{s.name || s.email}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-300">{s.count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(s.oldestDate)}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(s.newestDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_STYLE[s.heuristicCategory]}`}>
                        {s.heuristicCategory}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{s.hasUnsubscribeHeader ? '✓' : '–'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_STYLE[action]}`}>
                        {action}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {pageData.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No senders match your filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ background: '#1e293b', borderTop: '1px solid #334155' }}>
            <span className="text-xs text-gray-400">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="px-3 py-1 text-xs rounded bg-slate-700 text-gray-300 disabled:opacity-40 hover:bg-slate-600">
                ← Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 text-xs rounded bg-slate-700 text-gray-300 disabled:opacity-40 hover:bg-slate-600">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{sorted.length} senders · Page {page + 1} of {totalPages || 1}</p>
    </div>
  )
}
