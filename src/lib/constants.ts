// ──────────────────────────────────────────────
// Damage Types – shared definitions
// ──────────────────────────────────────────────
const DMG_TYPE_IDS = [
  'physical', 'magic', 'fire', 'water', 'earth', 'air', 'hex', 'holy', 'true', 'summon', 'heal',
] as const
type DmgTypeId = (typeof DMG_TYPE_IDS)[number]

export const DMG_TYPE_META: Record<string, { label: string; color: string }> = {
  physical: { label: 'Physical', color: '#fb923c' },
  magic:    { label: 'Magic',    color: '#818cf8' },
  fire:     { label: 'Fire',     color: '#f97316' },
  water:    { label: 'Water',    color: '#38bdf8' },
  earth:    { label: 'Earth',    color: '#a3e635' },
  air:      { label: 'Air',      color: '#AAFFDB' },
  hex:      { label: 'Hex',      color: '#e879f9' },
  holy:     { label: 'Holy',     color: '#facc15' },
  true:     { label: 'True',     color: '#f87171' },
  summon:   { label: 'Summon',   color: '#c084fc' },
  heal:     { label: 'Heal',     color: '#4ade80' },
}

/** Defense-tracked damage types (everything except true/summon/heal) */
export const DEF_TRACKED_TYPES = ['physical','magic','fire','water','earth','air','hex','holy'] as const

/**
 * Defense inheritance: when defending against a sub-type, also use the parent's defense.
 * air/earth → physical, fire/water/hex/holy → magic
 */
export const DEF_INHERITANCE: Record<string, string> = {
  air:   'physical',
  earth: 'physical',
  fire:  'water',
  water:  'magic',
  hex:   'magic',
  holy:  'magic',
}

/** Types that are "physical" derived subtypes */
export const PHYSICAL_INHERITED_TYPES = new Set(['air', 'earth'])
/** Types that are "magic" derived subtypes */
export const MAGIC_INHERITED_TYPES = new Set(['fire', 'water', 'hex', 'holy'])

/** Default fallback color for unknown damage types */
export const FALLBACK_DMG_COLOR = '#e8e4da'

// ──────────────────────────────────────────────
// Group / Attack type labels
// ──────────────────────────────────────────────
const GROUP_LABELS: Record<string, string> = {
  M1:   'M1',
  M2:   'M2',
  WA:   'WA',
  Rune: 'Rune',
  Perk: 'Perk',
}
const GROUP_ORDER = ['M1', 'M2', 'WA', 'Rune', 'Perk'] as const

// ──────────────────────────────────────────────
// localStorage keys
// ──────────────────────────────────────────────
export const STORAGE_KEY_DEFENSES = 'voxlbuilder_defenses_v1'
const STORAGE_KEY_SAVES    = 'voxlbuilder_saves'

// ──────────────────────────────────────────────
// Misc magic numbers / thresholds
// ──────────────────────────────────────────────
/** Armor pen branch threshold */
export const ARMOR_PEN_BRANCH_THRESHOLD = 0.2

/** Minimum cooldown floor */
export const CD_MINIMUM = 1

/** Venom Eater heal per stack */
export const VENOM_EATER_HEAL_PER_STACK = 0.1

/** Curse Rip: 1/60 of pre-mitigation damage */
export const CURSE_RIP_DIVISOR = 60

/** Lightning Cloak / Storm Rend: 1/3 of hit damage */
const LIGHTNING_CLOAK_FRACTION = 1 / 3

/** Base crit damage multiplier percentage */
export const BASE_CRIT_DMG_PCT = 100

// ──────────────────────────────────────────────
// Perk-related numeric constants
// ──────────────────────────────────────────────
/** Luminescent Fervor: 5% × perk amount */
const LUMINESCENT_PCT_PER_STACK = 0.05

/** Spirit Winds: 10% × perk amount */
const SPIRIT_WINDS_PCT_PER_STACK = 0.10

/** Dark Magic: 20% × perk amount */
const DARK_MAGIC_PCT_PER_STACK = 0.20

/** Wind Walker: +10 armor pen per stack */
const WIND_WALKER_PEN_PER_STACK = 10

/** Ork race: +0.1 tenacity per active buff */
const ORK_TENACITY_PER_BUFF = 0.1

