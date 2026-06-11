import type { SenderSummary } from '@/lib/gmail/types'
import type { ClassificationResult, LLMConfig, LLMProvider } from './provider'
import { applySafetyOverrides } from './provider'
import { anthropicProvider } from './anthropic'
import { openaiProvider } from './openai'
import { ollamaProvider } from './ollama'
import { compatibleProvider } from './compatible'
import { getBatchSize } from '@/lib/batching/token-counter'
import { withRetry } from '@/lib/batching/retry'

function getProvider(config: LLMConfig): LLMProvider | null {
  switch (config.provider) {
    case 'anthropic': return anthropicProvider
    case 'openai': return openaiProvider
    case 'ollama': return ollamaProvider
    case 'compatible': return compatibleProvider
    default: return null
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

export interface ClassifyBatchEvent {
  batch: number
  totalBatches: number
  results: ClassificationResult[]
}

export async function* classifyStream(
  senders: SenderSummary[],
  config: LLMConfig
): AsyncGenerator<ClassifyBatchEvent> {
  const provider = getProvider(config)
  if (!provider) {
    throw new Error(`Unknown provider: ${config.provider}`)
  }

  const batchSize = getBatchSize(config.model)
  const chunks = chunkArray(senders, batchSize)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const rawResults = await withRetry(() => provider.classify(chunk, config))

    // Apply safety overrides
    const safeResults = rawResults.map((result, idx) => {
      const sender = chunk[idx] ?? chunk.find(s => s.email === result.email) ?? chunk[0]
      return applySafetyOverrides(result, sender)
    })

    yield {
      batch: i + 1,
      totalBatches: chunks.length,
      results: safeResults,
    }
  }
}

// Non-streaming version for simple use cases
export async function classifyAll(
  senders: SenderSummary[],
  config: LLMConfig
): Promise<ClassificationResult[]> {
  const all: ClassificationResult[] = []
  for await (const event of classifyStream(senders, config)) {
    all.push(...event.results)
  }
  return all
}
