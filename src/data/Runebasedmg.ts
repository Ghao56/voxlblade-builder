import type { BuildState } from '../lib/types';
import { DMG_TYPE_PRIORITY } from '../lib/constants/damage-types';
import { calculateHealBoost, type HealBoostContext } from './HealBoost';
import { calcMaxSummonCount } from './SummonData';
import { MAGIC_MISSILE_BASE_DMG, MAGIC_MISSILE_HITS, ANCIENT_CLERIC_BASE_DMG, ANCIENT_CLERIC_SLIDER_MAX, ANCIENT_CLERIC_SHIELD_BASE, ANCIENT_CLERIC_SHIELD_PER_VAL, BEENADE_BASE_DMG, BEENADE_MAX_POTENCY, BOOSTSHROOM_BASE_DMG, THUNDEROUS_CHARGE_BASE_DMG, SPORELING_TOSS_BASE_DMG, SPORELING_TOSS_HITS_BASE, SPORELING_TOSS_SLIDER_MAX, FOOT_DIVE_BASE_DMG, CACI_BASE_DMG, CACI_HITS, CACITROPS_BASE_DMG, CACITROPS_HITS, HEX_WEB_BASE_DMG, HEX_WEB_HITS, BRAINBLAST_BASE_DMG, BRAINBLAST_HITS, ROCKY_TAIL_BASE_DMG, ROCKY_TAIL_PROT_SCALE, ROCKY_TAIL_VS_BASE_RES, ROCKY_TAIL_VS_PER_LEVEL, ROCKY_TAIL_VS_DEFAULT_RES, ROCKY_TAIL_DIVISOR_COEFF, ROCKY_TAIL_DIVISOR_BASE, ROCKY_TAIL_HITS_MULT, ROCKY_TAIL_MIN_HITS, SLAYER_RAGE_HITS, SLAYER_RAGE_RAGE_RUNE_BASE_DMG, SLAYER_RAGE_RAGE_RUNE_DMG_PER_STACK, SLAYER_RAGE_ROAR_RUNE_BASE_DMG, SLAYER_RAGE_ROAR_RUNE_DMG_PER_STACK, ENCHANTED_SWORD_WEAPON_TYPES, ENCHANTED_SWORD_DAGGER_BASE_DMG, ENCHANTED_SWORD_SWORD_BASE_DMG, ENCHANTED_SWORD_GREATSWORD_BASE_DMG, ENCHANTED_SWORD_DAGGER_POISE, ENCHANTED_SWORD_SWORD_POISE, ENCHANTED_SWORD_GREATSWORD_POISE, ENCHANTED_SWORD_CD_BY_TYPE, RUNIC_GLASS_BASE_DMG, RUNIC_GLASS_DURATION, RUNIC_GLASS_TICKS, getRunicGlassDuration, SANGUINE_BOLT_BASE_DMG, SANGUINE_BOLT_HITS } from '../lib/constants/rune-base-damage';

export interface RuneDmgCtx {
  potency: number
  sliderVal?: number
  stats?: Record<string, number>
  perks?: Record<string, number>
  selfDamage?: number
  weaponDmgTypes?: Record<string, number>
  weaponDmgTypesBase?: Record<string, number>
}

export interface RuneSliderDef {
  buildKey: keyof BuildState
  label: string
  min: number
  max: number
  step?: number
  valueLabels?: string[]
  getMax?: (ctx: { perks: Record<string, number> }) => number
  defaultToMax?: boolean
}

export interface RuneShieldDef {
  getShieldHp: (sliderVal: number) => number
  label?: string
}

export interface RuneSecondaryDmgDef {
  getBaseDamage: (ctx: RuneDmgCtx) => number
  dmgTypes: Record<string, number>
  scalings: Record<string, number>
  hits?: number
  getHits?: (ctx: RuneDmgCtx) => number
  resolveDmgTypes?: (ctx: RuneDmgCtx) => Record<string, number>
  resolveScalings?: (ctx: RuneDmgCtx) => Record<string, number>
  activeIf?: (ctx: RuneDmgCtx) => boolean
  label?: string
  note?: string
  debuffName?: string
}

export interface RuneDmgDef {
  runeName: string
  condition?: string
  getBaseDamage: (ctx: RuneDmgCtx) => number
  dmgTypes: Record<string, number>
  scalings: Record<string, number>
  hits?: number
  getHits?: (ctx: RuneDmgCtx) => number
  maxPotency?: number
  potencyLabel?: string
  note?: string
  isHealOnly?: boolean
  activeIf?: (ctx: { perks: Record<string, number> }) => boolean
  resolveDmgTypes?: (ctx: RuneDmgCtx) => Record<string, number>
  resolveScalings?: (ctx: RuneDmgCtx) => Record<string, number>
  isFinisher?: boolean
  guardbreak?: boolean
  forceCrit?: boolean
  getForceCrit?: (ctx: RuneDmgCtx) => boolean
  secondary?: RuneSecondaryDmgDef
  slider?: RuneSliderDef
  shield?: RuneShieldDef
}

