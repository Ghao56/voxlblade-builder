export const STAT_CONFIG = {
  dexterityBoost: "percent", physicalBoost: "percent", airBoost: "percent",
  earthBoost: "percent", fireBoost: "percent", waterBoost: "percent",
  hexBoost: "percent", holyBoost: "percent", magicBoost: "percent",
  summonBoost: "percent", speedBoost: "percent", attackSpeed: "percent",
  warding: "percent", physicalDefense: "percent", magicDefense: "percent",
  airDefense: "percent", earthDefense: "percent", waterDefense: "percent",
  fireDefense: "percent", hexDefense: "percent", holyDefense: "percent",
  protection: "flat", tenacity: "flat", armorPenetration: "flat", jumpBoost: "flat"
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
}
