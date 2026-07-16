import type { ProcCoefficient, StatMap } from './types'
import { calcProcChance } from './utils'
import {
  BASE_CRIT_DAMAGE,
  DEX_CRIT_DIVISOR,
  PRIMAL_DIVISOR,
  FLOWING_CRITS_BOOST_MULT,
  SPELL_SLINGER_BOOST_MULT,
  SHARP_CRITS_BOOST_MULT,
  SEISMIC_MOMENTUM_BOOST_MULT,
  PERFECTION_CRIT_PER_STACK,
  CACI_KING_SPIRIT_CRIT_PER_STACK,
  THIEF_TRAINING_CRIT_DMG_MULT,
  THIEF_TRAINING_CRIT_DMG_SUB,
  VENOM_EATER_CRIT_DMG_SUB,
  VENOM_EATER_CRIT_DMG_MULT,
  VITAL_STRIKES_CRIT_DMG_PER_STACK,
  SPARK_CRIT_DMG_PER_STACK,
  CRITICAL_MASTER_CRIT_DMG_PER_STACK,
  SPLINTER_CRIT_DMG_PER_STACK,
} from './constants'

const CRIT_DISABLED_PERKS = ['Seismic Momentum', 'Fractured Energy'] as const

interface CritSource {
  label: string
  calc: (stats: StatMap, perks: Record<string, number>) => number
  gatingPerks?: string[]
  naturalEquivalent?: boolean
}

const calcDexterity = (stats: StatMap) => {
  const dex = stats.dexterityBoost ?? 0
  return dex > 0 ? round(dex / DEX_CRIT_DIVISOR) : 0
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
  return stacks > 0 ? stacks * PERFECTION_CRIT_PER_STACK : 0
}

const ELEMENTAL_CRIT_SOURCES: Array<CritSource> = [
  {
    label: 'Flowing Crits (Air)',
    naturalEquivalent: true,
    calc: (stats, perks) => calcElementalBoost(perks, 'Flowing Crits', stats.airBoost, FLOWING_CRITS_BOOST_MULT),
    gatingPerks: ['Flowing Crits'],
  },
  {
    label: 'Spell Slinger (Magic)',
    naturalEquivalent: true,
    calc: (stats, perks) => calcElementalBoost(perks, 'Spell Slinger', stats.magicBoost, SPELL_SLINGER_BOOST_MULT),
    gatingPerks: ['Spell Slinger'],
  },
  {
    label: 'Sharp Crits (Physical)',
    naturalEquivalent: true,
    calc: (stats, perks) => calcElementalBoost(perks, 'Sharp Crits', stats.physicalBoost, SHARP_CRITS_BOOST_MULT),
    gatingPerks: ['Sharp Crits'],
  },
  {
    label: 'Perfection (max stack)',
    naturalEquivalent: true,
    calc: (_stats, perks) => calcPerfection(perks),
    gatingPerks: ['Perfection'],
  },
]

const NATURAL_CRIT_SOURCES: Array<CritSource> = [
    {
      label: 'Dexterity Boost',
      naturalEquivalent: true,
      calc: (stats, perks) => {
        if ((perks['Seismic Momentum'] ?? 0) > 0) return 0
        return calcDexterity(stats)
      },
    },
    {
      label: 'Seismic Momentum (Earth)',
      naturalEquivalent: true,
      calc: (stats, perks) => calcElementalBoost(perks, 'Seismic Momentum', stats.earthBoost, SEISMIC_MOMENTUM_BOOST_MULT),
      gatingPerks: ['Seismic Momentum'],
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
    gatingPerks: ['Carrying Winds'],
  },
  {
    label: "Caci King Spirit(King's Luck)",
    calc: (_stats, perks) => {
      const stacks = perks['Caci King Spirit'] ?? 0
      return stacks > 0 ? round(stacks * CACI_KING_SPIRIT_CRIT_PER_STACK) : 0
    },
    gatingPerks: ['Caci King Spirit'],
  },
]

