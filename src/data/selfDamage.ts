export const UNDEAD_MIGHT_SELF_DMG_FRACTION = 1 / 15
export const UNDEAD_MIGHT_DR_PCT_PER_STACK = 15

import { SANGUINE_BOLT_SELF_DMG } from '../lib/constants/rune-base-damage'
import { INOCULATION_HEAL_FRACTION, INOCULATION_FLAT_HEAL_PER_STACK } from '../lib/constants/perks'

export interface SelfDamagePerkDef {
  perkName: string
  sourceType?: 'perk' | 'rune'
  runeName?: string
  appliesTo: Array<'wa' | 'rune' | 'm1' | 'm2' | 'perk'>
  selfDmgPct: number
  dmgTypes: Record<string, number>
  drPctPerStack: number
  label: string
  note?: string
  noMultiTargetFalloff?: boolean
  flatSelfDmg?: number
  procChance?: number
}

export const SELF_DAMAGE_PERK_DEFS: SelfDamagePerkDef[] = [
  {
    perkName: 'Sanguine Bolt Rune',
    sourceType: 'rune',
    runeName: 'Sanguine Bolt Rune',
    appliesTo: ['rune'],
    selfDmgPct: 0,
    dmgTypes: { physical: 1 },
    drPctPerStack: 0,
    label: 'Sanguine Bolt Rune (Self Damage)',
    flatSelfDmg: SANGUINE_BOLT_SELF_DMG,
    note: 'Per hit · can be reduced',
  },
  {
    perkName: 'Undead Might',
    appliesTo: ['wa', 'rune'],
    selfDmgPct: UNDEAD_MIGHT_SELF_DMG_FRACTION,
    dmgTypes: { hex: 0.5, earth: 0.5 },
    drPctPerStack: UNDEAD_MIGHT_DR_PCT_PER_STACK,
    label: 'Undead Might (Self Damage)',
  },
  {
    perkName: 'Explosive Charge',
    appliesTo: ['wa'],
    selfDmgPct: 1.0,
    dmgTypes: { fire: 0.5, physical: 0.5 },
    drPctPerStack: 0,
    label: 'Explosive Charge (Self Damage)',
    note: 'Guardbreaks · More points only increase AoE and Stun',
  },
  {
    perkName: 'Dark Magic',
    appliesTo: ['m1', 'm2', 'wa', 'rune', 'perk'],
    selfDmgPct: 0.005,
    dmgTypes: { hex: 1.0 },
    drPctPerStack: 0,
    label: 'Dark Magic (Self Damage)',
  },
  {
    perkName: 'Bombardier',
    appliesTo: ['m1', 'm2', 'wa', 'rune', 'perk'],
    selfDmgPct: 0.0666,
    dmgTypes: { magic: 0.5, holy: 0.5 },
    drPctPerStack: 0,
    label: 'Bombardier (Self Damage)',
    note: '6.66% of pre-modifier explosion damage. Procs on ALL hit types (M1/M2/WA/Rune/Perk).',
    noMultiTargetFalloff: true,
  },
  {
    perkName: 'Steam Powered',
    appliesTo: ['m1', 'm2', 'wa', 'rune', 'perk'],
    selfDmgPct: 0,
    dmgTypes: { fire: 1 },
    drPctPerStack: 0,
    label: 'Steam Powered (Self Damage)',
    note: '30% chance to take 1 Fire damage per hit.',
    flatSelfDmg: 1,
    procChance: 0.3,
  },
]

export function calcSelfDamage(
  def: SelfDamagePerkDef,
  perkAmount: number,
  preBoostDamageDealt: number,
  enemiesHit: number = 1,
  defenseMultipliers: Record<string, number> = {},
  hitCount: number = 1,
): { total: number; byType: Record<string, number>; totalBeforeDefense: number } {
  const weightSum = Object.values(def.dmgTypes).reduce((s, m) => s + m, 0)
  if (def.flatSelfDmg) {
    const base = def.flatSelfDmg * (def.procChance ?? 1) * hitCount * enemiesHit
    const byType: Record<string, number> = {}
    for (const [type, mult] of Object.entries(def.dmgTypes)) {
      const defMult = defenseMultipliers[type] ?? 1
      byType[type] = base * mult * defMult
    }
    const total = Object.values(byType).reduce((sum, v) => sum + v, 0)
    return { total, byType, totalBeforeDefense: base * weightSum }
  }
  if (perkAmount <= 0 || preBoostDamageDealt <= 0) return { total: 0, byType: {}, totalBeforeDefense: 0 }

  const base = preBoostDamageDealt * def.selfDmgPct
  const perkDrMult = 1 / (1 + (def.drPctPerStack * perkAmount) / 100)

  let multiTargetMult = 1
  if (!def.noMultiTargetFalloff) {
    multiTargetMult = 0
    for (let i = 1; i <= enemiesHit; i++) {
      multiTargetMult += 1 / i
    }
  }

  const baseTotal = base * perkDrMult * multiTargetMult

  const byType: Record<string, number> = {}
  for (const [type, mult] of Object.entries(def.dmgTypes)) {
    const defMult = defenseMultipliers[type] ?? 1
    byType[type] = baseTotal * mult * defMult
  }
  const total = Object.values(byType).reduce((sum, v) => sum + v, 0)
  return { total, byType, totalBeforeDefense: baseTotal * weightSum }
}

export function calcInoculationHeal(damageTakenBeforeDefense: number, perkAmount: number): number {
  if (perkAmount <= 0 || damageTakenBeforeDefense <= 0) return 0
  return (INOCULATION_HEAL_FRACTION * damageTakenBeforeDefense + INOCULATION_FLAT_HEAL_PER_STACK) * perkAmount
}