/** Reaper: +5% damage per debuff per stack */
const REAPER_PCT_PER_DEBUFF_PER_STACK = 0.05

/** Extinguish: +50% per stack */
const EXTINGUISH_MULT_PER_STACK = 0.5

/** Explosive Charge: 100% of WA pre-boost damage */
const EXPLOSIVE_CHARGE_PCT = 1.0

/** Wild Bolt: -0.75 damage */
const WILD_BOLT_DMG_REDUCTION = 0.75

/** Minion Absorption: 20% × summonBoost/100 × stack */
const MINION_ABSORPTION_MULT = 0.2

/** Undead Might: self damage = 1/15 of per-hit */
const UNDEAD_MIGHT_SELF_DMG_FRACTION = 1 / 15

/** Frenzy: 5% + (1/6) × rage potency per stack */
const FRENZY_BASE = 0.05
const FRENZY_RAGE_MULT = 1 / 6

/** Critical Healing formula base */
const CRIT_HEALING_BASE = 120
const CRIT_HEALING_HOLY_BOOST_DIVISOR = 5
const CRIT_HEALING_PER_STACK = 16.5

/** Dragon State HP threshold formula */
const DRAGON_STATE_HP_BASE = 85
const DRAGON_STATE_HP_PER_STACK = 5

/** Ocean Song: (1 + 0.1 × stack) × (1 + cd / 30) */
const OCEAN_SONG_BASE = 1
const OCEAN_SONG_PER_STACK = 0.1
const OCEAN_SONG_CD_DIVISOR = 30

/** Water Pulse base interval */
const WATER_PULSE_BASE_INTERVAL = 8

/** Wave Rider base damage */
const WAVE_RIDER_M2_BASE = 40
const WAVE_RIDER_WA_BASE = 35

/** Springblast formula constants */
const SPRINGBLAST_BASE_HIT = 6
const SPRINGBLAST_PER_STACK_HIT = 2
const SPRINGBLAST_EXTRA_MULT = 0.1

/** Royal Finisher base damage */
const ROYAL_FINISHER_BASE = 3
const ROYAL_FINISHER_PER_STACK = 1

/** Dragon State base damage */
const DRAGON_STATE_BASE = 1.5
const DRAGON_STATE_PER_STACK = 1.5

/** Spore Burst base damage */
const SPORE_BURST_BASE = 1

/** Bastion Bless: +10% per stack */
const BASTION_BLESS_MULT = 0.1

/** Draconic Infusion: +5% potency per stack */
const DRACONIC_INFUSION_POT_MULT = 0.05
/** Draconic Infusion: +15% duration per stack */
const DRACONIC_INFUSION_DUR_MULT = 0.15

/** True Balance damage: holyBoost * tbAmt / 800 */
const TRUE_BALANCE_DMG_DIVISOR = 800
/** True Balance heal: hexBoost * tbAmt / 1500 */
const TRUE_BALANCE_HEAL_DIVISOR = 1500

/** Curse Rip damage boost formula: (10 * perk - 10 + 5 * debuffCount) / 100 */
const CURSE_RIP_DMG_BOOST_CONST = 10
const CURSE_RIP_DMG_BOOST_PER_DEBUFF = 5

/** Emotional: +10% per stack */
const EMOTIONAL_PCT_PER_STACK = 0.10

/** Toxin Transfer: +10% hex per stack */
const TOXIN_TRANSFER_PCT_PER_STACK = 0.10

/** Stone Weapon: +30% earth per stack */
const STONE_WEAPON_PCT_PER_STACK = 0.30

/** Void Rage: +10% hex per stack */
const VOID_RAGE_PCT_PER_STACK = 0.10

/** Channeled Weapon: +5% magic per stack */
const CHANNELED_WEAPON_PCT_PER_STACK = 0.05

/** Draconic Blood: +10% per stack */
const DRACONIC_BLOOD_PCT_PER_STACK = 0.10

/** Wind Walker bonus: +15% air per stack */
const WIND_WALKER_AIR_PCT_PER_STACK = 0.15

// ──────────────────────────────────────────────
// Wild Bolt elements
// ──────────────────────────────────────────────
const WILD_BOLT_ELEMENTS = ['fire', 'water', 'holy', 'hex', 'earth', 'air', 'magic'] as const

