import { roundMultiplier } from '../lib/utils'
import type { BoostAttackType } from '../lib/types'

/** Penance: damage boost scales with missing HP. Bleed procs at ≤35% HP. */
export const PENANCE_HP_THRESHOLD = 35       // percent (≤35% HP → max boost + bleed proc)
export const PENANCE_MAX_BOOST = 0.25        // +25% dmg cap
export const PENANCE_BLEED_POTENCY = 0       // status-only bleed, no damage
export const PENANCE_BLEED_DURATION = 5      // seconds

export interface BoostContext {
  perks: Record<string, number>
  naturalCritChance: number
  jumpBoost: number
  summonCount: number
  ragePotency: number
  bouncePotency: number
  quickdrawPotency: number
  tailwindPotency: number
  tenacity: number
  speedBoost: number
  attackSpeed: number
  inDarkness: boolean
  emotionalState?: string
  level?: number
  mountActive?: boolean
  summonBoostPct?: number
  selectedWeaponArt?: string
  hpFillPct?: number
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
  needsProcCoeff?: boolean
}

export const BOOST_DEFS: BoostDef[] = [
  // Simple dmg boosts
  {sourceName: 'Blood Thirsty', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Hitting an opponent with your Bleed', needsProcCoeff: true},
  {sourceName:'Perfection',multiplierPerPerk: 0.10, type: 'dmg', condition: 'at max potency',},
  {sourceName:'Stealth',multiplierPerPerk: 0.10, type: 'dmg', condition: "gain a Damage Boost against enemies that aren't targeting you",},
  { sourceName: 'Golden Crits', multiplierPerPerk: 0.50, type: 'dmg', condition: '40% chance on crit' },
  { sourceName: 'Royal Parry', multiplierPerPerk: 0.50, type: 'dmg', condition: 'on the hit that activated the Critical Boost status per 1 of this perk.' },
  { sourceName: 'Spell Piercer', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Increase damage dealt by weapon arts and runes on crit by 20% per 1 of this perk' },
  { sourceName: 'Scourge', multiplierPerPerk: 0.2, condition: 'Gain a chance for any hit to count as a Guardbreak', type: 'dmg' },
  { sourceName: 'Sharpshooter', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Hitting from range (hits with proc coefficient)', needsProcCoeff: true },
  { sourceName: 'Venom Eater', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Venom Eater'] ?? 0; if (a <= 0) return null; return { multiplier: 1 + 0.10 * a, condition: `+10% dmg/stack on Crit hit vs Poisoned target` } }, needsProcCoeff: true },
  { sourceName: 'Ferocity', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Ferocity'] ?? 0; if (a <= 0 || ctx.tenacity <= 0) return null; const pct = ctx.tenacity * 11 * a; return { multiplier: 1 + pct / 100, condition: `${Math.round(ctx.tenacity * 100) / 100} tenacity × ${a} Ferocity = +${pct.toFixed(2)}%` } } },
  { sourceName: 'Spirit Winds', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Spirit Winds'] ?? 0; if (a <= 0 || ctx.tailwindPotency <= 0) return null; const pct = (1/3 * ctx.tailwindPotency + 2/15 * a) * 100; return { multiplier: 1 + pct / 100, condition: `${Math.round(ctx.tailwindPotency * 1000) / 1000} tw potency × ${a} SW = +${pct.toFixed(2)}%` } } },
  { sourceName: 'Valor', multiplierPerPerk: 0.0666, type: 'dmg', condition: 'Damage Boost vs Taunted enemies, per 1 of this perk' },
  { sourceName: 'Gorecast', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Weapon Art damage vs bleeding opponents', appliesTo: ['wa'] },
  { sourceName: 'Guardian Spin', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Guardian Spin'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Spin') return null; return { multiplier: 1 + 0.15 + 0.1725 * a, condition: 'for Spin weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Wild Bolt', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Wild Bolt'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Laser') return null; return { multiplier: 1 + 0.25 * a, condition: 'for Laser weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Weighty Slam', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Weighty Slam'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Slam') return null; return { multiplier: 1 + 0.20 * a, condition: 'for Slam weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Undead Might', multiplierPerPerk: 0.25, type: 'dmg', condition: 'Weapon Art & Rune Damage Boost', appliesTo: ['wa', 'rune'] },
  { sourceName: 'Highlander', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Weapon Art & Rune Damage Boost', appliesTo: ['wa', 'rune'] },
  {
    sourceName: 'Juggernaut',
    type: 'dmg',
    calcFn: (ctx) => {
      const amt = ctx.perks['Juggernaut'] ?? 0
      if (amt <= 0) return null
      const negSpeed = Math.abs(Math.min(ctx.speedBoost, 0))
      const negAtkSpd = Math.abs(Math.min(ctx.attackSpeed, 0))
      if (negSpeed <= 0 && negAtkSpd <= 0) return null
      const pct = ((negSpeed + negAtkSpd) * amt) / 2
      return {
        multiplier: 1 + pct / 100,
        condition: `-${negSpeed}% spd + -${negAtkSpd}% aspd = +${pct.toFixed(2)}%`,
      }
    },
  },
  { sourceName: 'Rider', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Rider'] ?? 0; if (a <= 0 || !ctx.mountActive) return null; return { multiplier: 1 + 0.20 * a, condition: 'While mounted · +0.1s stun resist/stack' } } },
  {
    sourceName: 'Quickdraw',
    type: 'dmg',
    calcFn: (ctx) => {
      if (ctx.quickdrawPotency > 0) {
        return {
          multiplier: roundMultiplier(1 + ctx.quickdrawPotency * 3),
          condition: `Quickdraw active`,
        }
      }
      return null
    },
    appliesTo: ['wa', 'rune'],
  },


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
        const frenzyPct = (0.05 + (1 / 6) * ctx.ragePotency) * stacks
        return {
          multiplier: 1 + frenzyPct,
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

  {
    sourceName: 'Minion Absorption',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Minion Absorption'] ?? 0
      if (stacks <= 0) return null
      const sb = ctx.summonBoostPct ?? 0
      if (sb <= 0) return null
      const potency = Math.round(0.2 * (sb / 100) * stacks * 10000) / 10000
      return {
        multiplier: roundMultiplier(1 + potency),
        condition: `${sb}% Summon Boost × ${stacks} stack · potency ${potency}`,
      }
    },
  },

  {
    sourceName: 'Penance',
    type: 'dmg',
    calcFn: (ctx) => {
      const amount = ctx.perks['Penance'] ?? 0
      if (amount <= 0) return null
      const hpFill = ctx.hpFillPct ?? 100
      const hpPercent = hpFill / 100
      const boostPerStack = Math.min(PENANCE_MAX_BOOST, PENANCE_MAX_BOOST * (1 - hpPercent) / (1 - PENANCE_HP_THRESHOLD / 100))
      const totalBoost = 1 + boostPerStack * amount
      const pct = Math.round((totalBoost - 1) * 10000) / 100
      return {
        multiplier: totalBoost,
        condition: `${hpFill}% HP → +${pct}% dmg`,
      }
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

const BOOST_DEF_MAP = new Map(BOOST_DEFS.map(d => [d.sourceName, d]))