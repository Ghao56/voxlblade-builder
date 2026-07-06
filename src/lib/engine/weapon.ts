import type { StatMap, WeaponBlade, WeaponHandle, MonkGlove, MonkEssence } from '../types'
import { STAT_KEYS } from '../types'
import { getBlade, getHandle, getGlove, getEssence } from './data'
import { applyShrineToScalings, applyShrineToStats, SHRINE_MULTIPLIERS } from './shrine'
import { round2, round4 } from './_utils'

export const MONK_RANK_MULTIPLIER = 0.25

const SCALE_KEYS = [
  "dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling",
  "earthScaling","airScaling","hexScaling","holyScaling","summonScaling",
] as const

const DMG_TYPE_KEYS = [
  "trueType","physicalType","magicType","fireType","waterType","earthType","airType","hexType","holyType","summonType",
] as const

// ─── Hybrid check ─────────────────────────────────────────────────────────────

function checkHybrid(
  part1: { [key: string]: any } | undefined,
  part2: { [key: string]: any } | undefined,
): boolean {
  if (!part1 || !part2) return false
  const s1 = part1.stats ?? part1
  const s2 = part2.stats ?? part2

  let p1Has = false, p2Has = false
  const scalings1 = new Set<string>()

  for (let i = 0; i < SCALE_KEYS.length; i++) {
    const k = SCALE_KEYS[i]
    if (s1[k] != null && s1[k] !== 0) { scalings1.add(k); p1Has = true }
    if (s2[k] != null && s2[k] !== 0) p2Has = true
  }
  if (!p1Has || !p2Has) return false

  for (let i = 0; i < SCALE_KEYS.length; i++) {
    const k = SCALE_KEYS[i]
    if (s2[k] != null && s2[k] !== 0 && scalings1.has(k)) return false
  }
  return true
}

// ─── Weapon type resolution ───────────────────────────────────────────────────

const WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Medium Handle": { "Small Blade": "Dagger",  "Medium Blade": "1-Handed Sword",  "Heavy Blade": "Unbalanced Sword", "Hammer Head": "Mallet" },
  "Long Handle":   { "Small Blade": "Dagger",  "Medium Blade": "2-Handed Sword",  "Heavy Blade": "Greatsword",       "Hammer Head": "Mallet" },
  "Pole":          { "Small Blade": "Spear",   "Medium Blade": "Spear",           "Heavy Blade": "Great Spear",      "Hammer Head": "War Hammer" },
}

function getWeaponType(handleType: string, bladeType: string): string {
  return WEAPON_TYPE_MAP[handleType]?.[bladeType] ?? ""
}

type WeaponOverride = {
  perk:         string
  bladeTypes?:  string[]
  handleTypes?: string[]
  hammerOnly?:  boolean
  result:       string
}

const WEAPON_OVERRIDES: WeaponOverride[] = [
  { perk: "Kama Blades",    bladeTypes:  ["Small Blade"],                    result: "Dual Kamas" },
  { perk: "Kama Blades",    bladeTypes:  ["Spear", "Great Spear"],           result: "Scythe" },
  { perk: "Artillery Mage", hammerOnly:  true,                               result: "Artillery Mage" },
  { perk: "Stratos Winds",  hammerOnly:  true,                               result: "Stratos Winds" },
  { perk: "Storm Caster",   hammerOnly:  true,                               result: "Storm Caster" },
  { perk: "Virulent Core",  hammerOnly:  true,                               result: "Virulent Core" },
  { perk: "Dual Wielding",  bladeTypes:  ["Small Blade"],                    result: "Dual Wielding Daggers" },
  { perk: "Dual Wielding",  bladeTypes:  ["Medium Blade"],                   result: "Dual Swords" },
  { perk: "Dual Wielding",  bladeTypes:  ["Heavy Blade"],                    result: "Dual Unbalanced Swords" },
  { perk: "Dual Wielding",  bladeTypes:  ["Hammer Head"],                    result: "Dual Mallets" },
  { perk: "Lance",          handleTypes: ["Long Handle", "Medium Handle"],   result: "Lance" },
  { perk: "Duelist Stance", bladeTypes:  ["Medium Blade"],                   result: "Rapier" },
  { perk: "Saw Stance",     bladeTypes:  ["Medium Blade"],                   result: "Chainsaw" },
]

function resolveWeaponType(
  handleType: string,
  bladeType:  string,
  perks:      Record<string, number>,
): { base: string; final: string; modifier: string } {
  const base = getWeaponType(handleType, bladeType)
  if (!base) return { base: "", final: "", modifier: "" }

  for (const o of WEAPON_OVERRIDES) {
    if ((perks[o.perk] ?? 0) <= 0)                                    continue
    if (o.hammerOnly   && bladeType  !== "Hammer Head")               continue
    if (o.bladeTypes   && !o.bladeTypes.includes(bladeType)
                       && !o.bladeTypes.includes(base))               continue
    if (o.handleTypes  && !o.handleTypes.includes(handleType))        continue
    return { base, final: o.result, modifier: o.perk }
  }

  return { base, final: base, modifier: "" }
}