// (PERK_DMG_TYPE_BONUS_DEFS remains in DamageAnalyzer.svelte where
//  it already lives, because Draconic Blood getAmountPerStack needs
//  a runtime import that doesn't belong in a pure-constants file)

// ──────────────────────────────────────────────
// Self-damage group mapping
// ──────────────────────────────────────────────
const SELF_DAMAGE_APPLIES_TO_GROUP: Record<string, 'WA' | 'Rune'> = { wa: 'WA', rune: 'Rune' }

// ──────────────────────────────────────────────
// Handled buff names (those with dedicated UI controls)
// ──────────────────────────────────────────────
const HANDLED_BUFF_NAMES = new Set(['Rage', 'Glyph Conduit', 'Extinguish', 'Lightning Cloak', 'Storm Rend'])

// ──────────────────────────────────────────────
// Enchantment slot defaults
// ──────────────────────────────────────────────
const ENCHANT_SLOTS = ['helmet', 'chestplate', 'leggings', 'ring', 'rune'] as const
const EMPTY_ENCHANTS: Record<string, [string, string, string]> = {
  helmet:     ['', '', ''],
  chestplate: ['', '', ''],
  leggings:   ['', '', ''],
  ring:       ['', '', ''],
  rune:       ['', '', ''],
}

// ──────────────────────────────────────────────
// Build save defaults
// ──────────────────────────────────────────────
export const BUILD_STATE_DEFAULTS: Record<string, any> = {
  race: '', guild: '', guildRank: 1, helmet: '', chestplate: '', leggings: '',
  ring: '', rune: '', infusionHelmet: '', infusionChestplate: '', infusionLeggings: '',
  infusionRing: '', weaponBlade: '', weaponHandle: '', monkGlove: '', monkEssence: '',
  shrineActive: false, upgradeHelmet: 0, upgradeChestplate: 0, upgradeLeggings: 0,
  upgradeRing: 0, upgradeRune: 0, selectedWeaponArt: 'Lunge', draconicColor: '', draconicRuneInfusion: '', emotionalState: 'buffs',
}

// ──────────────────────────────────────────────
// Build save key map (short → long)
// ──────────────────────────────────────────────
export const SAVE_KEY_MAP: Record<string, string> = {
  race:'ra', guild:'gu', guildRank:'gr', helmet:'he', chestplate:'cp',
  leggings:'le', ring:'ri', rune:'ru', enchantments:'en',
  infusionHelmet:'ih', infusionChestplate:'ic', infusionLeggings:'il', infusionRing:'ir',
  weaponBlade:'wb', weaponHandle:'wh', monkGlove:'mg', monkEssence:'me',
  shrineActive:'sh', upgradeHelmet:'uh', upgradeChestplate:'uc',
  upgradeLeggings:'ul', upgradeRing:'ur', upgradeRune:'uu', selectedWeaponArt:'wa', draconicColor:'dc',
  draconicRuneInfusion:'dri', emotionalState: 'es',
}
export const SAVE_KEY_UNMAP = Object.fromEntries(Object.entries(SAVE_KEY_MAP).map(([k,v])=>[v,k]))

export const ENCH_MAP: Record<string, string> = {
  helmet:'he', chestplate:'cp', leggings:'le', ring:'ri', rune:'ru',
}
export const ENCH_UNMAP = Object.fromEntries(Object.entries(ENCH_MAP).map(([k,v])=>[v,k]))

// ──────────────────────────────────────────────
// Build save config
// ──────────────────────────────────────────────
export const MAX_BUILD_SLOTS = 5
export const CONFIRM_TIMEOUT_MS = 3000

// ──────────────────────────────────────────────
// Generic stat keys
// ──────────────────────────────────────────────
const STAT_ARMOR_PENETRATION = 'armorPenetration'
const STAT_SUMMON_BOOST = 'summonBoost'
const STAT_TENACITY = 'tenacity'
const STAT_WARDING = 'warding'
const STAT_PROTECTION = 'protection'
const STAT_HEX_BOOST = 'hexBoost'
const STAT_HOLY_BOOST = 'holyBoost'