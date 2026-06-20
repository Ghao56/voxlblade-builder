import type { StatMap } from './types'

const CRIT_DISABLED_PERKS = ['Seismic Momentum', 'Fractured Energy'] as const

interface CritSource {
  label: string
  calc: (stats: StatMap, perks: Record<string, number>) => number
}

// --- Shared Calculation Helpers ---
const calcDexterity = (stats: StatMap) => {
  const dex = stats.dexterityBoost ?? 0
  return dex > 0 ? round(dex / 10) : 0
}

const calcElementalBoost = (
  perks: Record<string, number>, 
  perkName: string, 
  statValue: number | undefined, 
  multiplier: number
) => {
  const stacks = perks[perkName] ?? 0
  if (stacks <= 0) return 0
  const boost = statValue ?? 0
  return boost > 0 ? round(multiplier * boost * stacks) : 0
}

const calcPerfection = (perks: Record<string, number>) => {
  const stacks = perks['Perfection'] ?? 0
  return stacks > 0 ? stacks * 5 : 0
}

// --- Shared Source Object Structures ---
const ELEMENTAL_CRIT_SOURCES: Array<CritSource> = [
  {
    label: 'Flowing Crits (Air)',
    calc: (stats, perks) => calcElementalBoost(perks, 'Flowing Crits', stats.airBoost, 0.0875),
  },
  {
    label: 'Spell Slinger (Magic)',
    calc: (stats, perks) => calcElementalBoost(perks, 'Spell Slinger', stats.magicBoost, 0.075),
  },
  {
    label: 'Sharp Crits (Physical)',
    calc: (stats, perks) => calcElementalBoost(perks, 'Sharp Crits', stats.physicalBoost, 0.075),
  },
  {
    label: 'Perfection (max stack)',
    calc: (_stats, perks) => calcPerfection(perks),
  },
]

// --- Source Arrays ---
const NATURAL_CRIT_SOURCES: Array<CritSource> = [
  {
    label: 'Dexterity Boost',
    calc: (stats, perks) => {
      const critDisabled = CRIT_DISABLED_PERKS.some(perk => (perks[perk] ?? 0) > 0)
      return critDisabled ? 0 : calcDexterity(stats)
    },
  },
  {
    // Gated by Fractured Energy for crit chance but not crit damage
    label: 'Seismic Momentum (Earth)',
    calc: (stats, perks) => {
      if ((perks['Fractured Energy'] ?? 0) > 0) return 0
      return calcElementalBoost(perks, 'Seismic Momentum', stats.earthBoost, 0.075)
    },
  },
  ...ELEMENTAL_CRIT_SOURCES,
]

const EXTRA_CRIT_SOURCES: Array<CritSource> = [
  {
    label: 'Carrying Winds (Air) on high knockback attacks',
    calc: (stats, perks) => {
      const stacks = perks['Carrying Winds'] ?? 0
      if (stacks <= 0) return 0
      const air = stats.airBoost ?? 0
      return air > 0 ? round(air * stacks) : 0
    },
  },
  {
    label: "Caci King Spirit(King's Luck)",
    calc: (_stats, perks) => {
      const stacks = perks['Caci King Spirit'] ?? 0
      return stacks > 0 ? round(stacks * 20) : 0
    },
  },
]

const CRIT_DMG_SOURCES: Array<CritSource> = [
  {
    label: 'Thief Training',
    calc: (_stats, perks) => {
      const stacks = perks['Thief Training'] ?? 0
      return stacks > 0 ? stacks * 10 - 50 : 0
    },
  },
  {
    label: 'Dexterity Boost',
    // Seismic Momentum suppresses the crit damage bonus but not the chance bonus
    calc: (stats, perks) => {
      if ((perks['Seismic Momentum'] ?? 0) > 0) return 0
      return calcDexterity(stats)
    },
  },
  {
    // No Fractured Energy gate — always contributes to damage
    label: 'Seismic Momentum (Earth)',
    calc: (stats, perks) => calcElementalBoost(perks, 'Seismic Momentum', stats.earthBoost, 0.075),
  },
  ...ELEMENTAL_CRIT_SOURCES,
  {
    label: 'Venom Eater',
    calc: (_stats, perks) => {
      const stacks = perks['Venom Eater'] ?? 0
      return stacks > 0 ? round(-30 + stacks * 10) : 0
    },
  },
  {
    label: 'Vital Strikes',
    calc: (_stats, perks) => {
      const stacks = perks['Vital Strikes'] ?? 0
      return stacks > 0 ? round(stacks * 25) : 0
    },
  },
  {
    label: 'Spark (to burning enemies)',
    calc: (_stats, perks) => {
      const stacks = perks['Spark'] ?? 0
      return stacks > 0 ? round(stacks * 50) : 0
    },
  },
  {
    label: 'Critical Master',
    calc: (_stats, perks) => {
      const stacks = perks['Critical Master'] ?? 0
      return stacks > 0 ? round(stacks * 5) : 0
    },
  },
  {
    label: 'Splinter',
    calc: (_stats, perks) => {
      const stacks = perks['Splinter'] ?? 0
      return stacks > 0 ? round(stacks * 10) : 0
    },
  },
]

