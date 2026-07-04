import type { BuildState } from '../lib/types';
import { calculateHealBoost, type HealBoostContext } from './HealBoost';
import { calcMaxSummonCount } from './SummonData';

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
      getBaseDamage: () => 0.5,
      dmgTypes: { heal: 1.0 },
      scalings: { holy: 0.5, earth: 0.5 },
      hits: 1,
      isHealOnly: true,
      note: 'Heal only',
      slider: {
        buildKey: 'buffsConsumed',
        label: 'Buffs Consumed',
        min: 0,
        max: 20,
        step: 1,
      },
      shield: {
        getShieldHp: (val) => 20 + 4 * val,
      },
    },
    {
        runeName: 'Beenade Rune',
        condition: 'On cast',
        getBaseDamage: () => 11,
        dmgTypes: { magic: 0.5, holy: 0.5 },
        scalings: { magic: 1.0, holy: 1.0 },
        getHits: ({ potency }) => 1 + potency,
        maxPotency: 5,
        potencyLabel: 'Beenades potency',
    },
    {
    runeName: 'Boostshroom Rune',
    condition: 'On activation (up to every ~2s · 20s duration)',
    getBaseDamage: () => 3,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: 1,
    note: 'Boostshroom lasts 20s and can be activated multiple times (~2s internal CD per player). Can be triggered by other players — damage still counts as yours.',
  },
  {
    runeName: 'Thunderous Charge Rune',
    condition: 'On cast (dash through enemies)',
    getBaseDamage: () => 20,
    dmgTypes: { air: 0.5, magic: 0.5 },
    scalings: { air: 1.0, magic: 1.0 },
    hits: 1,
    note: 'Hold & release right before hitting an enemy to crit and gain Lightning Cloak for 5s. An enemy does not need to be present to trigger Lightning Cloak.',
  },
  {
    runeName: 'Sporeling Toss Rune',
    condition: 'On cast',
    getBaseDamage: () => 3.5,
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalings: { hex: 1.0, physical: 1.0, summon: 1.0 },
    getHits: ({ sliderVal = 0 }) => 2 + sliderVal,
    slider: {
      buildKey: 'sporelingsSummoned',
      label: 'Already-summoned Sporelings',
      min: 0,
      max: 15,
      step: 1,
      getMax: ({ perks }) => calcMaxSummonCount(perks),
    },
    note: 'Always tosses 2 fresh Sporelings + however many you already have summoned, capped at your Summon Cap (15 + Swarm) — shared cap with all minions, incl. Boglord Ring/Vassals Croak. /* TODO: verify vs wiki whether the 2 freshly-tossed sporelings count against this same cap */',
  },
  {
    runeName: 'Foot Dive Rune',
    condition: 'On cast',
    getBaseDamage: () => 18,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: 1,
    note: 'Base cooldown on miss is 25 seconds, when successfully landing this rune the base cooldown is instead 5 seconds',
  },
  {
    runeName: 'Caci Rune',
    condition: 'On cast',
    getBaseDamage: () => 5,
    dmgTypes: { physical: 1.0 },
    scalings: { summon: 1.0 },
    hits: 3,
    note: 'Poise damage same as base damage (5 × 3 hits). Does not count as a summon.',
  },
  {
    runeName: 'Cacitrops Rune',
    condition: 'On cast',
    getBaseDamage: () => 4,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: 27,
    note: 'Damage ticks every ~0.75s over 20.25s. Dodge incoming attacks during casting animation. Every hit applies Bleed for 5s.',
  },
  {
    runeName: 'Hex Web Rune',
    condition: 'On cast',
    getBaseDamage: () => 2,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: 10,
    note: 'Applies Sticky (Hex Web) each hit for 5s. Damage ticks every ~0.5s over 5s. Guardbreaks. Counts as normal Sticky for perk effects.',
  },
    {
    runeName: 'Brainblast Rune',
    condition: 'On cast',
    getBaseDamage: () => 10,
    dmgTypes: { fire: 0.33, earth: 0.33, magic: 0.33 },
    scalings: { fire: 1.0, earth: 1.0, magic: 1.0 },
    hits: 2,
    note: 'Guardbreaks. Applies Sticky (Melting Slime) and Burn for 5s.',
  },
  {
    runeName: 'Rocky Tail Rune',
    condition: 'On cast / hold for tail slap combo',
    getBaseDamage: () => 8,
    dmgTypes: { earth: 0.5, physical: 0.5 },
    scalings: { earth: 1.0, protection: 0.08 },
    getHits: ({ stats, selfDamage = 0, perks = {} }) => {
      const p = stats?.protection ?? 0
      const vs = perks['Volatile Shell'] ?? 0
      const protRes = vs > 0 ? 0.7 + 0.15 * vs : 0.75
      return Math.max(1, Math.ceil(p / (0.01 * p + 5 + selfDamage * protRes)) * 2)
    },
  },
]
