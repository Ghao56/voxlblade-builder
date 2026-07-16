import { roundMultiplier } from '../lib/utils'
import {
  FRENZY_BASE, FRENZY_RAGE_MULT, MINION_ABSORPTION_MULT,
  BLOOD_THIRSTY_MULT_PER_STACK, VENOM_SPITTER_MULT_PER_STACK,
  PERFECTION_MULT_PER_STACK, STEALTH_MULT_PER_STACK,
  GOLDEN_CRITS_MULT_PER_STACK, GOLDEN_CRITS_BASE_PROC_CHANCE,
  ROYAL_PARRY_MULT_PER_STACK, SPELL_PIERCER_MULT_PER_STACK,
  SCOURGE_MULT_PER_STACK, SHARPSHOOTER_MULT_PER_STACK,
  VALOR_MULT_PER_STACK, GORECAST_MULT_PER_STACK,
  UNDEAD_MIGHT_MULT_PER_STACK, HIGHLANDER_MULT_PER_STACK,
  EMOTIONAL_MULT_PER_STACK, HEAL_BOOST_MULT_PER_STACK,
  OCEANS_RAGE_MULT_PER_STACK,
  VENOM_EATER_DMG_MULT_PER_STACK, FEROCITY_TENACITY_MULT,
  SPIRIT_WINDS_TAILWIND_MULT, SPIRIT_WINDS_PER_STACK,
  GUARDIAN_SPIN_BASE, GUARDIAN_SPIN_MULT_PER_STACK,
  WILD_BOLT_MULT_PER_STACK, WEIGHTY_SLAM_MULT_PER_STACK,
  RIDER_MULT_PER_STACK, QUICKDRAW_MULT,
  SPRING_POWERED_MULT, THIEF_TRAINING_BEHIND_MULT,
  THIEF_TRAINING_WOULD_CRIT_MULT, VASSALS_CROAK_MULT_PER_STACK,
  RAGING_BOUNCE_MULT, GUIDING_WINDS_MULT_PER_STACK,
  GUIDING_WINDS_WA_MULT_PER_STACK, CIVILIAN_MULT_PER_STACK,
  VAMPIRE_DIVISOR, VAMPIRE_SUNLIGHT_HEAL_MULT,
} from '../lib/constants'
import type { BoostAttackType, ProcScalingType } from '../lib/types'

export function calcMinionAbsorptionPotency(summonBoostPct: number, stacks: number): number {
  return Math.round(MINION_ABSORPTION_MULT * (summonBoostPct / 100) * stacks * 10000) / 10000
}

export function calcFrenzyPct(ragePotency: number): number {
  return FRENZY_BASE + FRENZY_RAGE_MULT * ragePotency
}

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
  hasFireDmg?: boolean
  burnPotency: number
  hasBurn: boolean
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

  // How this boost scales with proc coefficient
  procScaling?: ProcScalingType
  // Whether this boost has a user-facing toggle to enable/disable it
  hasToggle?: boolean
  // Base chance (0..1) before proc-coefficient scaling, for boosts with chance-based triggers
  baseProcChance?: number
}

