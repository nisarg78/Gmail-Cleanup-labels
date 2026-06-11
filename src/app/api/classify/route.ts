import { auth } from '@/auth'
import { classifyStream } from '@/lib/llm/classifier'
import type { SenderSummary } from '@/lib/gmail/types'
import type { LLMConfig } from '@/lib/llm/provider'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.json() as {
    senders: SenderSummary[]
    provider: string
    apiKey: string
    model: string
    baseUrl?: string
  }

  const config: LLMConfig = {
    provider: body.provider as LLMConfig['provider'],
    apiKey: body.apiKey,
    model: body.model,
    baseUrl: body.baseUrl,
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        for await (const event of classifyStream(body.senders, config)) {
          send(event)
        }
        send({ done: true, totalClassified: body.senders.length })
      } catch (err) {
        send({ error: err instanceof Error ? err.message : 'Classification failed' })
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