const CRIT_DMG_SOURCES: Array<CritSource> = [
  {
    label: 'Thief Training',
    calc: (_stats, perks) => {
      const stacks = perks['Thief Training'] ?? 0
      return stacks > 0 ? stacks * THIEF_TRAINING_CRIT_DMG_MULT - THIEF_TRAINING_CRIT_DMG_SUB : 0
    },
    gatingPerks: ['Thief Training'],
  },
  {
    label: 'Dexterity Boost',
    calc: (stats, perks) => {
      if ((perks['Seismic Momentum'] ?? 0) > 0) return 0
      return calcDexterity(stats)
    },
  },
  {
    label: 'Seismic Momentum (Earth)',
    calc: (stats, perks) => calcElementalBoost(perks, 'Seismic Momentum', stats.earthBoost, SEISMIC_MOMENTUM_BOOST_MULT),
    gatingPerks: ['Seismic Momentum'],
  },
  ...ELEMENTAL_CRIT_SOURCES,
  {
    label: 'Venom Eater',
    calc: (_stats, perks) => {
      const stacks = perks['Venom Eater'] ?? 0
      return stacks > 0 ? round(-VENOM_EATER_CRIT_DMG_SUB + stacks * VENOM_EATER_CRIT_DMG_MULT) : 0
    },
  },
  {
    label: 'Vital Strikes',
    calc: (_stats, perks) => {
      const stacks = perks['Vital Strikes'] ?? 0
      return stacks > 0 ? round(stacks * VITAL_STRIKES_CRIT_DMG_PER_STACK) : 0
    },
    gatingPerks: ['Vital Strikes'],
  },
  {
    label: 'Spark (to burning enemies)',
    calc: (_stats, perks) => {
      const stacks = perks['Spark'] ?? 0
      return stacks > 0 ? round(stacks * SPARK_CRIT_DMG_PER_STACK) : 0
    },
    gatingPerks: ['Spark'],
  },
  {
    label: 'Critical Master',
    calc: (_stats, perks) => {
      const stacks = perks['Critical Master'] ?? 0
      return stacks > 0 ? round(stacks * CRITICAL_MASTER_CRIT_DMG_PER_STACK) : 0
    },
    gatingPerks: ['Critical Master'],
  },
  {
    label: 'Splinter',
    calc: (_stats, perks) => {
      const stacks = perks['Splinter'] ?? 0
      return stacks > 0 ? round(stacks * SPLINTER_CRIT_DMG_PER_STACK) : 0
    },
    gatingPerks: ['Splinter'],
  },
]

const ALL_CRIT_SOURCES = [
  ...NATURAL_CRIT_SOURCES,
  ...EXTRA_CRIT_SOURCES,
  ...CRIT_DMG_SOURCES
]

function hasActiveGatingPerks(sources: CritSource[], perks: Record<string, number>): boolean {
  return sources.some(s => s.gatingPerks?.some(p => (perks[p] ?? 0) > 0))
}

