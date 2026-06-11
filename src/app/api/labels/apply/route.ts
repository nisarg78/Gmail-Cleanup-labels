import { auth } from '@/auth'
import { applyLabels, SenderAssignment } from '@/lib/gmail/labeler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email || !session.accessToken) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json() as {
    assignments: SenderAssignment[]
    labelIdMap: Record<string, string>
    startFromIndex?: number
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const results = await applyLabels(
          session.accessToken,
          body.assignments,
          body.labelIdMap,
          (result, index, total) => {
            send({ type: 'progress', result, index, total })
          },
          body.startFromIndex
        )

        const done = results.filter(r => r.status === 'done').length
        const failed = results.filter(r => r.status === 'failed').length
        const emailsLabeled = results.filter(r => r.status === 'done').reduce((s, r) => s + r.messagesLabeled, 0)

        send({ type: 'done', results, done, failed, emailsLabeled })
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'Failed to apply labels' })
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
