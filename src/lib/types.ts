const STAT_CONFIG = {
  dexterityBoost: "percent", physicalBoost: "percent", airBoost: "percent",
  earthBoost: "percent", fireBoost: "percent", waterBoost: "percent",
  hexBoost: "percent", holyBoost: "percent", magicBoost: "percent",
  summonBoost: "percent", speedBoost: "percent", attackSpeed: "percent",
  warding: "percent", physicalDefense: "percent", magicDefense: "percent",
  airDefense: "percent", earthDefense: "percent", waterDefense: "percent",
  fireDefense: "percent", hexDefense: "percent", holyDefense: "percent",
  protection: "flat", tenacity: "flat", armorPenetration: "flat", jumpBoost: "flat",
  heatResistance: "percent", coldResistance: "percent",
} as const

export type StatKey = keyof typeof STAT_CONFIG
export type StatMap = Partial<Record<StatKey, number>>

export const PERCENT_STATS = new Set(
  Object.entries(STAT_CONFIG).filter(([,v]) => v === "percent").map(([k]) => k)
)

export const STAT_KEYS = Object.keys(STAT_CONFIG) as StatKey[]

export interface Race {
  name: string
  passive: string
  statModifiers?: StatMap
  cooldownModifiers?: Record<string, number>
}

export interface GuildPerk { name: string; amount: number }
export interface GuildRank { rank: number; stats?: StatMap; perks?: GuildPerk[] }
export interface Guild { name: string; ranks: GuildRank[] }

export interface ArmorStats { [key: string]: number | undefined }
export interface ArmorPart {
  type: "Helmet" | "Chestplate" | "Leggings"
  description: string
  upgrade: number
  stats: ArmorStats
  perkName: string
  perkAmount: number
}
export interface Armor { name: string; parts: ArmorPart[]; tags?: string[] }

export interface Ring {
  name: string; description: string; upgrade: number
  stats: StatMap; perkName: string; perkAmount?: number
}

export interface Rune {
  name: string; description: string; upgrade: number
  stats: StatMap; cooldown: number; perkName?: string; perkAmount?: number
}

export interface StatModifier { type: "multiplier" | "addition"; value: number }
export interface EnchantmentEffect { name: string; value: number }
export interface Enchantment {
  name: string
  category: string
  stacking: "multi" | "exclusive"
  description?: string
  stats: Record<string, StatModifier | StatModifier[]>
  effects: EnchantmentEffect[]
  additionalNotes?: string
}

export interface Perk { name: string; description: string; tags: string[] }

export type EnchantSlot = "helmet" | "chestplate" | "leggings" | "ring" | "rune"

// ── Helpers Tối ưu cho Browser ───────────────────────────────────────────────────

export const UPGRADE_MAX = 5
const UPGRADE_MULTIPLIER = 1.1

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

/** Áp dụng cấp độ nâng cấp: tối ưu vòng lặp tĩnh tránh sinh rác bộ nhớ */
export function applyUpgrade(stats: StatMap, level: number): StatMap {
  if (level <= 0) return { ...stats }
  const mult = 1 + level * (UPGRADE_MULTIPLIER - 1)
  const result: StatMap = {}
  
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    const v = stats[k]
    if (v == null) continue
    if (v > 0) result[k] = v * mult
    else if (v < 0) result[k] = v / mult
    else result[k] = 0
  }
  return result
}

// ── Weapon Types (Blade/Handle) ───────────────────────────────────────────────

export type BladeType = "Small Blade" | "Medium Blade" | "Heavy Blade" | "Hammer Head"
export type HandleType = "Medium Handle" | "Long Handle" | "Pole"
export type StatPrefix = 'physical' | 'magic' | 'fire' | 'water' | 'air' | 'hex' | 'holy' | 'earth'| 'summon' | 'dexterity'
export type ScalingKey = `${StatPrefix}Scaling`

export type WeaponBlade = {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  bladeType: BladeType  
  stats: StatMap
  attackSpeed?: number
  perks?: Array<{ name: string; amount: number }>
  perkName?: string
  perkAmount?: number
} & Partial<Record<ScalingKey, number>>

export type WeaponHandle = {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  handleType: HandleType
  stats: StatMap
  attackSpeed?: number
  perks?: Array<{ name: string; amount: number }>
  perkName?: string
  perkAmount?: number
} & Partial<Record<ScalingKey, number>>

