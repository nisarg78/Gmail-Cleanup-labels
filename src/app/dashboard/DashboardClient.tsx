"use client"

import { useState } from "react"
import type { SenderSummary } from "@/lib/gmail/types"
import ScanProgress from "@/app/components/ScanProgress"

interface DashboardClientProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [senders, setSenders] = useState<SenderSummary[] | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <ScanProgress
        onComplete={(s) => { setSenders(s); setScanError(null) }}
        onError={(msg) => setScanError(msg)}
      />

      {scanError && (
        <p className="text-red-400 text-sm">{scanError}</p>
      )}

      {senders && (
        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">
            {senders.length.toLocaleString()} unique senders found
          </h2>
          <p className="text-gray-400 text-sm">
            AI classification and labeling UI coming in the next step.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(["newsletter", "automated", "promo", "receipt", "security", "unknown"] as const).map((cat) => {
              const count = senders.filter(s => s.heuristicCategory === cat).length
              if (count === 0) return null
              return (
                <div key={cat} className="bg-slate-700 rounded-lg px-4 py-3">
                  <p className="text-gray-400 text-xs capitalize">{cat}</p>
                  <p className="text-white font-bold text-lg">{count}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
