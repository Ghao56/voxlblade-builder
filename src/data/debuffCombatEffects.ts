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
      const base = { magic: 1.2 }
      const hasMelting = (perks?.['Melting Slime'] ?? 0) > 0
      if (hasMelting) {
        return { ...base, fire: 1.2, earth: 1.2 }
      }
      return base
    },
  },
  'Sticky (Melting Slime)': {
    descFn: (p: number) => {
      const slowPct = Math.round(p * 10000) / 100
      return `Move ${slowPct}% slower and take 20% more magic, fire and earth damage.`
    },
    typeDamageMult: () => ({ magic: 1.2, fire: 1.2, earth: 1.2 }),
  },
}
