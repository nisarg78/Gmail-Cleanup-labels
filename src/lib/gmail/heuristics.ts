import { HeuristicCategory, SenderSummary } from './types'

export function classifyHeuristic(
  sender: Omit<SenderSummary, 'heuristicCategory'>
): HeuristicCategory {
  // Rule 1: hasUnsubscribeHeader === true → 'newsletter'
  if (sender.hasUnsubscribeHeader) {
    return 'newsletter'
  }

  // Rule 2: email contains 'noreply', 'no-reply', or 'newsletter' (case-insensitive) → 'automated'
  const emailLower = sender.email.toLowerCase()
  if (
    emailLower.includes('noreply') ||
    emailLower.includes('no-reply') ||
    emailLower.includes('newsletter')
  ) {
    return 'automated'
  }

  // Rule 3: Any gmailCategories contains 'PROMOTIONS' → 'promo'
  if (sender.gmailCategories.includes('PROMOTIONS')) {
    return 'promo'
  }

  // Rule 4: Any sampleSubjects contains 'receipt', 'invoice', 'order', or 'payment' (case-insensitive) → 'receipt'
  const receiptKeywords = ['receipt', 'invoice', 'order', 'payment']
  for (const subject of sender.sampleSubjects) {
    const subjectLower = subject.toLowerCase()
    if (receiptKeywords.some((keyword) => subjectLower.includes(keyword))) {
      return 'receipt'
    }
  }

  // Rule 5: Any sampleSubjects contains 'security', 'password', or 'verification' (case-insensitive) → 'security'
  const securityKeywords = ['security', 'password', 'verification']
  for (const subject of sender.sampleSubjects) {
    const subjectLower = subject.toLowerCase()
    if (securityKeywords.some((keyword) => subjectLower.includes(keyword))) {
      return 'security'
    }
  }

  // Rule 6: Default → 'unknown'
  return 'unknown'
}