// ─── Monk weapon type resolution ──────────────────────────────────────────────

const MONK_WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Monk Essence": { "Gloves": "Fists", "Shield": "Shield" },
  "Essence":      { "Gloves": "Fists", "Shield": "Shield" },
}

function getMonkWeaponType(essenceType: string, gloveType: string): string {
  return MONK_WEAPON_TYPE_MAP[essenceType]?.[gloveType] ?? "Fists"
}

function resolveMonkWeaponType(
  essenceType: string,
  gloveType:   string,
  perks:       Record<string, number>,
): { base: string; final: string; modifier: string } {
  const base = getMonkWeaponType(essenceType, gloveType)
  if ((perks["Saw Heart"]         ?? 0) > 0 && base === "Fists") return { base, final: "Chain Fists",  modifier: "Saw Heart" }
  if ((perks["Locked And Loaded"] ?? 0) > 0 && base === "Fists") return { base, final: "Fists + Gun",  modifier: "Locked And Loaded" }
  return { base, final: base, modifier: "" }
}

// ─── WeaponResult ─────────────────────────────────────────────────────────────

export interface WeaponResult {
  part1DamageTypes:    Record<string, number>
  part2DamageTypes:    Record<string, number>
  part1Name:           string
  part2Name:           string
  part1TypeLabel:      string
  part2TypeLabel:      string
  part1Type:           string
  part2Type:           string
  isMonk:              boolean
  weaponType:          string
  finalWeaponType:     string
  weaponModifier:      string
  tier:                number
  stats:               StatMap
  perks:               Record<string, number>
  attackSpeed:         number
  damageTypes:         Record<string, number>
  part1RawScalings:    Record<string, number>
  part2RawScalings:    Record<string, number>
  part1RawStats:       StatMap
  part2RawStats:       StatMap
  part1FinalScalings:  Record<string, number>
  part2FinalScalings:  Record<string, number>
  part1FinalStats:     StatMap
  part2FinalStats:     StatMap
  scalings:            Record<string, number>
  shrineActive:        boolean
  hybridActive:        boolean
  bladeName:           string
  handleName:          string
  bladeType:           string
  handleType:          string
  bladeRawScalings:    Record<string, number>
  handleRawScalings:   Record<string, number>
  bladeRawStats:       StatMap
  handleRawStats:      StatMap
  bladeFinalScalings:  Record<string, number>
  handleFinalScalings: Record<string, number>
  bladeFinalStats:     StatMap
  handleFinalStats:    StatMap
  baseScalings:        Record<string, number>
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

function extractDamageAndScalings(part: any) {
  const damageTypes: Record<string, number> = {}
  const rawScalings: Record<string, number> = {}
  const rawStats:    StatMap                = {}

  if (!part) return { damageTypes, rawScalings, rawStats }
  const src = part.stats ?? part

  for (let i = 0; i < DMG_TYPE_KEYS.length; i++) {
    const key = DMG_TYPE_KEYS[i]
    if (src[key]) damageTypes[key.replace("Type", "")] = src[key]
  }
  for (let i = 0; i < SCALE_KEYS.length; i++) {
    const key = SCALE_KEYS[i]
    if (src[key]) rawScalings[key.replace("Scaling", "")] = src[key]
  }
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (src[k] != null) rawStats[k] = src[k]
  }
  return { damageTypes, rawScalings, rawStats }
}

function mergePartPerks(
  part1: any,
  part2: any,
): { perks: Record<string, number>; attackSpeed: number } {
  const perks:      Record<string, number> = {}
  const speedParts: number[]               = []

  const processPart = (part: any) => {
    if (!part) return
    if (part.attackSpeed != null) speedParts.push(part.attackSpeed)
    if (part.perkName) perks[part.perkName] = (perks[part.perkName] ?? 0) + (part.perkAmount ?? 1)
    if (part.perks) {
      for (let i = 0; i < part.perks.length; i++) {
        perks[part.perks[i].name] = (perks[part.perks[i].name] ?? 0) + part.perks[i].amount
      }
    }
  }
  processPart(part1)
  processPart(part2)

  let attackSpeed = 1.0
  if (speedParts.length > 0) {
    let sum = 0
    for (let i = 0; i < speedParts.length; i++) sum += speedParts[i]
    attackSpeed = sum / speedParts.length
  }

  return { perks, attackSpeed }
}

