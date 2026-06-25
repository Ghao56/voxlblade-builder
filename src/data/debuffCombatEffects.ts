const ALL_DEF_TYPES = ['physical', 'magic', 'fire', 'water', 'earth', 'air', 'hex', 'holy'] as const

export interface DebuffCombatEffect {
  descFn: (potency: number) => string
  damageMult?: (potency: number) => number
  defReduction?: (potency: number) => Partial<Record<string, number>>
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
      return ALL_DEF_TYPES.reduce((acc, t) => ({ ...acc, [t]: amt }), {} as Partial<Record<string, number>>)
    },
  },
}