export const UI_COLORS = {
  // Damage type colors
  physical: '#e8e4da',
  magic: '#a78bfa',
  fire: '#fb923c',
  water: '#38bdf8',
  earth: '#4ade80',
  air: '#e5e7eb',
  hex: '#a855f7',
  holy: '#facc15',
  true: '#f87171',

  // Tag group colors
  combat: '#fb923c',
  support: '#4ade80',
  status: '#f87171',
  weaponArtRune: '#a78bfa',
  special: '#facc15',

  // Source type colors
  rune: '#a78bfa',
  perk: '#fb923c',
  weaponArt: '#4ade80',
  race: '#facc15',
  cantrip: '#38bdf8',

  // Enchant rarity colors
  refined: '#e5e7eb',
  strengthened: '#4ade80',
  dexterous: '#38bdf8',
  burning: '#fb923c',
  wet: '#3b82f6',
  earthen: '#22c55e',
  magical: '#a78bfa',

  // Negative stat colors
  statusNegative: '#fca5a5',
  supportNegative: '#86efac',
} as const

export const SOURCE_LABELS = {
  rune: 'Rune',
  perk: 'Perk',
  weaponArt: 'W. Art',
  race: 'Race',
  cantrip: 'cantrip',
} as const

const STAT_LABELS = {
  physicalDefense: 'Phys Def',
  magicDefense: 'Mag Def',
  fireDefense: 'Fire Def',
  waterDefense: 'Water Def',
  earthDefense: 'Earth Def',
  airDefense: 'Air Def',
  hexDefense: 'Hex Def',
  holyDefense: 'Holy Def',
  speed: 'Speed',
  attackSpeed: 'Atk Speed',
  physicalBoost: 'Phys',
  magicBoost: 'Mag',
  fireBoost: 'Fire',
  waterBoost: 'Water',
  earthBoost: 'Earth',
  airBoost: 'Air',
  hexBoost: 'Hex',
  holyBoost: 'Holy',
  dexterityBoost: 'Dex',
  summonBoost: 'Summon',
} as const

const TAG_LABELS = {
  combat: 'Combat',
  support: 'Support',
  status: 'Status',
  weaponArtRune: 'Weapon Art/Rune',
  special: 'Special',
} as const