function applyShrineToPart<T extends Record<string, number>>(data: T, part: any, shrineActive: boolean, fn: (d: T, t: number) => T): T {
  return shrineActive && part ? fn(data, part.tier) : { ...data }
}

function mergeRecords<T extends Record<string, number>>(a: T, b: T): T {
  const result = { ...a }
  for (const k in b) {
    if (Object.prototype.hasOwnProperty.call(b, k)) (result as any)[k] = ((result as any)[k] ?? 0) + b[k]
  }
  return result
}

function mergeScalingsAndStats(
  p1Data:       ReturnType<typeof extractDamageAndScalings>,
  p2Data:       ReturnType<typeof extractDamageAndScalings>,
  part1:        any,
  part2:        any,
  shrineActive: boolean,
): {
  hybridActive:       boolean
  scalings:           Record<string, number>
  baseScalings:       Record<string, number>
  stats:              StatMap
  part1FinalScalings: Record<string, number>
  part2FinalScalings: Record<string, number>
  part1FinalStats:    StatMap
  part2FinalStats:    StatMap
} {
  const part1FinalScalings = applyShrineToPart(p1Data.rawScalings, part1, shrineActive, applyShrineToScalings)
  const part2FinalScalings = applyShrineToPart(p2Data.rawScalings, part2, shrineActive, applyShrineToScalings)
  const part1FinalStats    = applyShrineToPart(p1Data.rawStats, part1, shrineActive, applyShrineToStats as any)
  const part2FinalStats    = applyShrineToPart(p2Data.rawStats, part2, shrineActive, applyShrineToStats as any)

  const hybridActive = checkHybrid(part1 ?? undefined, part2 ?? undefined)

  const baseScalings = mergeRecords(part1FinalScalings, part2FinalScalings)

  const scalings: Record<string, number> = { ...baseScalings }
  if (hybridActive) {
    for (const k in scalings) {
      if (Object.prototype.hasOwnProperty.call(scalings, k)) scalings[k] *= 1.5
    }
  }

  const combinedStats = mergeRecords(part1FinalStats, part2FinalStats)

  const stats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (combinedStats[k] != null) {
      const rounded = round2(combinedStats[k] ?? 0)
      if (rounded !== 0) stats[k] = rounded
    }
  }

  return { hybridActive, scalings, baseScalings, stats, part1FinalScalings, part2FinalScalings, part1FinalStats, part2FinalStats }
}

function buildWeaponResult(opts: {
  part1:          any
  part2:          any
  part1TypeLabel: string
  part2TypeLabel: string
  part1TypeKey:   string
  part2TypeKey:   string
  isMonk:         boolean
  shrineActive:   boolean
  p1Data:         ReturnType<typeof extractDamageAndScalings>
  p2Data:         ReturnType<typeof extractDamageAndScalings>
  perks:          Record<string, number>
  attackSpeed:    number
  merged:         ReturnType<typeof mergeScalingsAndStats>
}): WeaponResult {
  const {
    part1, part2, part1TypeLabel, part2TypeLabel, part1TypeKey, part2TypeKey,
    isMonk, shrineActive, p1Data, p2Data, perks, attackSpeed, merged,
  } = opts

  const damageTypes: Record<string, number> = { ...p1Data.damageTypes }
  for (const k in p2Data.damageTypes) {
    if (Object.prototype.hasOwnProperty.call(p2Data.damageTypes, k)) {
      damageTypes[k] = round4((damageTypes[k] ?? 0) + p2Data.damageTypes[k])
    }
  }

  const p1Type = (part1 as any)?.[part1TypeKey] ?? ""
  const p2Type = (part2 as any)?.[part2TypeKey] ?? ""
  let weaponType = "", finalWeaponType = "", weaponModifier = ""
  if (p1Type && p2Type) {
    const resolved  = isMonk ? resolveMonkWeaponType(p2Type, p1Type, perks) : resolveWeaponType(p2Type, p1Type, perks)
    weaponType      = resolved.base
    finalWeaponType = resolved.final
    weaponModifier  = resolved.modifier
  }

  return {
    part1DamageTypes:    p1Data.damageTypes,
    part2DamageTypes:    p2Data.damageTypes,
    part1Name:           part1?.name ?? "",
    part2Name:           part2?.name ?? "",
    part1TypeLabel,
    part2TypeLabel,
    part1Type:           p1Type,
    part2Type:           p2Type,
    isMonk,
    weaponType,
    finalWeaponType,
    weaponModifier,
    tier:                Math.max(part1?.tier ?? 1, part2?.tier ?? 1),
    stats:               merged.stats,
    perks,
    attackSpeed:         round2(attackSpeed),
    damageTypes,
    part1RawScalings:    p1Data.rawScalings,
    part2RawScalings:    p2Data.rawScalings,
    part1RawStats:       p1Data.rawStats,
    part2RawStats:       p2Data.rawStats,
    part1FinalScalings:  merged.part1FinalScalings,
    part2FinalScalings:  merged.part2FinalScalings,
    part1FinalStats:     merged.part1FinalStats,
    part2FinalStats:     merged.part2FinalStats,
    scalings:            merged.scalings,
    shrineActive,
    hybridActive:        merged.hybridActive,
    bladeName:           part1?.name ?? "",
    handleName:          part2?.name ?? "",
    bladeType:           p1Type,
    handleType:          p2Type,
    bladeRawScalings:    p1Data.rawScalings,
    handleRawScalings:   p2Data.rawScalings,
    bladeRawStats:       p1Data.rawStats,
    handleRawStats:      p2Data.rawStats,
    bladeFinalScalings:  merged.part1FinalScalings,
    handleFinalScalings: merged.part2FinalScalings,
    bladeFinalStats:     merged.part1FinalStats,
    handleFinalStats:    merged.part2FinalStats,
    baseScalings:        merged.baseScalings,
  }
}

