export interface SelfDamagePerkDef {
  perkName: string
  appliesTo: Array<'wa' | 'rune'>
  selfDmgPct: number
  dmgTypes: Record<string, number>
  drPctPerStack: number
  label: string
  note?: string
}

export const SELF_DAMAGE_PERK_DEFS: SelfDamagePerkDef[] = [
  {
    perkName: 'Undead Might',
    appliesTo: ['wa', 'rune'],
    selfDmgPct: 1 / 15,
    dmgTypes: { hex: 0.5, earth: 0.5 },
    drPctPerStack: 15,
    label: 'Undead Might (Self Damage)',
  },
]

export function calcSelfDamage(
  def: SelfDamagePerkDef,
  perkAmount: number,
  preBoostDamageDealt: number,
  enemiesHit: number = 1,
  defenseMultipliers: Record<string, number> = {},
): { total: number; byType: Record<string, number> } {
  if (perkAmount <= 0 || preBoostDamageDealt <= 0) return { total: 0, byType: {} }

  const base = preBoostDamageDealt * def.selfDmgPct
  const perkDrMult = 1 / (1 + (def.drPctPerStack * perkAmount) / 100)
  
  // Harmonic series: 1 + 1/2 + 1/3 + ... for each enemy hit
  let multiTargetMult = 0
  for (let i = 1; i <= enemiesHit; i++) {
    multiTargetMult += 1 / i
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