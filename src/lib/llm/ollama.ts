import type { SenderSummary } from '@/lib/gmail/types'
import type { ClassificationResult, LLMConfig, LLMProvider } from './provider'
import { buildClassifyPrompt, parseClassificationResponse } from './provider'

export const ollamaProvider: LLMProvider = {
  name: 'Ollama',

  async classify(senders: SenderSummary[], config: LLMConfig): Promise<ClassificationResult[]> {
    const baseUrl = config.baseUrl || 'http://localhost:11434'
    const prompt = buildClassifyPrompt(senders)
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model || 'llama3',
        messages: [
          { role: 'system', content: 'You are an email classifier. Return valid JSON arrays only. No prose.' },
          { role: 'user', content: prompt },
        ],
        stream: false,
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json() as { message?: { content?: string } }
    const text = data.message?.content ?? '[]'
    return parseClassificationResponse(text, senders)
  },

  async testConnection(config: LLMConfig): Promise<boolean> {
    try {
      const baseUrl = config.baseUrl || 'http://localhost:11434'
      const res = await fetch(`${baseUrl}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  },
}
