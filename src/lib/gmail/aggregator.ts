import { MessageMetadata, SenderSummary } from './types'
import { classifyHeuristic } from './heuristics'

export function aggregateBySender(messages: MessageMetadata[]): SenderSummary[] {
  // Group by fromEmail
  const groupedBySender: Record<string, MessageMetadata[]> = {}

  for (const msg of messages) {
    if (!groupedBySender[msg.fromEmail]) {
      groupedBySender[msg.fromEmail] = []
    }
    groupedBySender[msg.fromEmail].push(msg)
  }

  // Build SenderSummary for each group
  const senders: SenderSummary[] = []

  for (const [email, group] of Object.entries(groupedBySender)) {
    // name = most frequent fromName in the group
    const nameFrequency: Record<string, number> = {}
    for (const msg of group) {
      nameFrequency[msg.fromName] = (nameFrequency[msg.fromName] || 0) + 1
    }
    const name =
      Object.entries(nameFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] || ''

    // count = group.length
    const count = group.length

    // oldestDate = earliest date in the group (ISO string comparison)
    const dates = group.map((m) => m.date).sort()
    const oldestDate = dates[0] || ''

    // newestDate = latest date
    const newestDate = dates[dates.length - 1] || ''

    // sampleSubjects = first 5 unique non-empty subjects
    const uniqueSubjects = new Set<string>()
    for (const msg of group) {
      if (msg.subject.trim() && uniqueSubjects.size < 5) {
        uniqueSubjects.add(msg.subject)
      }
    }
    const sampleSubjects = Array.from(uniqueSubjects)

    // hasUnsubscribeHeader = true if ANY message in group has it
    const hasUnsubscribeHeader = group.some((m) => m.hasUnsubscribeHeader)

    // gmailCategories = unique gmailCategory values (filter out empty strings)
    const categoriesSet = new Set<string>()
    for (const msg of group) {
      if (msg.gmailCategory.trim()) {
        categoriesSet.add(msg.gmailCategory)
      }
    }
    const gmailCategories = Array.from(categoriesSet)

    // Build partial sender for heuristic classification
    const partialSender = {
      email,
      name,
      count,
      oldestDate,
      newestDate,
      sampleSubjects,
      hasUnsubscribeHeader,
      gmailCategories,
    }

    // heuristicCategory = call classifyHeuristic
    const heuristicCategory = classifyHeuristic(partialSender)

    senders.push({
      ...partialSender,
      heuristicCategory,
    })
  }

  return senders
}
