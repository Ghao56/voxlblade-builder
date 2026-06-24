import type { BuildState } from '../lib/types';
import { calculateHealBoost, type HealBoostContext } from './HealBoost';

export interface RuneDmgCtx {
  potency: number
  sliderVal?: number
}

export interface RuneSliderDef {
  buildKey: keyof BuildState
  label: string
  min: number
  max: number
  step?: number
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

export function calculateRuneHealScaling(
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
]