// ── Core Types ─────────────────────────────────────────────────────────────
// Central type definitions for the entire codebase: stats, equipment, build state, damage types.
// Import from here rather than defining locally — keeps types consistent across files.

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
  waArmorPenetration?: number
  globalArmorPenetration?: number
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

export const UPGRADE_MAX = 5
const UPGRADE_MULTIPLIER = 1.1

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
  darkeningHexActivations: number
  helmet: string
  chestplate: string
  leggings: string
  ring: string
  rune: string
  footDiveHit: boolean
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
  upgradeInfusionHelmet: number
  upgradeInfusionChestplate: number
  upgradeInfusionLeggings: number
  upgradeInfusionRing: number
  selectedWeaponArt: string
  draconicColor: string
  draconicRuneInfusion: string
  emotionalState: 'buffs' | 'debuffs' | 'both'
  emotionalDisabled: boolean
  propellingFunElement: 'air' | 'fire'
  propellingFunBuffMode: 'air' | 'fire' | 'both'
  level: number
  hpFill: number
  enemyHpFill: number
  inventoryFill: number
  summonCount: number
  vassalsCroakSummons?: number
  lastCroakStacks?: number
  buffsConsumed: number
  sporelingsSummoned: number
  enchantedSwordType: number
  bastionBallistaArrows: number
  ichorSparkCharge: number
  divineCrashDistance: number
  channeledDepthsTime: number
  channeledDepthsTarget: string
  channeledDepthsHit: number
  voidContractTarget: string
  voidContractHit: number
  inDarkness: boolean
  cdrToggles: Record<string, boolean>
  // Potion slots
  potion1: string
  potion2: string
  // Toggle state (ON/OFF for buffs, boosts, effects)
  disabledBoosts: string[]
  disabledEffects: string[]
  disabledBuffKeys: string[]
  disabledPerkEntries: string[]
  disabledHealBoosts: string[]
  rageDisabled: boolean
  glyphConduitDisabled: boolean
  ponderReinforceDisabled: boolean
  extinguishDisabled: boolean
  lightningCloakState: 'off' | 'third' | 'twoThirds'
  stormRendState: 'off' | 'third' | 'twoThirds'
  draconicInfusionDisabled: boolean
  disableCurseRip: boolean
  disableReaper: boolean
  disableWeaponBoost: boolean
  mycoticBloomDotDisabled: boolean
  showCritValues: boolean
  enemiesHit: number
  weaponCharge: number
  retaliateCharge: number
  perfectionStacks: number
}

export type ProcCoefficient =
  | { type: 'noProc' }
  | { type: 'hasCoeff'; value: number }

export function getProcCoeffValue(pc: ProcCoefficient | undefined): number {
  if (!pc) return 1
  if (pc.type === 'noProc') return 0
  return pc.value
}

export function canProc(pc: ProcCoefficient | undefined): boolean {
  return getProcCoeffValue(pc) > 0
}

export type ProcScalingType = 'normal' | 'ignore' | 'positiveOnly'

export type BoostAttackType = 'm1' | 'm2' | 'wa' | 'rune' | 'perk' | 'finisher'

export interface BoostEntry {
  sourceName: string
  rawMultiplier: number
  condition?: string
  type: 'dmg' | 'heal'
  appliesTo?: BoostAttackType[]
  needsProcCoeff?: boolean
  procScaling?: ProcScalingType
  hasToggle?: boolean
}

export interface BoostResult {
  dmgEntries: BoostEntry[]
  dmgFinalMultiplier: number
}

export { DMG_TYPE_COLORS } from './constants/damage-types'

const ONE_HANDED_TYPES = new Set([
  'Dagger','1-Handed Sword','Unbalanced Sword','Mallet','Rapier',
  'Dual Swords','Dual Wielding Daggers','Dual Unbalanced Swords','Dual Mallets','Dual Kamas',
  'Shield','Lance','Chainsaw',
]);

export { DMG_TYPE_PRIORITY } from './constants/damage-types'

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
  noM1?: boolean;
  noM2?: boolean;
  m2: WeaponHit[];
  m2Charge?: {
    enabled: boolean;
    label: string;
    max: number;
    formula: (base: number, charge: number) => number;
  };
}