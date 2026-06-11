"use client"

import { useState } from "react"
import type { SenderSummary } from "@/lib/gmail/types"
import ScanProgress from "@/app/components/ScanProgress"
import { StatsCards } from "@/app/components/StatsCards"
import SenderTable from "@/app/components/SenderTable"
import { LabelPreview } from "@/app/components/LabelPreview"

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
    <div className="space-y-8">
      <ScanProgress
        onComplete={(s) => { setSenders(s); setScanError(null) }}
        onError={(msg) => setScanError(msg)}
      />

      {scanError && (
        <p className="text-red-400 text-sm">{scanError}</p>
      )}

      {senders && (
        <>
          <StatsCards senders={senders} />
          <SenderTable senders={senders} />
          <LabelPreview />
        </>
      )}
    </div>
  )
}
