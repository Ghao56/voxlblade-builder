import type { BuildState } from '../lib/types';
import { calculateHealBoost, type HealBoostContext } from './HealBoost';
import { calcMaxSummonCount } from './SummonData';
import { ANCIENT_CLERIC_BASE_DMG, ANCIENT_CLERIC_SLIDER_MAX, ANCIENT_CLERIC_SHIELD_BASE, ANCIENT_CLERIC_SHIELD_PER_VAL, BEENADE_BASE_DMG, BEENADE_MAX_POTENCY, BOOSTSHROOM_BASE_DMG, THUNDEROUS_CHARGE_BASE_DMG, SPORELING_TOSS_BASE_DMG, SPORELING_TOSS_HITS_BASE, SPORELING_TOSS_SLIDER_MAX, FOOT_DIVE_BASE_DMG, CACI_BASE_DMG, CACI_HITS, CACITROPS_BASE_DMG, CACITROPS_HITS, HEX_WEB_BASE_DMG, HEX_WEB_HITS, BRAINBLAST_BASE_DMG, BRAINBLAST_HITS, ROCKY_TAIL_BASE_DMG, ROCKY_TAIL_PROT_SCALE, ROCKY_TAIL_VS_BASE_RES, ROCKY_TAIL_VS_PER_LEVEL, ROCKY_TAIL_VS_DEFAULT_RES, ROCKY_TAIL_DIVISOR_COEFF, ROCKY_TAIL_DIVISOR_BASE, ROCKY_TAIL_HITS_MULT, ROCKY_TAIL_MIN_HITS } from '../lib/constants/rune-base-damage';

export interface RuneDmgCtx {
  potency: number
  sliderVal?: number
  stats?: Record<string, number>
  perks?: Record<string, number>
  selfDamage?: number
}

export interface RuneSliderDef {
  buildKey: keyof BuildState
  label: string
  min: number
  max: number
  step?: number
  getMax?: (ctx: { perks: Record<string, number> }) => number
}

export interface RuneShieldDef {
  getShieldHp: (sliderVal: number) => number
  label?: string
}

export interface RuneDmgDef {
  runeName: string
  condition?: string
  getBaseDamage: (ctx: RuneDmgCtx) => number
  dmgTypes: Record<string, number>
  scalings: Record<string, number>
  hits?: number
  getHits?: (ctx: RuneDmgCtx) => number
  maxPotency?: number
  potencyLabel?: string
  note?: string
  isHealOnly?: boolean
  slider?: RuneSliderDef
  shield?: RuneShieldDef
}

function calculateRuneHealScaling(
  runeDef: RuneDmgDef,
  ctx: {
    perks: Record<string, number>
    emotionalState?: 'buffs' | 'debuffs' | 'both'
    inDarkness: boolean
    level?: number
    sliderVal?: number
  }
): number {
  if (!runeDef.isHealOnly) return 1.0
  
  const healCtx: HealBoostContext = {
    perks: ctx.perks,
    emotionalState: ctx.emotionalState,
    inDarkness: ctx.inDarkness,
    level: ctx.level,
    sliderVal: ctx.sliderVal,
  }
  
  const result = calculateHealBoost(healCtx, 'rune')
  return result.finalMultiplier
}

