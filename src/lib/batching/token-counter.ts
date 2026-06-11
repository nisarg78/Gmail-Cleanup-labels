const INPUT_TOKENS_PER_SENDER = 100
const OUTPUT_TOKENS_PER_SENDER = 150
export const DEFAULT_BATCH_SIZE = 15

const MODEL_CONTEXT: Record<string, number> = {
  'claude-sonnet-4-6': 180_000,
  'claude-opus-4-8': 180_000,
  'claude-haiku-4-5-20251001': 180_000,
  'gpt-4o': 100_000,
  'gpt-4o-mini': 100_000,
  'o1-mini': 100_000,
}

export function getBatchSize(model: string): number {
  const contextLimit = MODEL_CONTEXT[model] ?? 8_000
  const maxFromContext = Math.floor(contextLimit / INPUT_TOKENS_PER_SENDER)
  return Math.min(DEFAULT_BATCH_SIZE, maxFromContext)
}

export function estimateTokens(senderCount: number): { input: number; output: number } {
  return {
    input: senderCount * INPUT_TOKENS_PER_SENDER,
    output: senderCount * OUTPUT_TOKENS_PER_SENDER,
  }
}
