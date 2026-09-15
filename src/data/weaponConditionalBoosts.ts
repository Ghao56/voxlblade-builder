import { roundMultiplier } from '../lib/utils'

export type WeaponHitScope = 'm1' | 'm1Finisher' | 'm2' | 'all'

export const UNBALANCED_WEAPONRY = ['Unbalanced Sword', 'Dual Unbalanced Swords', 'Great Spear'] as const

export function isUnbalancedWeaponry(weaponType: string): boolean {
  return (UNBALANCED_WEAPONRY as readonly string[]).includes(weaponType)
}

interface WeaponConditionalBoost {
  perkName: string
  multiplierPerPerk: number
  weaponTypes: string[]
  hitScope: WeaponHitScope
  condition: string
  skipIfPerkAlreadyMatched?: boolean
}

const WEAPON_CONDITIONAL_BOOSTS: WeaponConditionalBoost[] = [
  {
    perkName: 'Aggressive Personality',
    multiplierPerPerk: 0.25,
    weaponTypes: ['War Hammer', 'Dual Mallets'],
    hitScope: 'm1Finisher',
    condition: 'M1 Finisher (ground slam)',
  },
  {
    perkName: 'Aggressive Personality',
    multiplierPerPerk: 0.25,
    weaponTypes: ['Mallet'],
    hitScope: 'm2',
    condition: 'M2 (ground slam)',
  },
  {
    perkName: 'Piercer',
    multiplierPerPerk: 0.20,
    weaponTypes: ['1-Handed Sword', 'Spear', 'Dagger', 'Fists', 'Rapier', 'Rifle'],
    hitScope: 'm1Finisher',
    condition: 'M1 Finisher (doubled effect)',
  },
  {
    perkName: 'Piercer',
    multiplierPerPerk: 0.10,
    weaponTypes: ['*'],
    hitScope: 'm1Finisher',
    condition: 'M1 Finisher (base effect)',
    skipIfPerkAlreadyMatched: true,
  },
  {
    perkName: 'Piercer',
    multiplierPerPerk: 0.20,
    weaponTypes: ['1-Handed Sword', 'Spear', 'Dagger', 'Fists', 'Rapier', 'Rifle'],
    hitScope: 'm2',
    condition: 'M2 Finisher (doubled effect)',
  },
  {
    perkName: 'Piercer',
    multiplierPerPerk: 0.10,
    weaponTypes: ['*'],
    hitScope: 'm2',
    condition: 'M2 Finisher (base effect)',
    skipIfPerkAlreadyMatched: true,
  },
  {
    perkName: 'Berserking Strength',
    multiplierPerPerk: 0.10,
    weaponTypes: [...UNBALANCED_WEAPONRY],
    hitScope: 'all',
    condition: 'All attacks (Unbalanced Weaponry)',
  },
]

export function getWeaponConditionalBoost(
  perks: Record<string, number>,
  finalWeaponType: string,
  hitScope: WeaponHitScope,
): { mult: number; labels: string[]; conditions: string[] } {
  let mult = 1
  const labels: string[] = []
  const conditions: string[] = []
  for (const def of WEAPON_CONDITIONAL_BOOSTS) {
    if (def.hitScope !== 'all' && def.hitScope !== hitScope) continue
    const matchesType = def.weaponTypes.includes('*') || def.weaponTypes.includes(finalWeaponType)
    if (!matchesType) continue
    const amt = perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (def.skipIfPerkAlreadyMatched && labels.includes(def.perkName)) continue
    mult *= 1 + def.multiplierPerPerk * amt
    labels.push(def.perkName)
    conditions.push(def.condition)
  }
  return { mult: roundMultiplier(mult), labels, conditions }
}