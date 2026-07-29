export const UNDEAD_MIGHT_SELF_DMG_FRACTION = 1 / 15
export const UNDEAD_MIGHT_DR_PCT_PER_STACK = 15

export interface SelfDamagePerkDef {
  perkName: string
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
): { total: number; byType: Record<string, number> } {
  if (def.flatSelfDmg) {
    const base = def.flatSelfDmg * (def.procChance ?? 1) * hitCount * enemiesHit
    const byType: Record<string, number> = {}
    for (const [type, mult] of Object.entries(def.dmgTypes)) {
      const defMult = defenseMultipliers[type] ?? 1
      byType[type] = base * mult * defMult
    }
    const total = Object.values(byType).reduce((sum, v) => sum + v, 0)
    return { total, byType }
  }
  if (perkAmount <= 0 || preBoostDamageDealt <= 0) return { total: 0, byType: {} }

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
  return { total, byType }
}