export const BOOST_DEFS: BoostDef[] = [
  // Simple dmg boosts
  {sourceName: 'Blood Thirsty', multiplierPerPerk: BLOOD_THIRSTY_MULT_PER_STACK, type: 'dmg', condition: 'Hitting an opponent with your Bleed', needsProcCoeff: true},
  {sourceName: 'Venom Spitter', multiplierPerPerk: VENOM_SPITTER_MULT_PER_STACK, type: 'dmg', condition: 'vs Poisoned opponents'},
  {sourceName:'Perfection',multiplierPerPerk: PERFECTION_MULT_PER_STACK, type: 'dmg', condition: 'at max potency',},
  {sourceName:'Stealth',multiplierPerPerk: STEALTH_MULT_PER_STACK, type: 'dmg', condition: "gain a Damage Boost against enemies that aren't targeting you",},
  { sourceName: 'Golden Crits', multiplierPerPerk: GOLDEN_CRITS_MULT_PER_STACK, type: 'dmg', condition: '40% chance on crit', procScaling: 'positiveOnly', hasToggle: true, baseProcChance: GOLDEN_CRITS_BASE_PROC_CHANCE },
  { sourceName: 'Royal Parry', multiplierPerPerk: ROYAL_PARRY_MULT_PER_STACK, type: 'dmg', condition: 'on the hit that activated the Critical Boost status per 1 of this perk.' },
  { sourceName: 'Spell Piercer', multiplierPerPerk: SPELL_PIERCER_MULT_PER_STACK, type: 'dmg', condition: 'Increase damage dealt by weapon arts and runes on crit by 20% per 1 of this perk' },
  { sourceName: 'Scourge', multiplierPerPerk: SCOURGE_MULT_PER_STACK, condition: 'Gain a chance for any hit to count as a Guardbreak', type: 'dmg', needsProcCoeff: true },
  { sourceName: 'Sharpshooter', multiplierPerPerk: SHARPSHOOTER_MULT_PER_STACK, type: 'dmg', condition: 'Hitting from range (hits with proc coefficient)', needsProcCoeff: true },
  { sourceName: 'Venom Eater', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Venom Eater'] ?? 0; if (a <= 0) return null; return { multiplier: 1 + VENOM_EATER_DMG_MULT_PER_STACK * a, condition: `+10% dmg/stack on Crit hit vs Poisoned target` } }, needsProcCoeff: true },
  { sourceName: 'Ferocity', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Ferocity'] ?? 0; if (a <= 0 || ctx.tenacity <= 0) return null; const pct = ctx.tenacity * FEROCITY_TENACITY_MULT * a; return { multiplier: 1 + pct / 100, condition: `${Math.round(ctx.tenacity * 100) / 100} tenacity × ${a} Ferocity = +${pct.toFixed(2)}%` } } },
  { sourceName: 'Spirit Winds', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Spirit Winds'] ?? 0; if (a <= 0 || ctx.tailwindPotency <= 0) return null; const pct = (SPIRIT_WINDS_TAILWIND_MULT * ctx.tailwindPotency + SPIRIT_WINDS_PER_STACK * a) * 100; return { multiplier: 1 + pct / 100, condition: `${Math.round(ctx.tailwindPotency * 1000) / 1000} tw potency × ${a} SW = +${pct.toFixed(2)}%` } } },
  { sourceName: 'Valor', multiplierPerPerk: VALOR_MULT_PER_STACK, type: 'dmg', condition: 'Damage Boost vs Taunted enemies, per 1 of this perk' },
  { sourceName: 'Gorecast', multiplierPerPerk: GORECAST_MULT_PER_STACK, type: 'dmg', condition: 'Weapon Art damage vs bleeding opponents', appliesTo: ['wa'] },
  { sourceName: 'Guardian Spin', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Guardian Spin'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Spin') return null; return { multiplier: 1 + GUARDIAN_SPIN_BASE + GUARDIAN_SPIN_MULT_PER_STACK * a, condition: 'for Spin weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Wild Bolt', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Wild Bolt'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Laser') return null; return { multiplier: 1 + WILD_BOLT_MULT_PER_STACK * a, condition: 'for Laser weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Weighty Slam', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Weighty Slam'] ?? 0; if (a <= 0 || ctx.selectedWeaponArt !== 'Slam') return null; return { multiplier: 1 + WEIGHTY_SLAM_MULT_PER_STACK * a, condition: 'for Slam weapon art' } }, appliesTo: ['wa'] },
  { sourceName: 'Undead Might', multiplierPerPerk: UNDEAD_MIGHT_MULT_PER_STACK, type: 'dmg', condition: 'Weapon Art & Rune Damage Boost', appliesTo: ['wa', 'rune'] },
  { sourceName: 'Highlander', multiplierPerPerk: HIGHLANDER_MULT_PER_STACK, type: 'dmg', condition: 'Weapon Art & Rune Damage Boost', appliesTo: ['wa', 'rune'] },
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
  { sourceName: 'Rider', type: 'dmg', calcFn: (ctx) => { const a = ctx.perks['Rider'] ?? 0; if (a <= 0 || !ctx.mountActive) return null; return { multiplier: 1 + RIDER_MULT_PER_STACK * a, condition: 'While mounted · +0.1s stun resist/stack' } } },
  {
    sourceName: 'Quickdraw',
    type: 'dmg',
    calcFn: (ctx) => {
      if (ctx.quickdrawPotency > 0) {
        return {
          multiplier: roundMultiplier(1 + ctx.quickdrawPotency * QUICKDRAW_MULT),
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
          multiplier: roundMultiplier(1 + ctx.jumpBoost * SPRING_POWERED_MULT * stacks),
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
        return { multiplier: THIEF_TRAINING_BEHIND_MULT, condition: 'attacking from behind' }
      }
      return null
    },
  },
  {
    sourceName: 'Thief Training (would-crit bonus)',
    type: 'dmg',
    calcFn: (ctx) => {
      if ((ctx.perks['Thief Training'] ?? 0) > 0) {
        return { multiplier: THIEF_TRAINING_WOULD_CRIT_MULT, condition: 'if attack would have crit without perk' }
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
          multiplier: roundMultiplier(1 + VASSALS_CROAK_MULT_PER_STACK * clampedCount * stacks),
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
        const frenzyPct = calcFrenzyPct(ctx.ragePotency) * stacks
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
        const bouncePct = RAGING_BOUNCE_MULT * ctx.bouncePotency * stacks
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
        return { multiplier: 1 + GUIDING_WINDS_MULT_PER_STACK * stacks, condition: 'Moving (at max)' }
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
        return { multiplier: 1 + GUIDING_WINDS_WA_MULT_PER_STACK * stacks, condition: 'Moving (at max)' }
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
        return { multiplier: 1 + CIVILIAN_MULT_PER_STACK * stacks, condition: 'Weapon unequipped 3s+' }
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
        const fullPct = stacks / VAMPIRE_DIVISOR
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
        return { multiplier: VAMPIRE_SUNLIGHT_HEAL_MULT, condition: 'Healing received halved in sunlight' }
      }
      return null
    },
  },

  {
    sourceName: 'Smoldering',
    type: 'dmg',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Smoldering'] ?? 0
      if (stacks > 0 && ctx.hasBurn) {
        return {
          multiplier: 1 + 0.20 * stacks,
          condition: `Burning self · +${20 * stacks}% dmg`,
        }
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
      const potency = calcMinionAbsorptionPotency(sb, stacks)
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
  { sourceName: 'Emotional', multiplierPerPerk: EMOTIONAL_MULT_PER_STACK, type: 'heal', condition: 'when you have both buffs and debuffs' },
  { sourceName: 'Heal Boost', multiplierPerPerk: HEAL_BOOST_MULT_PER_STACK, type: 'heal', condition: 'Increase healing by 10% per 1 of this perk' },
  
  // Complex heal boosts
  {
    sourceName: 'Oceans Rage',
    type: 'heal',
    calcFn: (ctx) => {
      const stacks = ctx.perks['Oceans Rage'] ?? 0
      if (stacks > 0) {
        return {
          multiplier: roundMultiplier(1 + stacks * OCEANS_RAGE_MULT_PER_STACK),
          condition: `${stacks} stack × 10% outgoing heal`,
        }
      }
      return null
    },
  },
]

export const BOOST_DEF_MAP = new Map(BOOST_DEFS.map(d => [d.sourceName, d]))