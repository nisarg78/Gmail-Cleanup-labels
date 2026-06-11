import OpenAI from 'openai'
import type { SenderSummary } from '@/lib/gmail/types'
import type { ClassificationResult, LLMConfig, LLMProvider } from './provider'
import { buildClassifyPrompt, parseClassificationResponse } from './provider'

export const compatibleProvider: LLMProvider = {
  name: 'OpenAI-compatible',

  async classify(senders: SenderSummary[], config: LLMConfig): Promise<ClassificationResult[]> {
    const client = new OpenAI({
      apiKey: config.apiKey || 'none',
      baseURL: config.baseUrl,
    })
    const prompt = buildClassifyPrompt(senders)
    const completion = await client.chat.completions.create({
      model: config.model || 'default',
      max_tokens: 2048,
      messages: [
        { role: 'system', content: 'You are an email classifier. Return valid JSON arrays only. No prose.' },
        { role: 'user', content: prompt },
      ],
    })
    const text = completion.choices[0]?.message.content ?? '[]'
    return parseClassificationResponse(text, senders)
  },

  async testConnection(config: LLMConfig): Promise<boolean> {
    try {
      const client = new OpenAI({
        apiKey: config.apiKey || 'none',
        baseURL: config.baseUrl,
      })
      await client.chat.completions.create({
        model: config.model || 'default',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Reply with ok' }],
      })
      return true
    } catch {
      return false
    }
  },
}
