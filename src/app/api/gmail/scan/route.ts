export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { auth } from '@/auth'
import { scanInbox } from '@/lib/gmail/scanner'
import { saveScan, getCachedScan } from '@/lib/db'
import type { ScanProgressEvent } from '@/lib/gmail/types'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function GET() {
  const session = await auth()
  if (!session?.user?.email || !session.accessToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userEmail = session.user.email
  const accessToken = session.accessToken

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ScanProgressEvent) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
        )
      }

      try {
        // Check cache
        const cached = await getCachedScan(userEmail)
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
          send({
            phase: 'done',
            scanned: cached.data.totalMessages,
            total: cached.data.totalMessages,
            percent: 100,
            done: true,
            senders: cached.data.senders,
          })
          controller.close()
          return
        }

        // Full scan
        const result = await scanInbox(accessToken, send)
        await saveScan(userEmail, result)
        send({
          phase: 'done',
          scanned: result.totalMessages,
          total: result.totalMessages,
          percent: 100,
          done: true,
          senders: result.senders,
        })
      } catch (err) {
        send({
          phase: 'error',
          scanned: 0,
          total: 0,
          percent: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
