import { auth } from '@/auth'
import type { LLMConfig } from '@/lib/llm/provider'
import { anthropicProvider } from '@/lib/llm/anthropic'
import { openaiProvider } from '@/lib/llm/openai'
import { ollamaProvider } from '@/lib/llm/ollama'
import { compatibleProvider } from '@/lib/llm/compatible'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as LLMConfig

  const providers = {
    anthropic: anthropicProvider,
    openai: openaiProvider,
    ollama: ollamaProvider,
    compatible: compatibleProvider,
  }

  const provider = providers[body.provider as keyof typeof providers]
  if (!provider) {
    return Response.json({ ok: false, error: 'Unknown provider' })
  }

  try {
    const ok = await provider.testConnection(body)
    return Response.json({ ok })
  } catch (err) {
    return Response.json({ ok: false, error: err instanceof Error ? err.message : 'Unknown error' })
  }
}
