import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'
import type { ScanResult, ScanProgressEvent, MessageMetadata } from './types'
import { aggregateBySender } from './aggregator'

function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export async function scanInbox(
  accessToken: string,
  onProgress: (event: ScanProgressEvent) => void
): Promise<ScanResult> {
  const gmail = createGmailClient(accessToken)

  // Phase 1 — list all message IDs (paginate)
  const messageIds: string[] = []
  let pageToken: string | undefined = undefined
  let phase1Total = 0

  while (true) {
    const listRes: { data: gmail_v1.Schema$ListMessagesResponse } =
      await gmail.users.messages.list({
        userId: 'me',
        maxResults: 500,
        pageToken,
      })
    const msgs = listRes.data.messages || []
    messageIds.push(...msgs.map(m => m.id!))
    pageToken = listRes.data.nextPageToken ?? undefined
    phase1Total = listRes.data.resultSizeEstimate ?? messageIds.length
    onProgress({
      phase: 'listing',
      scanned: messageIds.length,
      total: phase1Total,
      percent: Math.round((messageIds.length / Math.max(phase1Total, 1)) * 100),
    })
    if (!pageToken) break
  }

  // Phase 2 — fetch metadata in chunks of 50
  const allMetadata: MessageMetadata[] = []
  const chunks = chunkArray(messageIds, 50)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const results = await Promise.all(
      chunk.map(id =>
        gmail.users.messages.get({
          userId: 'me',
          id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date', 'List-Unsubscribe'],
        })
      )
    )

    for (const res of results) {
      const msg = res.data
      const headers = msg.payload?.headers ?? []
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

      const from = getHeader('From')
      const subject = getHeader('Subject')
      const date = getHeader('Date')
      const unsubscribe = getHeader('List-Unsubscribe')

      // Parse "Display Name <email@example.com>" or plain email
      const angleMatch = from.match(/^(.*?)\s*<([^>]+)>\s*$/)
      let fromEmail: string
      let fromName: string
      if (angleMatch) {
        fromName = angleMatch[1].trim().replace(/^"(.*)"$/, '$1')
        fromEmail = angleMatch[2].toLowerCase()
      } else {
        fromEmail = from.toLowerCase().trim()
        fromName = ''
      }

      // gmailCategory from labelIds (CATEGORY_PROMOTIONS → PROMOTIONS)
      const gmailCategory =
        (msg.labelIds ?? [])
          .find(l => l.startsWith('CATEGORY_'))
          ?.replace('CATEGORY_', '') ?? ''

      // Parse date to ISO string
      let isoDate = ''
      try {
        isoDate = new Date(date).toISOString()
      } catch {
        isoDate = new Date().toISOString()
      }

      if (fromEmail) {
        allMetadata.push({
          id: msg.id ?? '',
          threadId: msg.threadId ?? '',
          from,
          fromEmail,
          fromName,
          subject,
          date: isoDate,
          hasUnsubscribeHeader: unsubscribe.length > 0,
          gmailCategory,
        })
      }
    }

    onProgress({
      phase: 'fetching',
      scanned: Math.min((i + 1) * 50, messageIds.length),
      total: messageIds.length,
      percent: Math.round(((i + 1) / chunks.length) * 100),
    })

    if (i < chunks.length - 1) await sleep(1000)
  }

  // Phase 3 — aggregate
  onProgress({ phase: 'aggregating', scanned: allMetadata.length, total: allMetadata.length, percent: 100 })
  const senders = aggregateBySender(allMetadata)

  // Get user email
  const profileRes = await gmail.users.getProfile({ userId: 'me' })
  const userEmail = profileRes.data.emailAddress ?? ''

  return {
    userEmail,
    timestamp: Date.now(),
    totalMessages: allMetadata.length,
    senders,
  }
}
