import { SenderSummary } from '@/lib/gmail/types'

interface StatsCardsProps {
  senders: SenderSummary[]
}

export function StatsCards({ senders }: StatsCardsProps) {
  const totalEmails = senders.reduce((sum, s) => sum + s.count, 0)
  const uniqueSenders = senders.length
  const newsletters = senders.filter(
    (s) => s.heuristicCategory === 'newsletter'
  ).length
  const receipts = senders.filter((s) => s.heuristicCategory === 'receipt')
    .length
  const estimatedCleanup = senders
    .filter((s) =>
      ['newsletter', 'promo', 'automated'].includes(s.heuristicCategory)
    )
    .reduce((sum, s) => sum + s.count, 0)

  const cards = [
    {
      label: 'Total Emails Scanned',
      value: totalEmails,
      color: '#e2e8f0',
      subLabel: 'across your inbox',
    },
    {
      label: 'Unique Senders',
      value: uniqueSenders,
      color: '#4f46e5',
      subLabel: 'distinct addresses',
    },
    {
      label: 'Newsletters',
      value: newsletters,
      color: '#8d8d8d',
      subLabel: 'senders detected',
    },
    {
      label: 'Receipts',
      value: receipts,
      color: '#22c55e',
      subLabel: 'senders detected',
    },
    {
      label: 'Estimated Cleanup',
      value: estimatedCleanup,
      color: '#ef4444',
      subLabel: 'emails to archive/delete',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          style={{ background: '#1e293b', borderColor: '#334155' }}
          className="rounded-xl border p-4 flex flex-col gap-1"
        >
          <span className="text-xs font-medium text-gray-400">
            {card.label}
          </span>
          <span
            className="text-2xl font-bold"
            style={{ color: card.color }}
          >
            {card.value.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">{card.subLabel}</span>
        </div>
      ))}
    </div>
  )
}
