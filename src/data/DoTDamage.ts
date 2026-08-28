import { DOT_BASE_DAMAGE, DOT_INFLICTION_DIVISOR, DOT_POTENCY_POWER_CAP, DOT_ROUND_FACTOR, DOT_BUILDER_TO_GAME } from '../lib/constants/dot-damage'

const DOT_TYPES = ['Bleed', 'Burn', 'Poison'] as const
export type DotType = typeof DOT_TYPES[number]
export const DOT_TYPE_LIST: ReadonlyArray<DotType> = DOT_TYPES

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

/** Ghastly Rot converts Poison to the True damage type while owned. */
export function isPoisonConvertedToTrue(ghastlyRotAmt: number): boolean {
  return ghastlyRotAmt > 0
}

/** Returns the mitigation damage type for a DoT, applying Ghastly Rot's Poison hex→true conversion. */
export function getDotDmgType(type: string, ghastlyRotAmt: number): string {
  if (type === 'Poison' && isPoisonConvertedToTrue(ghastlyRotAmt)) return 'true'
  return DOT_DMG_TYPE_MAP[type] ?? 'hex'
}

/** Applies Ghastly Rot's Poison scaling conversion (hex→true) to a scalar map. */
export function applyGhastlyRotScalings(type: string, scalings: Record<string, number>, ghastlyRotAmt: number): Record<string, number> {
  if (type !== 'Poison' || !isPoisonConvertedToTrue(ghastlyRotAmt) || scalings.hex == null) return scalings
  const out = { ...scalings }
  out['true'] = (out['true'] ?? 0) + scalings.hex
  delete out.hex
  return out
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
function calcDotTick(
  dotPotency: number,
  inflictionPotency: number,
): number {
  const baseDmg = getDotBase(inflictionPotency)
  const mult = getDotPotencyMult(dotPotency)
  return Math.round(baseDmg * mult * DOT_ROUND_FACTOR) / DOT_ROUND_FACTOR
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
