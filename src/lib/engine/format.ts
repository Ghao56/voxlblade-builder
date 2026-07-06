import { PERCENT_STATS } from '../types'
import { round2 } from './_utils'

export function formatStat(key: string, value: number): string {
  const rounded   = round2(value)
  const abs       = Math.abs(rounded)
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, "")
  const sign      = rounded >= 0 ? "+" : "-"
  return PERCENT_STATS.has(key) ? `${sign}${formatted}%` : `${sign}${formatted}`
}

export function formatLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase())
}
