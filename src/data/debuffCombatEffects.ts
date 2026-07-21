import { DEBUFF_STICKY_DMG_MULT, DEBUFF_DESPAIR_DISPLAY_DIVISOR, DEBUFF_DESPAIR_DISPLAY_MULT, DEBUFF_DESPAIR_DMG_COEFF } from '../lib/constants/debuff-effects'
import { HYPNOTIST_MAGIC_ARMOR_PER_POTENCY } from '../lib/constants/perks'

const ALL_DEF_STAT_KEYS = ['physicalDefense', 'magicDefense', 'fireDefense', 'waterDefense','earthDefense', 'airDefense', 'hexDefense', 'holyDefense',] as const

  export interface DebuffCombatEffect {
    descFn: (potency: number, perks?: Record<string, number>) => string
    damageMult?: (potency: number) => number
   defReduction?: (potency: number) => Partial<Record<typeof ALL_DEF_STAT_KEYS[number], number>>
   typeDamageMult?: (potency: number, perks?: Record<string, number>) => Record<string, number>
  }

export const DEBUFF_COMBAT_EFFECTS: Record<string, DebuffCombatEffect> = {
  Weakness: {
    descFn: (p: number) => {
      const x = Math.round((1 - 1 / (1 + p)) * 10000) / 100
      return `Deal ${x}% less dmg`
    },
    damageMult: (p: number) => 1 / (1 + p),
  },

  Shatter: {
    descFn: (p: number) => `Lose ${(p * 100).toFixed(2)} Armor`,
    defReduction: (p: number) => {
      const amt = p * 100
      return {
        physicalDefense: amt,
        magicDefense: amt,
      }
    },
  },
  Sticky: {
    descFn: (p: number, perks?: Record<string, number>) => {
      const slowPct = Math.round(p * 10000) / 100
      const hasMelting = (perks?.['Melting Slime'] ?? 0) > 0
      if (hasMelting) {
        return `Move ${slowPct}% slower, deals fire and poise damage and take 20% more magic, fire and earth damage.`
      }
      return `Move ${slowPct}% slower · +20% Magic Dmg Taken`
    },
    typeDamageMult: (_p: number, perks?: Record<string, number>) => {
      const base = { magic: DEBUFF_STICKY_DMG_MULT }
      const hasMelting = (perks?.['Melting Slime'] ?? 0) > 0
      if (hasMelting) {
        return { ...base, fire: DEBUFF_STICKY_DMG_MULT, earth: DEBUFF_STICKY_DMG_MULT }
      }
      return base
    },
  },
  'Sticky (Melting Slime)': {
    descFn: (p: number) => {
      const slowPct = Math.round(p * 10000) / 100
      return `Move ${slowPct}% slower and take 20% more magic, fire and earth damage.`
    },
    typeDamageMult: () => ({ magic: DEBUFF_STICKY_DMG_MULT, fire: DEBUFF_STICKY_DMG_MULT, earth: DEBUFF_STICKY_DMG_MULT }),
  },
  'Sticky (Sickness)': {
    descFn: (p: number) => {
      const slowPct = Math.round(p * 10000) / 100
      return `Move ${slowPct}% slower · +20% Hex, Magic & Earth Dmg Taken [Sickness]`
    },
    typeDamageMult: () => ({ magic: DEBUFF_STICKY_DMG_MULT, hex: DEBUFF_STICKY_DMG_MULT, earth: DEBUFF_STICKY_DMG_MULT }),
  },
  'Sticky (Hex Web)': {
    descFn: (p: number) => {
      const slowPct = Math.round(p * 10000) / 100
      return `Move ${slowPct}% slower · +20% Hex & Magic Dmg Taken [Hex Web]`
    },
    typeDamageMult: () => ({ magic: DEBUFF_STICKY_DMG_MULT, hex: DEBUFF_STICKY_DMG_MULT }),
  },
  'Electrical Rend': {
    descFn: (p: number) => `Lose ${(p * 100).toFixed(2)} Armor`,
    defReduction: (p: number) => {
      const amt = p * 100
      return {
        physicalDefense: amt,
        magicDefense: amt,
      }
    },
  },
  Despair: {
    descFn: (p: number) => {
      const pct = Math.round((p / DEBUFF_DESPAIR_DISPLAY_DIVISOR) * DEBUFF_DESPAIR_DISPLAY_MULT * 100) / 100
      return `+${pct}% all damage dealt`
    },
    damageMult: (p: number) => 1 + (p / DEBUFF_DESPAIR_DISPLAY_DIVISOR) * DEBUFF_DESPAIR_DMG_COEFF,
  },
  Frostbite: {
    descFn: () => `+10% Water & Air Dmg Taken`,
    typeDamageMult: () => ({ water: 1.1, air: 1.1 }),
  },
  Hypnotized: {
    descFn: (p: number) => `Lose ${(p * HYPNOTIST_MAGIC_ARMOR_PER_POTENCY).toFixed(1)} Magic Armor`,
    defReduction: (p: number) => ({
      magicDefense: p * HYPNOTIST_MAGIC_ARMOR_PER_POTENCY,
    }),
  },
}
