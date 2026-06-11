import Anthropic from '@anthropic-ai/sdk'
import type { SenderSummary } from '@/lib/gmail/types'
import type { ClassificationResult, LLMConfig, LLMProvider } from './provider'
import { buildClassifyPrompt, parseClassificationResponse } from './provider'

export const anthropicProvider: LLMProvider = {
  name: 'Anthropic Claude',

  async classify(senders: SenderSummary[], config: LLMConfig): Promise<ClassificationResult[]> {
    const client = new Anthropic({ apiKey: config.apiKey })
    const prompt = buildClassifyPrompt(senders)
    const message = await client.messages.create({
      model: config.model || 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'You are an email classifier. Return valid JSON arrays only. No prose, no markdown.',
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content.find(b => b.type === 'text')?.text ?? '[]'
    return parseClassificationResponse(text, senders)
  },

  async testConnection(config: LLMConfig): Promise<boolean> {
    try {
      const client = new Anthropic({ apiKey: config.apiKey })
      await client.messages.create({
        model: config.model || 'claude-sonnet-4-6',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with ok' }],
      })
      return true
    } catch {
      return false
    }
  },
}
