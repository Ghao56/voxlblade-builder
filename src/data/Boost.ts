import { roundMultiplier } from '../lib/utils'
import type { BoostAttackType } from '../lib/types'

export interface BoostContext {
  perks: Record<string, number>
  naturalCritChance: number
  jumpBoost: number
  summonCount: number
  ragePotency: number
  bouncePotency: number
  inDarkness: boolean
  emotionalState?: string
  level?: number
}

export interface BoostDef {
  sourceName: string
  type: 'dmg' | 'heal'
  
  // For simple boosts
  multiplierPerPerk?: number
  condition?: string
  isLevel?: boolean
  
  // For complex boosts - custom calculation function
  calcFn?: (ctx: BoostContext) => { multiplier: number; condition: string } | null
  
  // For boost that only applies to specific attack types
  appliesTo?: BoostAttackType[]
}

export const BOOST_DEFS: BoostDef[] = [
  // Simple dmg boosts
  {sourceName: 'Blood Thirsty', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Hitting an opponent with your Bleed',},
  {sourceName:'Perfection',multiplierPerPerk: 0.10, type: 'dmg', condition: 'at max potency',},
  {sourceName:'Stealth',multiplierPerPerk: 0.10, type: 'dmg', condition: "gain a Damage Boost against enemies that aren't targeting you",},
  {sourceName:'Venom Eater',multiplierPerPerk: 0.10, type: 'dmg', condition: 'On Poison proc hit',},
  { sourceName: 'Golden Crits', multiplierPerPerk: 0.50, type: 'dmg', condition: '40% chance on crit' },
  { sourceName: 'Royal Parry', multiplierPerPerk: 0.50, type: 'dmg', condition: 'on the hit that activated the Critical Boost status per 1 of this perk.' },
  { sourceName: 'Spell Piercer', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Increase damage dealt by weapon arts and runes on crit by 20% per 1 of this perk' },
  { sourceName: 'Scourge', multiplierPerPerk: 0.2, condition: 'Gain a chance for any hit to count as a Guardbreak', type: 'dmg' },
  { sourceName: 'Valor', multiplierPerPerk: 0.0666, type: 'dmg', condition: 'Damage Boost vs Taunted enemies, per 1 of this perk' },
  { sourceName: 'Undead Might', multiplierPerPerk: 0.25, type: 'dmg', condition: 'Weapon Art & Rune Damage Boost', appliesTo: ['wa', 'rune'] },
  { sourceName: 'Rider', multiplierPerPerk: 0.20, type: 'dmg', condition: 'While mounted · +0.1s stun resist/stack' },


  // Complex dmg boosts (moved from engine.ts applySpecialBoosts)
  {
    sourceName: 'Primal',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Primal'] ?? 0
      if (stacks > 0 && ctx.naturalCritChance > 0) {
        return {
          multiplier: roundMultiplier(1 + (ctx.naturalCritChance * stacks) / 100),
          condition: `${ctx.naturalCritChance.toFixed(1)}% nat. crit × ${stacks} stack`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Spring Powered',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Spring Powered'] ?? 0
      if (stacks > 0 && ctx.jumpBoost > 0) {
        return {
          multiplier: roundMultiplier(1 + ctx.jumpBoost * 0.0075 * stacks),
          condition: `${ctx.jumpBoost} jump boost × ${stacks} stack × 0.75%`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Thief Training (behind)',
    type: 'dmg',
    calcFn: (ctx) => {
      if ((ctx.perks['Thief Training'] ?? 0) > 0) {
        return { multiplier: 1.20, condition: 'attacking from behind' }
      }
      return null
    },
  },
  {
    sourceName: 'Thief Training (would-crit bonus)',
    type: 'dmg',
    calcFn: (ctx) => {
      if ((ctx.perks['Thief Training'] ?? 0) > 0) {
        return { multiplier: 1.30, condition: 'if attack would have crit without perk' }
      }
      return null
    },
  },
  {
    sourceName: 'Vassals Croak',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Vassals Croak'] ?? 0
      if (stacks > 0 && ctx.summonCount > 0) {
        const clampedCount = Math.floor(ctx.summonCount)
        return {
          multiplier: roundMultiplier(1 + 0.02 * clampedCount * stacks),
          condition: `${clampedCount} summons × ${stacks} stack × 2%`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Frenzy',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Frenzy'] ?? 0
      if (stacks > 0 && ctx.ragePotency > 0) {
        const frenzyPct = (0.05 + 0.1667 * ctx.ragePotency) * stacks
        return {
          multiplier: roundMultiplier(1 + frenzyPct),
          condition: `Rage active · potency ${Math.round(ctx.ragePotency * 1000) / 1000}`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Raging Bounce',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Raging Bounce'] ?? 0
      if (stacks > 0 && ctx.bouncePotency > 0) {
        const bouncePct = 0.70 * ctx.bouncePotency * stacks
        return {
          multiplier: roundMultiplier(1 + bouncePct),
          condition: `Bounce active · potency ${Math.round(ctx.bouncePotency * 1000) / 1000}`,
        }
      }
      return null
    },
  },
  {
    sourceName: 'Guiding Winds',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Guiding Winds'] ?? 0
      if (stacks > 0) {
        return { multiplier: 1 + 0.40 * stacks, condition: 'Moving (at max)' }
      }
      return null
    },
    appliesTo: ['m1', 'm2', 'perk'],
  },
  {
    sourceName: 'Guiding Winds (WA/Rune)',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Guiding Winds'] ?? 0
      if (stacks > 0) {
        return { multiplier: 1 + 0.30 * stacks, condition: 'Moving (at max)' }
      }
      return null
    },
    appliesTo: ['wa', 'rune'],
  },
  {
    sourceName: 'Civilian',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Civilian'] ?? 0
      if (stacks > 0) {
        return { multiplier: 1 + 0.40 * stacks, condition: 'Weapon unequipped 3s+' }
      }
      return null
    },
    appliesTo: ['rune'],
  },
  {
    sourceName: 'Vampire',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Vampire'] ?? 0
      if (stacks > 0) {
        const fullPct = stacks / 15
        const dmgPct = ctx.inDarkness ? fullPct : fullPct / 2
        return {
          multiplier: roundMultiplier(1 + dmgPct),
          condition: ctx.inDarkness ? 'In darkness' : 'In sunlight (dmg boost halved)',
        }
      }
      return null
    },
  },
  {
    sourceName: 'Vampire (Sunlight)',
    type: 'heal',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Vampire'] ?? 0
      if (stacks > 0 && !ctx.inDarkness) {
        return { multiplier: 0.5, condition: 'Healing received halved in sunlight' }
      }
      return null
    },
  },

  // Level damage (handled specially in calcBoosts)
  { sourceName: 'Level Damage', multiplierPerPerk: 0, type: 'dmg', isLevel: true },

  // Simple heal boosts
  { sourceName: 'Emotional', multiplierPerPerk: 0.20, type: 'heal', condition: 'when you have both buffs and debuffs' },
  { sourceName: 'Heal Boost', multiplierPerPerk: 0.10, type: 'heal', condition: 'Increase healing by 10% per 1 of this perk' },
  
  // Complex heal boosts
  {
    sourceName: 'Oceans Rage',
    type: 'heal',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Oceans Rage'] ?? 0
      if (stacks > 0) {
        return {
          multiplier: roundMultiplier(1 + stacks * 0.1),
          condition: `${stacks} stack × 10% outgoing heal`,
        }
      }
      return null
    },
  },
]

export const BOOST_DEF_MAP = new Map(BOOST_DEFS.map(d => [d.sourceName, d]))