/**
 * Picks the weapon's highest damage type (ties broken by DMG_TYPE_PRIORITY),
 * mirroring computeEffectiveWaDmgTypes. Returns null when the weapon has no
 * positive damage types.
 */
function resolveHighestWeaponDmgType(types: Record<string, number> | undefined): string | null {
  const entries = Object.entries(types ?? {}).filter(([, v]) => v > 0)
  if (entries.length === 0) return null
  const priority = DMG_TYPE_PRIORITY as readonly string[]
  const [highestKey] = entries.reduce((a, b) => {
    if (b[1] > a[1]) return b
    if (b[1] === a[1]) {
      const ia = priority.indexOf(a[0])
      const ib = priority.indexOf(b[0])
      return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
    }
    return a
  })
  return highestKey
}

const ENCHANTED_SWORD_BASE_DMG_BY_TYPE: Record<number, number> = {
  0: ENCHANTED_SWORD_DAGGER_BASE_DMG,
  1: ENCHANTED_SWORD_SWORD_BASE_DMG,
  2: ENCHANTED_SWORD_GREATSWORD_BASE_DMG,
}
const ENCHANTED_SWORD_POISE_BY_TYPE: Record<number, number> = {
  0: ENCHANTED_SWORD_DAGGER_POISE,
  1: ENCHANTED_SWORD_SWORD_POISE,
  2: ENCHANTED_SWORD_GREATSWORD_POISE,
}

function calculateRuneHealScaling(
  runeDef: RuneDmgDef,
  ctx: {
    perks: Record<string, number>
    emotionalState?: 'buffs' | 'debuffs' | 'both'
    inDarkness: boolean
    level?: number
    sliderVal?: number
  }
): number {
  if (!runeDef.isHealOnly) return 1.0
  
  const healCtx: HealBoostContext = {
    perks: ctx.perks,
    emotionalState: ctx.emotionalState,
    inDarkness: ctx.inDarkness,
    level: ctx.level,
    sliderVal: ctx.sliderVal,
  }
  
  const result = calculateHealBoost(healCtx, 'rune')
  return result.finalMultiplier
}