export interface CritResult {
  naturalCritChance: number
  effectiveNaturalCrit: number
  critDamageMultiplier: number
  naturalBreakdown: Array<{ source: string; amount: number }>
  extraCritChance: number
  extraBreakdown: Array<{ source: string; amount: number }>
  allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }>
  effectiveCritChance: number
  critFormula: string
  critDmgBreakdown: Array<{ source: string; amount: number }>
  primalActive: boolean
  primalStacks: number
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcCrit(stats: StatMap, perks: Record<string, number>): CritResult {
  const naturalBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of NATURAL_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) naturalBreakdown.push({ source: src.label, amount })
  }
  const naturalCritChance = round(naturalBreakdown.reduce((a, b) => a + b.amount, 0))
  const primalStacks = perks['Primal'] ?? 0

  const effectiveNaturalCrit = primalStacks > 0 ? round(naturalCritChance / 4) : naturalCritChance

  const extraBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of EXTRA_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) extraBreakdown.push({ source: src.label, amount })
  }
  const extraCritChance = round(extraBreakdown.reduce((a, b) => a + b.amount, 0))

  const chances = [
    Math.min(effectiveNaturalCrit, 100) / 100,
    ...extraBreakdown.map(src => Math.min(src.amount, 100) / 100),
  ]

  const combined = 1 - chances.reduce((acc, chance) => acc * (1 - chance), 1)
  const effectiveCritChance = round(combined * 100)

  const critFormula = '1 - ' + chances.map(v => `(1 - ${(v * 100).toFixed(2)}%)`).join(' * ')

  const displayedNaturalBreakdown = primalStacks > 0
    ? naturalBreakdown.map(s => ({ ...s, amount: round(s.amount / 4) }))
    : naturalBreakdown

  const allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }> = [
    ...displayedNaturalBreakdown.map(s => ({ ...s, isExtra: false })),
    ...extraBreakdown.map(s => ({ ...s, isExtra: true })),
  ]

  const critDmgBreakdown: Array<{ source: string; amount: number }> = [
    { source: 'Base', amount: 150 },
  ]
  for (const src of CRIT_DMG_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) critDmgBreakdown.push({ source: src.label, amount })
  }

  // TÍNH TOÁN CRIT DAMAGE MULTIPLIER THỰC TẾ
  let critDamageMultiplier = 150
  if (primalStacks > 0) {
    for (const src of critDmgBreakdown) {
      if (src.source === 'Base') continue
      if (src.amount < 0) {
        critDamageMultiplier += src.amount // Giữ nguyên penalty
      } else {
        critDamageMultiplier += src.amount / 4 // Giảm 4 lần bonus
      }
    }
    critDamageMultiplier = round(critDamageMultiplier)
  } else {
    critDamageMultiplier = round(critDmgBreakdown.reduce((a, b) => a + b.amount, 0))
  }

  // TÍNH TOÁN HIỂN THỊ TRÊN GIAO DIỆN
  const displayedCritDmgBreakdown: Array<{ source: string; amount: number }> = primalStacks > 0
    ? critDmgBreakdown.map(s => 
        (s.source === 'Base' || s.amount < 0) 
          ? s 
          : { ...s, amount: round(s.amount / 4) }
      )
    : critDmgBreakdown

  return {
    naturalCritChance,
    effectiveNaturalCrit,
    critDamageMultiplier,
    naturalBreakdown,
    extraCritChance,
    extraBreakdown,
    allCritBreakdown,
    effectiveCritChance,
    critFormula,
    critDmgBreakdown: displayedCritDmgBreakdown,
    primalActive: primalStacks > 0,
    primalStacks,
  }
}