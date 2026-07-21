import { DOT_BASE_DAMAGE, DOT_INFLICTION_DIVISOR, DOT_POTENCY_POWER_CAP, DOT_ROUND_FACTOR, DOT_BUILDER_TO_GAME, DOT_SLOW_MULT_PER_SECOND } from '../lib/constants/dot-damage'

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

/** Stat scalings per DoT type. Same format as weapon scalings. */
export const DOT_SCALINGS: Record<string, Record<string, number>> = {
  Bleed: { dexterity: 1.0, physical: 1.0 },
  Burn: { fire: 1.5 },
  Poison: { hex: 1.0, earth: 1.0 },
  'Caustic Slow': { hex: 1.0, earth: 1.0 },
}

/** Maps each DoT type to the damage type used for defense mitigation. */
export const DOT_DMG_TYPE_MAP: Record<string, string> = {
  Bleed: 'physical',
  Burn: 'fire',
  Poison: 'hex',
  'Caustic Slow': 'true',
}

/**
 * Returns the flat base damage before potency multiplier.
 * Formula: 1.75 × (1 + inflictionPotency / 1.1)
 */
export function getDotBase(inflictionPotency: number): number {
  return DOT_BASE_DAMAGE * (1 + inflictionPotency / DOT_INFLICTION_DIVISOR)
}

/**
 * Returns the potency multiplier.
 * Formula: (1 + dotPotency)^(1 + min(1, dotPotency))
 * Cap: exponent = 2 when dotPotency >= 1.0 (perkAmount >= 10).
 */
export function getDotPotencyMult(dotPotency: number): number {
  return Math.pow(1 + dotPotency, 1 + Math.min(DOT_POTENCY_POWER_CAP, dotPotency))
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
  const baseDmg = getDotBase(inflictionPotency)
  const mult = getDotPotencyMult(dotPotency)
  return Math.round(baseDmg * mult * DOT_ROUND_FACTOR) / DOT_ROUND_FACTOR
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
  const inflictionPotency = poisonPotencyBuilder * DOT_BUILDER_TO_GAME
  const baseTick = calcDotTick(inflictionPotency, inflictionPotency)
  const slowMult = slowDuration > 0 ? 1 + slowDuration * DOT_SLOW_MULT_PER_SECOND : 1
  const tickDamage = Math.round(baseTick * slowMult * DOT_ROUND_FACTOR) / DOT_ROUND_FACTOR
  return { baseTick, tickDamage, slowMult }
}

/**
 * Convert a builder-display perk value to the game-internal value.
 * The game stores 0.1 per 1 display point.
 */
export function toGamePotency(builderValue: number): number {
  return builderValue * DOT_BUILDER_TO_GAME
}

/**
 * Compute the effective DoT display potency for a Bleed/Burn/Poison debuff.
 * Applies Endless Despair (ED) modifier when present.
 *
 * @param potPerk - The final potency perk value (after draconic modifiers etc.)
 * @param edAmt - The player's Endless Despair perk amount (0 if none)
 */
export function calcDotDisplayPotency(potPerk: number, edAmt: number): number {
  const gamePot = Math.round(potPerk * DOT_BUILDER_TO_GAME * DOT_ROUND_FACTOR) / DOT_ROUND_FACTOR
  if (edAmt <= 0) return gamePot
  return Math.round((gamePot * (1 + 0.35 * edAmt) + 0.1) * DOT_ROUND_FACTOR) / DOT_ROUND_FACTOR
}
