// ──────────────────────────────────────────────
// Rune base damage values (from Runebasedmg.ts)
// ──────────────────────────────────────────────

// Ancient Cleric
export const ANCIENT_CLERIC_BASE_DMG = 0.5
export const ANCIENT_CLERIC_SLIDER_MAX = 20
export const ANCIENT_CLERIC_SHIELD_BASE = 20
export const ANCIENT_CLERIC_SHIELD_PER_VAL = 4

// Beenade
export const BEENADE_BASE_DMG = 11
export const BEENADE_MAX_POTENCY = 5

// Boostshroom
export const BOOSTSHROOM_BASE_DMG = 3

// Thunderous Charge
export const THUNDEROUS_CHARGE_BASE_DMG = 20

// Sporeling Toss
export const SPORELING_TOSS_BASE_DMG = 3.5
export const SPORELING_TOSS_HITS_BASE = 2
export const SPORELING_TOSS_SLIDER_MAX = 15

// Foot Dive
export const FOOT_DIVE_BASE_DMG = 18

// Caci
export const CACI_BASE_DMG = 5
export const CACI_HITS = 3

// Cacitrops
export const CACITROPS_BASE_DMG = 4
export const CACITROPS_HITS = 27

// Hex Web
export const HEX_WEB_BASE_DMG = 2
export const HEX_WEB_HITS = 10

// Brainblast
export const BRAINBLAST_BASE_DMG = 10
export const BRAINBLAST_HITS = 2

// Rocky Tail
export const ROCKY_TAIL_BASE_DMG = 8
export const ROCKY_TAIL_PROT_SCALE = 0.08
export const ROCKY_TAIL_VS_BASE_RES = 0.7
export const ROCKY_TAIL_VS_PER_LEVEL = 0.15
export const ROCKY_TAIL_VS_DEFAULT_RES = 0.75
export const ROCKY_TAIL_DIVISOR_COEFF = 0.01
export const ROCKY_TAIL_DIVISOR_BASE = 5
export const ROCKY_TAIL_HITS_MULT = 2
export const ROCKY_TAIL_MIN_HITS = 1

// Slayer Rage (Rage Rune / Weakening Roar Rune hold-channel)
export const SLAYER_RAGE_HITS = 20
export const SLAYER_RAGE_RAGE_RUNE_BASE_DMG = 0.25
export const SLAYER_RAGE_RAGE_RUNE_DMG_PER_STACK = 0.125
export const SLAYER_RAGE_ROAR_RUNE_BASE_DMG = 0.5
export const SLAYER_RAGE_ROAR_RUNE_DMG_PER_STACK = 0.1875

// Enchanted Sword Rune (Dagger -> One-Handed Sword -> Greatsword)
export const ENCHANTED_SWORD_WEAPON_TYPES = ['Dagger', 'One-Handed Sword', 'Greatsword'] as const
export const ENCHANTED_SWORD_DAGGER_BASE_DMG = 7
export const ENCHANTED_SWORD_SWORD_BASE_DMG = 15
export const ENCHANTED_SWORD_GREATSWORD_BASE_DMG = 40
export const ENCHANTED_SWORD_DAGGER_POISE = 10
export const ENCHANTED_SWORD_SWORD_POISE = 12
export const ENCHANTED_SWORD_GREATSWORD_POISE = 65
export const ENCHANTED_SWORD_DAGGER_COOLDOWN = 10
export const ENCHANTED_SWORD_SWORD_COOLDOWN = 15
export const ENCHANTED_SWORD_GREATSWORD_COOLDOWN = 20
export const ENCHANTED_SWORD_CD_BY_TYPE: Record<number, number> = {
  0: ENCHANTED_SWORD_DAGGER_COOLDOWN,
  1: ENCHANTED_SWORD_SWORD_COOLDOWN,
  2: ENCHANTED_SWORD_GREATSWORD_COOLDOWN,
}

// Runic Glass (One-Handed Sword secondary effect)
export const RUNIC_GLASS_BASE_DMG = 1.5
export const RUNIC_GLASS_DURATION = 5
export const RUNIC_GLASS_TICKS = 5

// Sanguine Bolt
export const SANGUINE_BOLT_BASE_DMG = 3.45
export const SANGUINE_BOLT_HITS = 11
export const SANGUINE_BOLT_SELF_DMG = 2.4

import { ENDLESS_DESPAIR_DURATION_PER_STACK } from './buffs'

/**
 * Effective Runic Glass duration as a debuff: Endless Despair's debuff-duration
 * multiplier applies like any other enemy debuff (1 tick per second).
 */
export function getRunicGlassDuration(perks: Record<string, number>): number {
  const edAmt = perks['Endless Despair'] ?? 0
  return Math.round(RUNIC_GLASS_DURATION * (1 + ENDLESS_DESPAIR_DURATION_PER_STACK * edAmt))
}