export const RUNE_DMG_DEFS: RuneDmgDef[] = [
    {
      runeName: 'Ancient Cleric Rune',
      condition: 'On cast',
      getBaseDamage: () => ANCIENT_CLERIC_BASE_DMG,
      dmgTypes: { heal: 1.0 },
      scalings: { holy: 0.5, earth: 0.5 },
      hits: 1,
      isHealOnly: true,
      note: 'Heal only',
      slider: {
        buildKey: 'buffsConsumed',
        label: 'Buffs Consumed',
        min: 0,
        max: ANCIENT_CLERIC_SLIDER_MAX,
        step: 1,
      },
      shield: {
        getShieldHp: (val) => ANCIENT_CLERIC_SHIELD_BASE + ANCIENT_CLERIC_SHIELD_PER_VAL * val,
      },
    },
    {
        runeName: 'Beenade Rune',
        condition: 'On cast',
        getBaseDamage: () => BEENADE_BASE_DMG,
        dmgTypes: { magic: 0.5, holy: 0.5 },
        scalings: { magic: 1.0, holy: 1.0 },
        getHits: ({ potency }) => 1 + potency,
        maxPotency: BEENADE_MAX_POTENCY,
        potencyLabel: 'Beenades potency',
    },
    {
    runeName: 'Boostshroom Rune',
    condition: 'On activation (up to every ~2s · 20s duration)',
    getBaseDamage: () => BOOSTSHROOM_BASE_DMG,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: 1,
    note: 'Boostshroom lasts 20s and can be activated multiple times (~2s internal CD per player). Can be triggered by other players — damage still counts as yours.',
  },
  {
    runeName: 'Thunderous Charge Rune',
    condition: 'On cast (dash through enemies)',
    getBaseDamage: () => THUNDEROUS_CHARGE_BASE_DMG,
    dmgTypes: { air: 0.5, magic: 0.5 },
    scalings: { air: 1.0, magic: 1.0 },
    hits: 1,
    note: 'Hold & release right before hitting an enemy to crit and gain Lightning Cloak for 5s. An enemy does not need to be present to trigger Lightning Cloak.',
  },
  {
    runeName: 'Sporeling Toss Rune',
    condition: 'On cast',
    getBaseDamage: () => SPORELING_TOSS_BASE_DMG,
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalings: { hex: 1.0, physical: 1.0, summon: 1.0 },
    getHits: ({ sliderVal = 0 }) => SPORELING_TOSS_HITS_BASE + sliderVal,
    slider: {
      buildKey: 'sporelingsSummoned',
      label: 'Already-summoned Sporelings',
      min: 0,
      max: SPORELING_TOSS_SLIDER_MAX,
      step: 1,
      getMax: ({ perks }) => calcMaxSummonCount(perks),
    },
    note: 'Always tosses 2 fresh Sporelings + however many you already have summoned, capped at your Summon Cap (15 + Swarm) — shared cap with all minions, incl. Boglord Ring/Vassals Croak. /* TODO: verify vs wiki whether the 2 freshly-tossed sporelings count against this same cap */',
  },
  {
    runeName: 'Foot Dive Rune',
    condition: 'On cast',
    getBaseDamage: () => FOOT_DIVE_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: 1,
    note: 'Base cooldown on miss is 25 seconds, when successfully landing this rune the base cooldown is instead 5 seconds',
  },
  {
    runeName: 'Caci Rune',
    condition: 'On cast',
    getBaseDamage: () => CACI_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { summon: 1.0 },
    hits: CACI_HITS,
    note: 'Poise damage same as base damage (5 × 3 hits). Does not count as a summon.',
  },
  {
    runeName: 'Cacitrops Rune',
    condition: 'On cast',
    getBaseDamage: () => CACITROPS_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: CACITROPS_HITS,
    note: 'Damage ticks every ~0.75s over 20.25s. Dodge incoming attacks during casting animation. Every hit applies Bleed for 5s.',
  },
  {
    runeName: 'Hex Web Rune',
    condition: 'On cast',
    getBaseDamage: () => HEX_WEB_BASE_DMG,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: HEX_WEB_HITS,
    note: 'Applies Sticky (Hex Web) each hit for 5s. Damage ticks every ~0.5s over 5s. Guardbreaks. Counts as normal Sticky for perk effects.',
  },
    {
    runeName: 'Brainblast Rune',
    condition: 'On cast',
    getBaseDamage: () => BRAINBLAST_BASE_DMG,
    dmgTypes: { fire: 0.33, earth: 0.33, magic: 0.33 },
    scalings: { fire: 1.0, earth: 1.0, magic: 1.0 },
    hits: BRAINBLAST_HITS,
    note: 'Guardbreaks. Applies Sticky (Melting Slime) and Burn for 5s.',
  },
  {
    runeName: 'Fireball Rune',
    condition: 'On cast',
    getBaseDamage: () => 15,
    dmgTypes: { fire: 1.0 },
    scalings: { fire: 0.7, magic: 0.3 },
    note: 'Base Poise Damage 20. Applies Burn for 5s.',
  },
    {
    runeName: 'Rocky Tail Rune',
    condition: 'On cast / hold for tail slap combo',
    getBaseDamage: () => ROCKY_TAIL_BASE_DMG,
    dmgTypes: { earth: 0.5, physical: 0.5 },
    scalings: { earth: 1.0, protection: ROCKY_TAIL_PROT_SCALE },
    getHits: ({ stats, selfDamage = 0, perks = {} }) => {
      const p = stats?.protection ?? 0
      const vs = perks['Volatile Shell'] ?? 0
      const protRes = vs > 0 ? ROCKY_TAIL_VS_BASE_RES + ROCKY_TAIL_VS_PER_LEVEL * vs : ROCKY_TAIL_VS_DEFAULT_RES
      return Math.max(ROCKY_TAIL_MIN_HITS, Math.ceil(p / (ROCKY_TAIL_DIVISOR_COEFF * p + ROCKY_TAIL_DIVISOR_BASE + selfDamage * protRes)) * ROCKY_TAIL_HITS_MULT)
    },
  },
  {
    runeName: 'False Sun Rune',
    condition: 'Cast to create a small sun',
    getBaseDamage: () => 2.5,
    dmgTypes: { fire: 1.0, holy: 1.0 },
    scalings: { fire: 1.0, holy: 1.0 },
    hits: 10,
    note: 'Lasts 20s, pulsating every 2s. Applies Sun Blessed each pulse (10s, does not apply to allies). Activates daylight required perks. Only 1 sun active at a time — recasting while active puts rune on 10s cooldown with no effect (can still proc rune-activated perks).',
  },
]