function calcWeaponGeneric(
  part1:          WeaponBlade | MonkGlove   | null,
  part2:          WeaponHandle | MonkEssence | null,
  part1TypeLabel: string,
  part2TypeLabel: string,
  part1TypeKey:   string,
  part2TypeKey:   string,
  isMonk:         boolean,
  shrineActive:   boolean,
): WeaponResult | null {
  if (!part1 && !part2) return null

  const p1Data                 = extractDamageAndScalings(part1)
  const p2Data                 = extractDamageAndScalings(part2)
  const { perks, attackSpeed } = mergePartPerks(part1, part2)
  const merged                 = mergeScalingsAndStats(p1Data, p2Data, part1, part2, shrineActive)

  return buildWeaponResult({
    part1, part2, part1TypeLabel, part2TypeLabel, part1TypeKey, part2TypeKey,
    isMonk, shrineActive, p1Data, p2Data, perks, attackSpeed, merged,
  })
}

// ─── Monk stat bonus helper (deduplicates two formerly-cloned loops) ──────────

/**
 * Applies shrine + monk-rank bonus to one weapon part's base stats,
 * patching result.stats / result[finalKey] / result[rawKey] in-place.
 */
function applyMonkStatBonus(
  baseStats: StatMap,
  shrineMult: number,
  monkPct:    number,
  result:     WeaponResult,
  finalKey:   'part1FinalStats' | 'part2FinalStats',
  rawKey:     'part1RawStats'   | 'part2RawStats',
): void {
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k     = STAT_KEYS[i]
    const baseV = baseStats[k]
    if (baseV == null || baseV <= 0) continue
    const wrongVal   = round2(baseV * shrineMult)
    const correctVal = round2(baseV * shrineMult + baseV * monkPct)
    const diff       = round2(correctVal - wrongVal)
    if (diff !== 0) result.stats[k] = round2((result.stats[k] ?? 0) + diff)
    result[finalKey][k] = correctVal
    result[rawKey][k]   = baseV
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function calcWeapon(bladeName: string, handleName: string, shrineActive = false): WeaponResult | null {
  return calcWeaponGeneric(getBlade(bladeName) ?? null, getHandle(handleName) ?? null, "Blade", "Handle", "bladeType", "handleType", false, shrineActive)
}

export function calcMonkWeapon(gloveName: string, essenceName: string, shrineActive = false, monkRank = 1): WeaponResult | null {
  const glove  = getGlove(gloveName)
  const result = calcWeaponGeneric(glove ?? null, getEssence(essenceName) ?? null, "Glove", "Essence", "gloveType", "essenceType", true, shrineActive)
  if (!result) return null

  const monkPerkBonus = Math.max(0, monkRank - 1)
  if (monkPerkBonus > 0 && glove) {
    const monkPct      = monkPerkBonus * MONK_RANK_MULTIPLIER
    const shrineMult   = shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0
    applyMonkStatBonus(glove.stats as StatMap, shrineMult, monkPct, result, 'part1FinalStats', 'part1RawStats')

    const gp = (glove as any).perks as Array<{ name: string; amount: number }> | undefined
    if (gp && gp.length > 0) result.perks[gp[0].name] = (result.perks[gp[0].name] ?? 0) + monkPerkBonus
  }

  const _essence = getEssence(essenceName)
  if (monkPerkBonus > 0 && _essence) {
    const monkPct    = monkPerkBonus * MONK_RANK_MULTIPLIER
    const shrineMult = shrineActive ? (SHRINE_MULTIPLIERS[_essence.tier] ?? 1.0) : 1.0
    applyMonkStatBonus(_essence.stats as StatMap, shrineMult, monkPct, result, 'part2FinalStats', 'part2RawStats')
  }

  return result
}
