function isRateLimitError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('429') || err.message.toLowerCase().includes('rate limit')
  }
  return false
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (isRateLimitError(err)) {
        // Rate limited: wait 5s, 10s, 20s
        const delay = 5_000 * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
      } else {
        // Generic error: 1s, 2s, 4s
        const delay = 1_000 * Math.pow(2, attempt)
        await new Promise(r => setTimeout(r, delay))
      }
    }
  }
  throw lastError
}
