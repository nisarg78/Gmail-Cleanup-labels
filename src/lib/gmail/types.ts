export interface MessageMetadata {
  id: string
  threadId: string
  from: string
  fromEmail: string
  fromName: string
  subject: string
  date: string
  hasUnsubscribeHeader: boolean
  gmailCategory: string
}

export interface SenderSummary {
  email: string
  name: string
  count: number
  oldestDate: string
  newestDate: string
  sampleSubjects: string[]
  hasUnsubscribeHeader: boolean
  gmailCategories: string[]
  heuristicCategory: HeuristicCategory
}

export type HeuristicCategory =
  | 'newsletter'
  | 'automated'
  | 'promo'
  | 'receipt'
  | 'security'
  | 'unknown'

export interface ScanResult {
  userEmail: string
  timestamp: number
  totalMessages: number
  senders: SenderSummary[]
}

export interface ScanProgressEvent {
  phase: 'listing' | 'fetching' | 'aggregating' | 'done' | 'error'
  scanned: number
  total: number
  percent: number
  done?: boolean
  senders?: SenderSummary[]
  error?: string
}