// ── Monk Weapon Types (Glove/Essence) ─────────────────────────────────────────

export type GloveType = "Gloves" | "Shield"
export type EssenceType = "Monk Essence"

export interface MonkGlove {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  gloveType: GloveType
  stats: StatMap
  attackSpeed?: number
  trueType?: number
  physicalType?: number
  magicType?: number
  fireType?: number
  waterType?: number
  earthType?: number
  airType?: number
  hexType?: number
  holyType?: number
  summonType?: number
  dexterityScaling?: number
  physicalScaling?: number
  magicScaling?: number
  fireScaling?: number
  waterScaling?: number
  earthScaling?: number
  airScaling?: number
  hexScaling?: number
  holyScaling?: number
  summonScaling?: number
  perkName?: string
  perkAmount?: number
}

export interface MonkEssence {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  essenceType: EssenceType
  stats: StatMap
  attackSpeed?: number
  dexterityScaling?: number
  physicalScaling?: number
  magicScaling?: number
  fireScaling?: number
  waterScaling?: number
  earthScaling?: number
  airScaling?: number
  hexScaling?: number
  holyScaling?: number
  summonScaling?: number
  perkName?: string
  perkAmount?: number
}

// ── Build State ───────────────────────────────────────────────────────────────

export interface BuildState {
  race: string
  guild: string
  guildRank: number
  storedCorruptionAmount: number
  helmet: string
  chestplate: string
  leggings: string
  ring: string
  rune: string
  enchantments: Record<EnchantSlot, [string, string, string]>
  infusionHelmet: string
  infusionChestplate: string
  infusionLeggings: string
  infusionRing: string
  weaponBlade: string
  weaponHandle: string
  monkGlove: string
  monkEssence: string
  shrineActive: boolean
  upgradeHelmet: number
  upgradeChestplate: number
  upgradeLeggings: number
  upgradeRing: number
  upgradeRune: number
  selectedWeaponArt: string
  draconicColor: string
  draconicRuneInfusion: string
  emotionalState: 'buffs' | 'debuffs' | 'both'
  level: number
  hpFill: number
  summonCount: number
  buffsConsumed: number
  sporelingsSummoned: number
  inDarkness: boolean
  cdrToggles: Record<string, boolean>
}

export type BoostAttackType = 'm1' | 'm2' | 'wa' | 'rune' | 'perk'

export interface BoostEntry {
  sourceName: string
  rawMultiplier: number
  condition?: string
  type: 'dmg' | 'heal'
  appliesTo?: BoostAttackType[]
}

export interface BoostResult {
  dmgEntries: BoostEntry[]
  healEntries: BoostEntry[]
  dmgFinalMultiplier: number
  healFinalMultiplier: number
}

export const DMG_TYPE_COLORS: Record<string, string> = {
  physical: '#fb923c', magic: '#818cf8', fire: '#f97316',
  water: '#38bdf8', earth: '#a3e635', air: '#AAFFDB',
  hex: '#e879f9', holy: '#facc15', true: '#ffffff', summon: '#c084fc',
};

const ONE_HANDED_TYPES = new Set([
  'Dagger','1-Handed Sword','Unbalanced Sword','Mallet','Rapier',
  'Dual Swords','Dual Wielding Daggers','Dual Unbalanced Swords','Dual Mallets','Dual Kamas',
  'Shield','Lance','Chainsaw',
]);

export const DMG_TYPE_PRIORITY = ['hex','water','air','true','earth','magic','fire','physical','holy'];

export const SCALING_TO_BOOST: Record<string, string> = {
  physical: 'physicalBoost', magic: 'magicBoost', fire: 'fireBoost',
  water: 'waterBoost', earth: 'earthBoost', air: 'airBoost',
  hex: 'hexBoost', holy: 'holyBoost', dexterity: 'dexterityBoost', summon: 'summonBoost',
  protection: 'protection',
};

export interface WeaponHitObject {
  n: number;
  count: number;
}

export type WeaponHit = number | WeaponHitObject;

export interface WeaponBaseDmg {
  type: string;
  m1: WeaponHit[] | null;
  m1Finisher?: boolean;
  m2: WeaponHit[];
  m2Charge?: {
    enabled: boolean;
    label: string;
    max: number;
    formula: (base: number, charge: number) => number;
  };
}