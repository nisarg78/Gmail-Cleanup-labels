'use client'

import { LABELS } from '@/lib/labels'

export function LabelPreview() {
  // Group top-level vs sub-labels
  const topLevel = LABELS.filter(l => !l.name.includes('/'))

  const renderLabel = (labelName: string, indent = false) => {
    const label = LABELS.find(l => l.name === labelName)
    if (!label) return null

    return (
      <div key={labelName} className={`flex items-center gap-2 py-1 ${indent ? 'pl-5' : ''}`}>
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: label.bg }}
        />
        <span className={`${indent ? 'text-xs text-gray-400' : 'text-sm text-gray-200'}`}>
          {indent ? label.name.split('/')[1] : label.name}
        </span>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: '#1e293b', borderColor: '#334155' }}
    >
      <h3 className="font-bold text-white mb-1">Gmail Label Preview</h3>
      <p className="text-xs text-gray-400 mb-3">
        These 26 labels will be created in your Gmail account
      </p>
      <div className="overflow-y-auto max-h-96">
        {topLevel.map(parent => (
          <div key={parent.name}>
            {renderLabel(parent.name)}
            {LABELS.filter(l => l.name.startsWith(parent.name + '/'))
              .map(child => renderLabel(child.name, true))}
          </div>
        ))}
      </div>
    </div>
  )
}
