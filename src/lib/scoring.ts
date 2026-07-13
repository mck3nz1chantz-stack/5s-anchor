import type { AuditItemScore, Pillar } from '../types/domain'

export function computeAuditTotals(items: AuditItemScore[]) {
  const overallScore = items.reduce((s, i) => s + (Number(i.score) || 0), 0)
  const maxScore = items.reduce((s, i) => s + (Number(i.maxPoints) || 0), 0)
  const scorePct = maxScore > 0 ? Math.round((overallScore / maxScore) * 1000) / 10 : 0

  const pillarScores: Partial<Record<Pillar, number>> = {}
  const pillarMax: Partial<Record<Pillar, number>> = {}
  for (const item of items) {
    pillarScores[item.pillar] = (pillarScores[item.pillar] ?? 0) + (Number(item.score) || 0)
    pillarMax[item.pillar] = (pillarMax[item.pillar] ?? 0) + (Number(item.maxPoints) || 0)
  }

  // Store raw points per pillar for charts; UI can show %
  return { overallScore, maxScore, scorePct, pillarScores }
}

export function shouldSuggestAction(score: number, maxPoints: number, threshold = 0.7): boolean {
  if (maxPoints <= 0) return false
  return score / maxPoints < threshold
}

export function categoryColor(
  category: 'discard' | 'relocate' | 'unsure',
): 'red' | 'yellow' | 'green' {
  if (category === 'discard') return 'red'
  if (category === 'relocate') return 'yellow'
  return 'yellow' // unsure → needs review (yellow)
}
