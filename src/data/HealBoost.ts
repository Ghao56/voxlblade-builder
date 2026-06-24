export type HealSource = 'perk' | 'rune' | 'weaponArt' | 'passive'

export interface HealBoostContext {
  perks: Record<string, number>
  emotionalState?: 'buffs' | 'debuffs' | 'both'
  inDarkness: boolean
  level?: number
  draconicColor?: string
  sliderVal?: number
}

export interface HealBoostDef {
  sourceName: string
  sourceType: HealSource
  
  multiplierPerPerk?: number
  condition?: string
  isLevel?: boolean
  
  calcFn?: (ctx: HealBoostContext) => { multiplier: number; condition: string } | null
  
  appliesTo?: HealSource[]
  
  activeIf?: (ctx: HealBoostContext) => boolean
}

export const HEAL_SCALING_DEFS: HealBoostDef[] = [
  { 
    sourceName: 'Level Healing', 
    multiplierPerPerk: 0, 
    sourceType: 'passive',
    isLevel: true,
    condition: 'LV0 → ×1.0 · LV80 → ×2.0'
  },
  { 
    sourceName: 'Emotional', 
    multiplierPerPerk: 0.20, 
    sourceType: 'perk',
    condition: 'when you have both buffs and debuffs',
    activeIf: (ctx) => ctx.emotionalState === 'both'
  },
  { 
    sourceName: 'Heal Boost', 
    multiplierPerPerk: 0.10, 
    sourceType: 'perk',
    condition: 'Increase healing by 10% per 1 of this perk'
  },
  {
    sourceName: 'Oceans Rage',
    sourceType: 'perk',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Oceans Rage'] ?? 0
      if (stacks > 0) {
        return {
          multiplier: Math.round((1 + stacks * 0.1) * 10000) / 10000,
          condition: `${stacks} stack × 10% outgoing heal`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Vampire (Sunlight)',
    sourceType: 'perk',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Vampire'] ?? 0
      if (stacks > 0 && !ctx.inDarkness) {
        return { multiplier: 0.5, condition: 'Healing received halved in sunlight' }
      }
      return null
    },
  },
]

export const HEAL_SCALING_DEF_MAP = new Map(HEAL_SCALING_DEFS.map(d => [d.sourceName, d]))

export interface HealBoostResult {
  entries: Array<{
    sourceName: string
    rawMultiplier: number
    condition?: string
    sourceType: HealSource
  }>
  finalMultiplier: number
}

export function calculateHealBoost(
  ctx: HealBoostContext,
  appliesToType?: HealSource
): HealBoostResult {
  const entriesMap = new Map<string, { rawMultiplier: number; condition?: string; sourceType: HealSource }>()
  
  // Calculate level healing
  const level = ctx.level ?? 0
  const lvlMult = Math.round((1 + Math.max(0, Math.min(80, level)) / 80) * 10000) / 10000
  entriesMap.set('Level Healing', {
    rawMultiplier: lvlMult,
    condition: `LV0 → ×1.0 · LV80 → ×2.0`,
    sourceType: 'passive'
  })
  
  for (const def of HEAL_SCALING_DEFS) {
    if (def.isLevel) continue
    
    if (appliesToType && def.appliesTo && !def.appliesTo.includes(appliesToType)) {
      continue
    }
    
    if (def.activeIf && !def.activeIf(ctx)) {
      continue
    }
    
    if (def.calcFn) {
      const result = def.calcFn(ctx)
      if (result) {
        entriesMap.set(def.sourceName, {
          rawMultiplier: result.multiplier,
          condition: result.condition,
          sourceType: def.sourceType
        })
      }
      continue
    }
    if (def.multiplierPerPerk !== undefined) {
      const perkAmount = ctx.perks[def.sourceName] ?? 0
      if (perkAmount <= 0) continue
      
      const multiplier = 1 + def.multiplierPerPerk * perkAmount
      entriesMap.set(def.sourceName, {
        rawMultiplier: Math.round(multiplier * 10000) / 10000,
        condition: def.condition,
        sourceType: def.sourceType
      })
    }
  }
  
  const entries = Array.from(entriesMap.entries()).map(([sourceName, data]) => ({
    sourceName,
    ...data
  }))
  
  let finalMultiplier = 1.0
  for (const entry of entries) {
    finalMultiplier *= entry.rawMultiplier
  }
  
  return {
    entries,
    finalMultiplier: Math.round(finalMultiplier * 10000) / 10000
  }
}

export function getHealScalingMultiplier(
  ctx: HealBoostContext,
  appliesToType?: HealSource
): number {
  const result = calculateHealBoost(ctx, appliesToType)
  return result.finalMultiplier
}
