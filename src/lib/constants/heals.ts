export const CRIT_HEALING_MULT_BASE = 100
export const CRIT_HEALING_HOLY_BOOST_DIVISOR = 5
export const CRIT_HEALING_CHANCE_BASE = 20
export const CRIT_HEALING_PERK_BONUS = 35
export const CRIT_HEALING_PER_STACK = 16.65

export function critHealingDmgMult(perkAmount: number): number {
  if (perkAmount <= 0) return 0
  return CRIT_HEALING_MULT_BASE + CRIT_HEALING_PERK_BONUS + CRIT_HEALING_PER_STACK * perkAmount
}

export function critHealingChance(holyBoost: number): number {
  return CRIT_HEALING_CHANCE_BASE + holyBoost / CRIT_HEALING_HOLY_BOOST_DIVISOR
}

export const OCEAN_SONG_PER_STACK = 0.1
