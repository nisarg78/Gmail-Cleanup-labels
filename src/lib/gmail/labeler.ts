import { google } from 'googleapis'
import type { LabelDefinition } from '@/lib/labels'

export interface LabelCreateResult {
  name: string
  id: string | null
  status: 'created' | 'existing' | 'failed'
  error?: string
}

export interface SenderAssignment {
  senderEmail: string
  labelName: string
}

export interface LabelApplyResult {
  senderEmail: string
  labelName: string
  messagesLabeled: number
  status: 'done' | 'failed'
  error?: string
}

function createGmailClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.gmail({ version: 'v1', auth })
}

export async function createLabels(
  accessToken: string,
  labels: LabelDefinition[],
  onProgress: (result: LabelCreateResult, index: number, total: number) => void
): Promise<LabelCreateResult[]> {
  const gmail = createGmailClient(accessToken)
  const total = labels.length
  const results: LabelCreateResult[] = []

  // List existing labels
  const listRes = await gmail.users.labels.list({ userId: 'me' })
  const existingMap: Record<string, string> = {}
  for (const label of listRes.data.labels ?? []) {
    if (label.name && label.id) {
      existingMap[label.name.toLowerCase()] = label.id
    }
  }

  for (let index = 0; index < labels.length; index++) {
    const { name, bg, text } = labels[index]
    const key = name.toLowerCase()

    let result: LabelCreateResult

    if (existingMap[key]) {
      result = { name, id: existingMap[key], status: 'existing' }
    } else {
      try {
        const res = await gmail.users.labels.create({
          userId: 'me',
          requestBody: {
            name,
            color: {
              backgroundColor: bg,
              textColor: text,
            },
          },
        })
        result = { name, id: res.data.id ?? null, status: 'created' }
        // Update map so nested child labels can see newly created parents
        if (res.data.id) {
          existingMap[key] = res.data.id
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        result = { name, id: null, status: 'failed', error }
      }
    }

    results.push(result)
    onProgress(result, index, total)
  }

  return results
}

export async function applyLabels(
  accessToken: string,
  assignments: SenderAssignment[],
  labelIdMap: Record<string, string>,
  onProgress: (result: LabelApplyResult, index: number, total: number) => void,
  startFromIndex?: number
): Promise<LabelApplyResult[]> {
  const gmail = createGmailClient(accessToken)
  const total = assignments.length
  const results: LabelApplyResult[] = []
  const startIndex = startFromIndex ?? 0

  for (let index = startIndex; index < assignments.length; index++) {
    const assignment = assignments[index]
    const labelId = labelIdMap[assignment.labelName.toLowerCase()]

    if (!labelId) {
      const result: LabelApplyResult = {
        senderEmail: assignment.senderEmail,
        labelName: assignment.labelName,
        messagesLabeled: 0,
        status: 'failed',
        error: `Label ID not found for "${assignment.labelName}"`,
      }
      results.push(result)
      onProgress(result, index, total)
      continue
    }

    try {
      // Paginate to collect all message IDs from this sender
      const allIds: string[] = []
      let pageToken: string | undefined

      do {
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: `from:${assignment.senderEmail}`,
          maxResults: 500,
          pageToken,
        })
        allIds.push(...(res.data.messages ?? []).map(m => m.id!))
        pageToken = res.data.nextPageToken ?? undefined
      } while (pageToken)

      // Apply label in batches of 1000 (Gmail batchModify limit)
      for (let i = 0; i < allIds.length; i += 1000) {
        await gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: allIds.slice(i, i + 1000),
            addLabelIds: [labelId],
          },
        })
      }

      const result: LabelApplyResult = {
        senderEmail: assignment.senderEmail,
        labelName: assignment.labelName,
        messagesLabeled: allIds.length,
        status: 'done',
      }
      results.push(result)
      onProgress(result, index, total)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      const result: LabelApplyResult = {
        senderEmail: assignment.senderEmail,
        labelName: assignment.labelName,
        messagesLabeled: 0,
        status: 'failed',
        error,
      }
      results.push(result)
      onProgress(result, index, total)
    }
  }

  return results
}

export function buildLabelIdMap(createResults: LabelCreateResult[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of createResults) {
    if (r.id) map[r.name.toLowerCase()] = r.id
  }
  return map
}
