export const STAT_CONFIG = {
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
}
export interface Armor { name: string; parts: ArmorPart[]; tags?: string[] }

export interface Ring {
  name: string; description: string; upgrade: number
  stats: StatMap; perkName: string; perkStacks?: number
}

export interface Rune {
  name: string; description: string; upgrade: number
  stats: StatMap; cooldown: number; perkName?: string; perkStacks?: number
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

// ── Weapon Types (Blade/Handle) ───────────────────────────────────────────────

export type BladeType = "Small Blade" | "Medium Blade" | "Heavy Blade" | "Hammer Head"
export type HandleType = "Medium Handle" | "Long Handle" | "Pole"

export interface WeaponBlade {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  bladeType: BladeType
  description: string
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
  perkStacks?: number
}

export interface WeaponHandle {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  handleType: HandleType
  description: string
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
  perkStacks?: number
}

// ── Monk Weapon Types (Glove/Essence) ─────────────────────────────────────────

export type GloveType = "Gloves" | "Shield"
export type EssenceType = "Monk Essence"

export interface MonkGlove {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  gloveType: GloveType
  description: string
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
  perkStacks?: number
}

export interface MonkEssence {
  name: string
  tier: 1 | 2 | 3 | 4 | 5
  essenceType: EssenceType
  description: string
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
  perkStacks?: number
}

// ── Build State ───────────────────────────────────────────────────────────────

export interface BuildState {
  race: string
  guild: string
  guildRank: number
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
  // Standard weapon
  weaponBlade: string
  weaponHandle: string
  // Monk weapon
  monkGlove: string
  monkEssence: string
  shrineActive: boolean
}