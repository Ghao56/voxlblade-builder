function calculateMultiplierFromPct(pct: number): number {
  return Math.round((1 + pct / 100) * 10000) / 10000
}

function multiplyMultipliers(multipliers: number[]): number {
  return multipliers.reduce((acc, m) => acc * m, 1.0)
}

export function roundMultiplier(multiplier: number): number {
  return Math.round(multiplier * 10000) / 10000
}

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char])
}

export function highlightText(text: string, query: string): string {
  const q = query.trim()
  if (!q) return escapeHtml(text)

  const lowerText = text.toLowerCase()
  const lowerQuery = q.toLowerCase()

  let result = ''
  let start = 0

  while (true) {
    const index = lowerText.indexOf(lowerQuery, start)

    if (index === -1) {
      result += escapeHtml(text.slice(start))
      break
    }

    result += escapeHtml(text.slice(start, index))
    result += `<mark class="modal-hl">${escapeHtml(text.slice(index, index + q.length))}</mark>`

    start = index + q.length
  }

  return result
}

export function highlightTextParts(text: string, query: string): Array<{ text: string; highlight: boolean }> {
  const q = query.trim()
  if (!q) return [{ text, highlight: false }]

  const lowerText = text.toLowerCase()
  const lowerQuery = q.toLowerCase()
  const parts: Array<{ text: string; highlight: boolean }> = []

  let start = 0
  while (true) {
    const index = lowerText.indexOf(lowerQuery, start)
    if (index === -1) {
      parts.push({ text: text.slice(start), highlight: false })
      break
    }

    if (index > start) {
      parts.push({ text: text.slice(start, index), highlight: false })
    }

    parts.push({ text: text.slice(index, index + q.length), highlight: true })
    start = index + q.length
  }

  return parts
}