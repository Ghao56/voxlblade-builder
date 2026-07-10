const DOT_TYPES = ['Bleed', 'Burn', 'Poison'] as const
export type DotType = typeof DOT_TYPES[number]
export const DOT_TYPE_LIST: ReadonlyArray<DotType> = DOT_TYPES

export interface DotTickResult {
  type: string
  tickDamage: number
  dotPotency?: number
  inflictionPotency?: number
  debuffName?: string
  slowDuration?: number
  baseTick?: number
}

/** Maps each DoT type to the damage type used for defense mitigation. */
export const DOT_DMG_TYPE_MAP: Record<string, string> = {
  Bleed: 'physical',
  Burn: 'fire',
  Poison: 'hex',
  'Caustic Slow': 'true',
}

/**
 * Compute a single DoT tick for a given potency type.
 *
 * InflictionPotency starts equal to DoTPotency but can be modified
 * externally (e.g. by Darkening Hex).  Pass the modified value here.
 */
export function calcDotTick(
  dotPotency: number,
  inflictionPotency: number,
): number {
  const baseDmg = 1.75 * (1 + inflictionPotency / 1.1)
  const mult = Math.pow(
    1 + dotPotency,
    1 + Math.min(1, dotPotency),
  )
  return Math.round(baseDmg * mult * 1000) / 1000
}

/**
 * Compute Caustic Slow damage.
 * Uses the same base DoT formula as calcDotTick but scales with Poison Potency
 * and gains a bonus multiplier when the enemy has the Slow debuff.
 *
 * @param poisonPotencyBuilder - builder-display Poison Potency (e.g. 5 → game 0.5)
 * @param slowDuration - total duration in seconds of the enemy's Slow debuff
 */
export function calcCausticSlow(
  poisonPotencyBuilder: number,
  slowDuration: number,
): { baseTick: number; tickDamage: number; slowMult: number } {
  const inflictionPotency = poisonPotencyBuilder * 0.1
  const baseTick = calcDotTick(inflictionPotency, inflictionPotency)
  const slowMult = slowDuration > 0 ? 1 + slowDuration * 0.1 : 1
  const tickDamage = Math.round(baseTick * slowMult * 1000) / 1000
  return { baseTick, tickDamage, slowMult }
}

/**
 * Convert a builder-display perk value to the game-internal value.
 * The game stores 0.1 per 1 display point.
 */
export function toGamePotency(builderValue: number): number {
  return builderValue * 0.1
}
