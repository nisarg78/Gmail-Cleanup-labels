import { auth } from '@/auth'
import { createLabels, LabelCreateResult } from '@/lib/gmail/labeler'
import { LABELS } from '@/lib/labels'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email || !session.accessToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const results = await createLabels(
          session.accessToken,
          LABELS,
          (result, index, total) => {
            send({ type: 'progress', result, index, total })
          }
        )

        const created = results.filter(r => r.status === 'created').length
        const existing = results.filter(r => r.status === 'existing').length
        const failed = results.filter(r => r.status === 'failed').length

        send({ type: 'done', results, created, existing, failed })
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'Failed to create labels' })
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
