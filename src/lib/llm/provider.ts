import type { SenderSummary } from '@/lib/gmail/types'
import { LABELS } from '@/lib/labels'

export interface ClassificationResult {
  email: string
  category: string
  subcategory: string | null
  suggestedLabel: string
  suggestedAction: 'Keep' | 'Archive' | 'Unsubscribe' | 'Review'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  reasoning: string
  confidence: number
  safetyOverride?: string
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'ollama' | 'compatible' | 'none'
  apiKey: string
  model: string
  baseUrl?: string
}

export interface LLMProvider {
  name: string
  classify(senders: SenderSummary[], config: LLMConfig): Promise<ClassificationResult[]>
  testConnection(config: LLMConfig): Promise<boolean>
}

export const STORAGE_KEY = 'inboxpilot_llm_config'

const LABEL_NAMES = LABELS.map(l => l.name)

export function buildClassifyPrompt(senders: SenderSummary[]): string {
  const lines = senders.map((s, i) => {
    const subjects = s.sampleSubjects.slice(0, 5).map(subj => `"${subj.slice(0, 40)}"`).join(', ')
    const oldest = s.oldestDate.slice(0, 7)
    const newest = s.newestDate.slice(0, 7)
    return `${i + 1}. ${s.email} | "${s.name}" | ${s.count} emails | ${oldest}–${newest}\n   Subjects: ${subjects}`
  })

  return `Classify these ${senders.length} email senders. For each return JSON with:
- email (string)
- suggestedLabel (one of: ${LABEL_NAMES.join(', ')})
- suggestedAction (Keep|Archive|Unsubscribe|Review)
- riskLevel (low|medium|high|critical)
- confidence (0.0-1.0)
- reasoning (1 sentence)

Senders:
${lines.join('\n\n')}

Return a JSON array only. No prose, no markdown fences.`
}

export function parseClassificationResponse(text: string, senders: SenderSummary[]): ClassificationResult[] {
  const cleaned = text.replace(/^```json\n?/m, '').replace(/\n?```$/m, '').trim()
  try {
    const parsed: unknown = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: Record<string, unknown>, i) => ({
      email: (item.email as string) || senders[i]?.email || '',
      category: (item.suggestedLabel as string)?.split('/')[0] || 'Unknown',
      subcategory: (item.suggestedLabel as string)?.includes('/')
        ? (item.suggestedLabel as string).split('/')[1]
        : null,
      suggestedLabel: (item.suggestedLabel as string) || 'To Review',
      suggestedAction: (['Keep','Archive','Unsubscribe','Review'].includes(item.suggestedAction as string)
        ? item.suggestedAction
        : 'Review') as ClassificationResult['suggestedAction'],
      riskLevel: (['low','medium','high','critical'].includes(item.riskLevel as string)
        ? item.riskLevel
        : 'low') as ClassificationResult['riskLevel'],
      reasoning: (item.reasoning as string) || '',
      confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
    }))
  } catch {
    // If parse fails, return Review for all
    return senders.map(s => ({
      email: s.email,
      category: 'Unknown',
      subcategory: null,
      suggestedLabel: 'To Review',
      suggestedAction: 'Review',
      riskLevel: 'low',
      reasoning: 'Could not parse LLM response',
      confidence: 0,
    }))
  }
}

export function applySafetyOverrides(
  result: ClassificationResult,
  sender: SenderSummary
): ClassificationResult {
  const email = result.email.toLowerCase()

  if (/bank|\.bank|credit.*union|chase\.|wellsfargo|paypal\.|stripe\.|amex\.|visa\.|mastercard|financial\./.test(email)) {
    return { ...result, suggestedAction: 'Keep', riskLevel: 'critical', safetyOverride: 'Financial institution — always keep' }
  }
  if (/\.gov\b|irs\.|tax\.|immigration|cbp\.|dhs\.|uscis\./.test(email)) {
    return { ...result, suggestedAction: 'Keep', riskLevel: 'critical', safetyOverride: 'Government — always keep' }
  }
  if (sender.heuristicCategory === 'security') {
    return { ...result, suggestedAction: 'Keep', riskLevel: 'high', safetyOverride: 'Security alert — always keep in inbox' }
  }
  if (sender.heuristicCategory === 'receipt' && result.suggestedAction !== 'Keep' && result.suggestedAction !== 'Archive') {
    return { ...result, suggestedAction: 'Archive', riskLevel: 'medium', safetyOverride: 'Receipt/invoice — archive only, never delete' }
  }
  if (/coinbase\.|binance\.|kraken\.|gemini\.|crypto\.|ethereum\.|bitcoin\./.test(email)) {
    return { ...result, suggestedAction: 'Review', riskLevel: 'high', safetyOverride: 'Crypto exchange — review for tax implications' }
  }
  if (/job|career|recruit|hiring|linkedin\./.test(email) && sender.count > 1) {
    return { ...result, suggestedAction: 'Keep', riskLevel: 'high', safetyOverride: 'Job/career — always keep' }
  }

  return result
}
