import type { StatMap } from './types'
const NATURAL_CRIT_SOURCES: Array<{
  label: string
  calc: (stats: StatMap, perks: Record<string, number>) => number
}> = [
  {
    // Dexterity Boost → 10:1 ratio (1% dex = 0.1% crit)
    label: 'Dexterity Boost',
    calc: (stats) => {
      const dex = stats.dexterityBoost ?? 0
      return dex > 0 ? round(dex / 10) : 0
    },
  },
  {
    // Flowing Crits: Air Boost → crit
    label: 'Flowing Crits (Air)',
    calc: (stats, perks) => {
      const stacks = perks['Flowing Crits'] ?? 0
      if (stacks <= 0) return 0
      const air = stats.airBoost ?? 0
      return air > 0 ? round(0.0875 * air * stacks) : 0
    },
  },
  {
    // Seismic Momentum: Earth Boost → crit
    label: 'Seismic Momentum (Earth)',
    calc: (stats, perks) => {
      const stacks = perks['Seismic Momentum'] ?? 0
      if (stacks <= 0) return 0
      const earth = stats.earthBoost ?? 0
      return earth > 0 ? round(0.075 * earth * stacks) : 0
    },
  },
  {
    // Spell Slinger: Magic Boost → crit
    label: 'Spell Slinger (Magic)',
    calc: (stats, perks) => {
      const stacks = perks['Spell Slinger'] ?? 0
      if (stacks <= 0) return 0
      const magic = stats.magicBoost ?? 0
      return magic > 0 ? round(0.075 * magic * stacks) : 0
    },
  },
  {
    // Sharp Crits: Physical Boost → crit
    label: 'Sharp Crits (Physical)',
    calc: (stats, perks) => {
      const stacks = perks['Sharp Crits'] ?? 0
      if (stacks <= 0) return 0
      const phys = stats.physicalBoost ?? 0
      return phys > 0 ? round(0.075 * phys * stacks) : 0
    },
  },
  {
  label: 'Perfection (max stack)',
  calc: (_stats, perks) => {
    const stacks = perks['Perfection'] ?? 0
    if (stacks <= 0) return 0
    const maxPotency = stacks * 5
    return maxPotency * 1
  },
},
]

const EXTRA_CRIT_SOURCES: Array<{
  label: string
  calc: (stats: StatMap, perks: Record<string, number>) => number
}> = [
  {
    label: 'Carrying Winds (Air) on high knockback attacks',
    calc: (stats, perks) => {
      const stacks = perks['Carrying Winds'] ?? 0
      if (stacks <= 0) return 0
      const air = stats.airBoost ?? 0
      return air > 0 ? round((air / 10) * stacks) : 0
    },
  },
]
export interface CritResult {
  naturalCritChance: number
  critDamageMultiplier: number
  naturalBreakdown: Array<{ source: string; amount: number }>
  extraCritChance: number
  extraBreakdown: Array<{ source: string; amount: number }>
  /** All crit sources merged (natural + extra) for unified display */
  allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }>
  effectiveCritChance: number
  /** Breakdown of what contributes to critDamageMultiplier */
  critDmgBreakdown: Array<{ source: string; amount: number }>
}

// ─────────────────────────────────────────────────────────────────────────────

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcCrit(
  stats: StatMap,
  perks: Record<string, number>
): CritResult {
  const naturalBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of NATURAL_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount > 0) naturalBreakdown.push({ source: src.label, amount })
  }
  const naturalCritChance = round(naturalBreakdown.reduce((a, b) => a + b.amount, 0))

  const critDamageMultiplier = round(150 + naturalCritChance)

  const extraBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of EXTRA_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount > 0) extraBreakdown.push({ source: src.label, amount })
  }
  const extraCritChance = round(extraBreakdown.reduce((a, b) => a + b.amount, 0))

  const nat = Math.min(naturalCritChance, 100) / 100
  const ext = Math.min(extraCritChance, 100) / 100
  const effectiveCritChance = Math.round((1 - (1 - nat) * (1 - ext)) * 10000) / 100

  // Merged breakdown for unified display
  const allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }> = [
    ...naturalBreakdown.map(s => ({ ...s, isExtra: false })),
    ...extraBreakdown.map(s => ({ ...s, isExtra: true })),
  ]

  // Crit damage breakdown: base 150% + naturalCrit (per source)
  const critDmgBreakdown: Array<{ source: string; amount: number }> = [
    { source: 'Base', amount: 150 },
    ...naturalBreakdown.map(s => ({ source: s.source, amount: s.amount })),
  ]

  return {
    naturalCritChance,
    critDamageMultiplier,
    naturalBreakdown,
    extraCritChance,
    extraBreakdown,
    allCritBreakdown,
    effectiveCritChance,
    critDmgBreakdown,
  }
}