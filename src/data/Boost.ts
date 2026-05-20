export interface BoostDef {
  sourceName: string
  multiplierPerPerk: number
  condition?: string
  type: 'dmg' | 'heal'
  isLevel?: boolean  // special flag: computed from level, not perk amount
}

export const BOOST_DEFS: BoostDef[] = [
  // dmg boost
  {sourceName: 'Blood Thirsty', multiplierPerPerk: 0.20, type: 'dmg', condition: 'Hitting an opponent with your Bleed',},
  {sourceName:'Perfection',multiplierPerPerk: 0.10, type: 'dmg', condition: 'at max potency',},
  

  // level damage (handled specially in calcBoosts — perkAmount unused)
  { sourceName: 'Level Damage', multiplierPerPerk: 0, type: 'dmg', isLevel: true },

  // heal
  { sourceName: 'Emotional', multiplierPerPerk: 0.20, type: 'heal', condition: 'when you have both buffs and debuffs' },
]

export const BOOST_DEF_MAP = new Map(BOOST_DEFS.map(d => [d.sourceName, d]))