export const RUNE_DMG_DEFS: RuneDmgDef[] = [
    {
      runeName: 'Magic Missile Rune',
      condition: 'On cast',
      getBaseDamage: () => MAGIC_MISSILE_BASE_DMG,
      dmgTypes: {},
      scalings: {},
      hits: MAGIC_MISSILE_HITS,
      resolveDmgTypes: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
        const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
        return highest ? { [highest]: 1 } : {}
      },
      resolveScalings: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
        const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
        if (!highest) return { magic: 0.5 }
        if (highest === 'true') return { magic: 1.0 }
        return { ...(highest === 'magic' ? {} : { [highest]: 0.5 }), magic: highest === 'magic' ? 1.0 : 0.5 }
      },
    },
    {
      runeName: 'Ancient Cleric Rune',
      condition: 'On cast',
      getBaseDamage: () => ANCIENT_CLERIC_BASE_DMG,
      dmgTypes: { heal: 1.0 },
      scalings: { holy: 0.5, earth: 0.5 },
      hits: 1,
      isHealOnly: true,
      slider: {
        buildKey: 'buffsConsumed',
        label: 'Buffs Consumed',
        min: 0,
        max: ANCIENT_CLERIC_SLIDER_MAX,
        step: 1,
        defaultToMax: true,
      },
      shield: {
        getShieldHp: (val) => ANCIENT_CLERIC_SHIELD_BASE + ANCIENT_CLERIC_SHIELD_PER_VAL * val,
      },
    },
    {
        runeName: 'Beenade Rune',
        condition: 'On cast',
        getBaseDamage: () => BEENADE_BASE_DMG,
        dmgTypes: { magic: 0.5, holy: 0.5 },
        scalings: { magic: 1.0, holy: 1.0 },
        getHits: ({ potency }) => 1 + potency,
        maxPotency: BEENADE_MAX_POTENCY,
        potencyLabel: 'Beenades potency',
    },
    {
    runeName: 'Boostshroom Rune',
    condition: 'On activation (up to every ~2s · 20s duration)',
    getBaseDamage: () => BOOSTSHROOM_BASE_DMG,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: 1,
  },
  {
    runeName: 'Thunderous Charge Rune',
    condition: 'On cast (dash through enemies)',
    getBaseDamage: () => THUNDEROUS_CHARGE_BASE_DMG,
    dmgTypes: { air: 0.5, magic: 0.5 },
    scalings: { air: 1.0, magic: 1.0 },
    hits: 1,
  },
  {
    runeName: 'Sporeling Toss Rune',
    condition: 'On cast',
    getBaseDamage: () => SPORELING_TOSS_BASE_DMG,
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalings: { hex: 1.0, physical: 1.0, summon: 1.0 },
    getHits: ({ sliderVal = 0 }) => SPORELING_TOSS_HITS_BASE + sliderVal,
    slider: {
      buildKey: 'sporelingsSummoned',
      label: 'Already-summoned Sporelings',
      min: 0,
      max: SPORELING_TOSS_SLIDER_MAX,
      step: 1,
      getMax: ({ perks }) => calcMaxSummonCount(perks),
    },
  },
  {
    runeName: 'Foot Dive Rune',
    condition: 'On cast',
    getBaseDamage: () => FOOT_DIVE_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: 1,
  },
  {
    runeName: 'Caci Rune',
    condition: 'On cast',
    getBaseDamage: () => CACI_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { summon: 1.0 },
    hits: CACI_HITS,
  },
  {
    runeName: 'Cacitrops Rune',
    condition: 'On cast',
    getBaseDamage: () => CACITROPS_BASE_DMG,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0, dexterity: 1.0 },
    hits: CACITROPS_HITS,
  },
  {
    runeName: 'Hex Web Rune',
    condition: 'On cast',
    getBaseDamage: () => HEX_WEB_BASE_DMG,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 1.0 },
    hits: HEX_WEB_HITS,
  },
    {
    runeName: 'Brainblast Rune',
    condition: 'On cast',
    getBaseDamage: () => BRAINBLAST_BASE_DMG,
    dmgTypes: { fire: 0.33, earth: 0.33, magic: 0.33 },
    scalings: { fire: 1.0, earth: 1.0, magic: 1.0 },
    hits: BRAINBLAST_HITS,
  },
  {
    runeName: 'Fireball Rune',
    condition: 'On cast',
    getBaseDamage: () => 15,
    dmgTypes: { fire: 1.0 },
    scalings: { fire: 0.7, magic: 0.3 },
  },
    {
    runeName: 'Rocky Tail Rune',
    condition: 'On cast / hold for tail slap combo',
    getBaseDamage: () => ROCKY_TAIL_BASE_DMG,
    dmgTypes: { earth: 0.5, physical: 0.5 },
    scalings: { earth: 1.0, protection: ROCKY_TAIL_PROT_SCALE },
    getHits: ({ stats, selfDamage = 0, perks = {} }) => {
      const p = stats?.protection ?? 0
      const vs = perks['Volatile Shell'] ?? 0
      const protRes = vs > 0 ? ROCKY_TAIL_VS_BASE_RES + ROCKY_TAIL_VS_PER_LEVEL * vs : ROCKY_TAIL_VS_DEFAULT_RES
      return Math.max(ROCKY_TAIL_MIN_HITS, Math.ceil(p / (ROCKY_TAIL_DIVISOR_COEFF * p + ROCKY_TAIL_DIVISOR_BASE + selfDamage * protRes)) * ROCKY_TAIL_HITS_MULT)
    },
  },
  {
    runeName: 'False Sun Rune',
    condition: 'Cast to create a small sun',
    getBaseDamage: () => 2.5,
    dmgTypes: { fire: 0.5, holy: 0.5 },
    scalings: { fire: 1.0, holy: 1.0 },
    hits: 10,
  },
    {
    runeName: 'Snoeball Rune',
    condition: 'Gather a large snoeball then throw it to cause a massive explosion that slows.',
    getBaseDamage: () => 30,
    dmgTypes: { water: 0.5, air: 0.5 },
    scalings: { water: 1.0, magic: 1.0 },
  },
  {
    runeName: 'Rage Rune',
    condition: 'Hold to channel (Slayer Rage) — Hex damage around you · 20 ticks',
    activeIf: ({ perks }) => (perks['Slayer Rage'] ?? 0) > 0,
    getBaseDamage: ({ perks = {} }) =>
      SLAYER_RAGE_RAGE_RUNE_BASE_DMG + SLAYER_RAGE_RAGE_RUNE_DMG_PER_STACK * (perks['Slayer Rage'] ?? 0),
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 0.75, physical: 0.75 },
    hits: SLAYER_RAGE_HITS,
  },
  {
    runeName: 'Weakening Roar Rune',
    condition: 'On cast · or hold to channel (Slayer Rage) — Hex damage around you · 20 ticks',
    getBaseDamage: ({ perks = {} }) => {
      const sr = perks['Slayer Rage'] ?? 0
      return sr > 0
        ? SLAYER_RAGE_ROAR_RUNE_BASE_DMG + SLAYER_RAGE_ROAR_RUNE_DMG_PER_STACK * sr
        : 10
    },
    getHits: ({ perks = {} }) => (perks['Slayer Rage'] ?? 0) > 0 ? SLAYER_RAGE_HITS : 1,
    dmgTypes: { hex: 1.0 },
    scalings: { hex: 0.7, magic: 0.3 },
    resolveScalings: ({ perks = {} }): Record<string, number> => {
      const sr = perks['Slayer Rage'] ?? 0
      if (sr > 0) {
        return { hex: 0.75, physical: 0.75, magic: 0.3 }
      }
      return { hex: 0.7, magic: 0.3 }
    },
    guardbreak: true,
  },
  {
    runeName: 'Heal Rune',
    condition: 'Casts a weak heal',
    getBaseDamage: () => 8,
    dmgTypes: { heal: 1.0 },
    scalings: { holy: 0.7 },
    isHealOnly: true,
  },
  {
    runeName: 'Proto Grappler Rune',
    condition: 'Using will launch the grapple hook in the direction your facing. Hold down to aim the grapple hook.',
    getBaseDamage: () => 7,
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalings: { hex: 0.5, physical: 0.5, dexterity: 0.5 },
  },
  {
    runeName: 'Rune of Cleansing',
    condition: 'Cast to cleanse debuffs.',
    getBaseDamage: () => 1,
    dmgTypes: { heal: 1.0 },
    scalings: { water: 0.5 },
    isHealOnly: true,
  },
  {
    runeName: 'Rubble Rune',
    condition: 'Toss a handful of rocks at the opponent.',
    getBaseDamage: () => 18,
    dmgTypes: { earth: 1.0 },
    scalings: { earth: 0.7, physical: 0.3 },
  },
  {
    runeName: 'Static Field Rune',
    condition: 'Only hits the enemy that activated the parry',
    getBaseDamage: () => 10,
    dmgTypes: { air: 0.5, magic: 0.5 },
    scalings: { air: 1.0, magic: 1.0 },
    hits: 1,
    guardbreak: true,
  },
  {
    runeName: 'Snarl Rune',
    condition: 'Applies Snarled on hit',
    getBaseDamage: () => 2,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0 },
    hits: 4,
  },
  {
    runeName: 'Sanguine Bolt Rune',
    condition: 'On cast (hold to channel)',
    getBaseDamage: () => SANGUINE_BOLT_BASE_DMG,
    dmgTypes: { air: 1 / 3, magic: 1 / 3, physical: 1 / 3 },
    scalings: { air: 0.75, magic: 0.75, physical: 0.75 },
    hits: SANGUINE_BOLT_HITS,
    guardbreak: true,
  },
  {
    runeName: 'Toad Slam Rune',
    condition: 'Slam into the floor and become enraged',
    getBaseDamage: () => 20,
    dmgTypes: { physical: 1.0 },
    scalings: { physical: 1.0 },
  },
  {
    runeName: 'Enchanted Sword Rune',
    condition: 'On release (M2 of the conjured weapon)',
    getBaseDamage: ({ sliderVal = 0 }) => ENCHANTED_SWORD_BASE_DMG_BY_TYPE[sliderVal] ?? ENCHANTED_SWORD_DAGGER_BASE_DMG,
    dmgTypes: {},
    scalings: {},
    hits: 1,
    resolveDmgTypes: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
      const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
      return highest ? { [highest]: 1 } : {}
    },
    resolveScalings: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
      const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
      if (!highest) return {}
      return highest === 'true' ? { magic: 1.0 } : { [highest]: 1.0 }
    },
    isFinisher: true,
    guardbreak: true,
    getForceCrit: ({ sliderVal = 0 }) => sliderVal === 0,
    slider: {
      buildKey: 'enchantedSwordType',
      label: 'Weapon Type',
      min: 0,
      max: ENCHANTED_SWORD_WEAPON_TYPES.length - 1,
      step: 1,
      valueLabels: [...ENCHANTED_SWORD_WEAPON_TYPES],
    },
    secondary: {
      label: 'Runic Glass',
      debuffName: 'Runic Glass',
      getBaseDamage: () => RUNIC_GLASS_BASE_DMG,
      dmgTypes: {},
      scalings: {},
      hits: RUNIC_GLASS_TICKS,
      getHits: ({ perks }) => getRunicGlassDuration(perks ?? {}),
      activeIf: ({ sliderVal = 0 }) => sliderVal === 1,
      resolveDmgTypes: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
        const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
        return highest ? { [highest]: 1 } : {}
      },
      resolveScalings: ({ weaponDmgTypesBase, weaponDmgTypes }) => {
        const highest = resolveHighestWeaponDmgType(weaponDmgTypesBase ?? weaponDmgTypes)
        if (!highest) return {}
        return highest === 'true' ? { magic: 1.0 } : { [highest]: 1.0 }
      },
    },
  },
]