export interface CritResult {
  naturalCritChance: number
  effectiveNaturalCrit: number
  effectiveNaturalCritWithProc: number
  critDamageMultiplier: number
  naturalBreakdown: Array<{ source: string; amount: number }>
  extraCritChance: number
  extraBreakdown: Array<{ source: string; amount: number }>
  allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }>
  effectiveCritChance: number
  effectiveCritChanceWithProc: number
  critFormula: string
  critDmgBreakdown: Array<{ source: string; amount: number }>
  primalActive: boolean
  primalStacks: number
  hasCritRelevantPerks: boolean
  /**
   * Natural crit sources are positiveOnly-scaled.
   * Carrying Winds is ignore-scaled.
   * King's Luck is positiveOnly-scaled.
   * Golden Crits is a boost (not a crit source), handled separately.
   */
  procScalingInfo?: {
    naturalCritChanceWithProcCoeff: number
    kingLuckChanceWithProcCoeff: number
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calcCrit(stats: StatMap, perks: Record<string, number>, hitProcCoeff?: ProcCoefficient): CritResult {
  const naturalBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of NATURAL_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) naturalBreakdown.push({ source: src.label, amount })
  }
  const naturalCritChance = round(naturalBreakdown.reduce((a, b) => a + b.amount, 0))
  const primalStacks = perks['Primal'] ?? 0

  const effectiveNaturalCrit = primalStacks > 0 ? round(naturalCritChance / PRIMAL_DIVISOR) : naturalCritChance

  // Natural Crits are positiveOnly: only buffed by procCoeff > 1, never nerfed
  const effectiveNaturalCritWithProc = hitProcCoeff
    ? round(calcProcChance(effectiveNaturalCrit / 100, hitProcCoeff, 'positiveOnly') * 100)
    : effectiveNaturalCrit

  const extraBreakdown: Array<{ source: string; amount: number }> = []
  for (const src of EXTRA_CRIT_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) extraBreakdown.push({ source: src.label, amount })
  }
  const extraCritChance = round(extraBreakdown.reduce((a, b) => a + b.amount, 0))

  // King's Luck (Caci King Spirit) is positiveOnly
  const kingsLuckAmt = extraBreakdown.find(e => e.source.includes("King's Luck"))?.amount ?? 0
  const kingsLuckWithProc = hitProcCoeff
    ? round(calcProcChance(kingsLuckAmt / 100, hitProcCoeff, 'positiveOnly') * 100)
    : kingsLuckAmt

  const chances = [
    Math.min(effectiveNaturalCrit, 100) / 100,
    ...extraBreakdown.map(src => Math.min(src.amount, 100) / 100),
  ]

  const combined = 1 - chances.reduce((acc, chance) => acc * (1 - chance), 1)
  const effectiveCritChance = round(combined * 100)

  // Recompute with proc-scaled values for informational purposes
  const chancesWithProc = hitProcCoeff
    ? [
        Math.min(effectiveNaturalCritWithProc, 100) / 100,
        ...extraBreakdown.map(src => {
          if (src.source.includes("King's Luck")) return Math.min(kingsLuckWithProc, 100) / 100
          // Carrying Winds is ignore-scaled (unchanged)
          return Math.min(src.amount, 100) / 100
        }),
      ]
    : chances
  const combinedWithProc = 1 - chancesWithProc.reduce((acc, chance) => acc * (1 - chance), 1)
  const effectiveCritChanceWithProc = round(combinedWithProc * 100)

  const critFormula = '1 - ' + chances.map(v => `(1 - ${(v * 100).toFixed(2)}%)`).join(' * ')

  const displayedNaturalBreakdown = primalStacks > 0
    ? naturalBreakdown.map(s => ({ ...s, amount: round(s.amount / PRIMAL_DIVISOR) }))
    : naturalBreakdown

  const allCritBreakdown: Array<{ source: string; amount: number; isExtra: boolean }> = [
    ...displayedNaturalBreakdown.map(s => ({ ...s, isExtra: false })),
    ...extraBreakdown.map(s => ({ ...s, isExtra: true })),
  ]

  const critDmgBreakdown: Array<{ source: string; amount: number; naturalEquivalent?: boolean }> = [
    { source: 'Base', amount: BASE_CRIT_DAMAGE },
  ]
  for (const src of CRIT_DMG_SOURCES) {
    const amount = src.calc(stats, perks)
    if (amount !== 0) critDmgBreakdown.push({ source: src.label, amount, naturalEquivalent: src.naturalEquivalent })
  }

  let critDamageMultiplier = BASE_CRIT_DAMAGE
  if (primalStacks > 0) {
    for (const src of critDmgBreakdown) {
      if (src.source === 'Base') continue
      if (src.amount < 0 || !src.naturalEquivalent) {
        critDamageMultiplier += src.amount 
      } else {
        critDamageMultiplier += src.amount / PRIMAL_DIVISOR
      }
    }
    critDamageMultiplier = round(critDamageMultiplier)
  } else {
    critDamageMultiplier = round(critDmgBreakdown.reduce((a, b) => a + b.amount, 0))
  }

  const displayedCritDmgBreakdown: Array<{ source: string; amount: number }> = primalStacks > 0
    ? critDmgBreakdown.map(s => 
        (s.source === 'Base' || s.amount < 0 || !s.naturalEquivalent) 
          ? { source: s.source, amount: s.amount }
          : { source: s.source, amount: round(s.amount / PRIMAL_DIVISOR) }
      )
    : critDmgBreakdown.map(s => ({ source: s.source, amount: s.amount }))

  const hasCritRelevantPerks = hasActiveGatingPerks(ALL_CRIT_SOURCES, perks)

  return {
    naturalCritChance,
    effectiveNaturalCrit,
    effectiveNaturalCritWithProc,
    critDamageMultiplier,
    naturalBreakdown,
    extraCritChance,
    extraBreakdown,
    allCritBreakdown,
    effectiveCritChance,
    effectiveCritChanceWithProc,
    critFormula,
    critDmgBreakdown: displayedCritDmgBreakdown,
    primalActive: primalStacks > 0,
    primalStacks,
    hasCritRelevantPerks,
    procScalingInfo: hitProcCoeff ? {
      naturalCritChanceWithProcCoeff: effectiveNaturalCritWithProc,
      kingLuckChanceWithProcCoeff: kingsLuckWithProc,
    } : undefined,
  }
}