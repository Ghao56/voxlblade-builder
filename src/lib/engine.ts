import type {
  Race, Guild, GuildRank, Armor, ArmorPart, Ring, Rune,
  Enchantment, Perk, StatMap, StatKey, StatModifier, EnchantSlot, BuildState,
  WeaponBlade, WeaponHandle, MonkGlove, MonkEssence
} from './types'
import { STAT_KEYS, PERCENT_STATS, applyUpgrade } from './types'
import { CDR_PERK_DATA } from '../data/cdr'
import { applyStatBoostPerks } from '../data/statboost'

import racesRaw from '../data/races.json'
import guildsRaw from '../data/guilds.json'
import armorsRaw from '../data/armors.json'
import ringsRaw from '../data/rings.json'
import runesRaw from '../data/runes.json'
import enchantmentsRaw from '../data/enchantments.json'
import perksRaw from '../data/perks.json'
import bladesRaw from '../data/blades.json'
import handlesRaw from '../data/handles.json'
import glovesRaw from '../data/gloves.json'
import essencesRaw from '../data/essences.json'

export const races: Race[] = racesRaw as Race[]
export const guilds: Guild[] = guildsRaw as Guild[]
export const perks: Perk[] = perksRaw as Perk[]
export const rings: Ring[] = ringsRaw as Ring[]
export const runes: Rune[] = runesRaw as Rune[]
export const enchantments: Enchantment[] = enchantmentsRaw as Enchantment[]
export const blades: WeaponBlade[] = bladesRaw as WeaponBlade[]
export const handles: WeaponHandle[] = handlesRaw as WeaponHandle[]
export const gloves: MonkGlove[] = glovesRaw as MonkGlove[]
export const essences: MonkEssence[] = essencesRaw as MonkEssence[]

export const armors: Armor[] = (armorsRaw as any[]).map(a => ({
  name: a.name,
  tags: a.tags,
  parts: a.parts.map((p: any) => ({
    type: p.type,
    description: p.description ?? a.sharedPart?.description ?? "",
    upgrade: p.upgrade ?? a.sharedPart?.upgrade ?? 0,
    stats: { ...(a.sharedPart?.stats ?? {}), ...(p.stats ?? {}) },
    perkName: p.perkName ?? a.sharedPart?.perkName ?? "",
    perkAmount: p.perkAmount ?? a.sharedPart?.perkAmount ?? 0
  }))
}))

const PERK_MAP = Object.fromEntries(perks.map(p => [p.name, p]))
const ENCHANT_MAP = Object.fromEntries(enchantments.map(e => [e.name, e]))
const RING_MAP = Object.fromEntries(rings.map(r => [r.name, r]))
const RUNE_MAP = Object.fromEntries(runes.map(r => [r.name, r]))
const ARMOR_MAP = Object.fromEntries(armors.map(a => [a.name, a]))
const BLADE_MAP = Object.fromEntries(blades.map(b => [b.name, b]))
const HANDLE_MAP = Object.fromEntries(handles.map(h => [h.name, h]))
const GLOVE_MAP = Object.fromEntries(gloves.map(g => [g.name, g]))
const ESSENCE_MAP = Object.fromEntries(essences.map(e => [e.name, e]))

export function getPerk(name: string) { return PERK_MAP[name] }
export function getEnchant(name: string) { return ENCHANT_MAP[name] }
export function getRing(name: string) { return RING_MAP[name] }
export function getRune(name: string) { return RUNE_MAP[name] }
export function getArmor(name: string) { return ARMOR_MAP[name] }
export function getBlade(name: string) { return BLADE_MAP[name] }
export function getHandle(name: string) { return HANDLE_MAP[name] }
export function getGlove(name: string) { return GLOVE_MAP[name] }
export function getEssence(name: string) { return ESSENCE_MAP[name] }
export function getArmorPart(name: string, type: ArmorPart["type"]) {
  return getArmor(name)?.parts.find(p => p.type === type)
}
export function getGuild(name: string) { return guilds.find(g => g.name === name) }
export function getGuildRank(guild: Guild, rank: number): GuildRank | undefined {
  return guild.ranks.find(r => r.rank === rank)
}

export function isMonkGuild(guildName: string): boolean {
  return guildName === "Monk"
}

export function applyMonkGuildBonus(
  stats: StatMap,
  glovePerks: Array<{name: string; amount: number}>,
  monkRank: number
): { stats: StatMap; perkBonus: number } {
  // rank 1: no bonus, rank 2: +25%, rank 3: +50%
  const statMult = 1 + Math.max(0, monkRank - 1) * 0.25
  
  const boostedStats: StatMap = {}
  for (const [k, v] of Object.entries(stats)) {
    if (v == null) continue
    // Only boost positive stat boost values (boosts)
    boostedStats[k as StatKey] = v > 0 ? Math.round((v * statMult + Number.EPSILON) * 100) / 100 : v
  }
  
  // +1 perk amount to first perk per rank
  const perkBonus = monkRank
  
  return { stats: boostedStats, perkBonus }
}

// ─── Enchantment logic ────────────────────────────────────────────────────────

function applyMod(value: number, mod: StatModifier): number {
  return mod.type === "multiplier" ? value * mod.value : value + mod.value
}

function normalizeModifiers(m: StatModifier | StatModifier[]): StatModifier[] {
  return Array.isArray(m) ? m : [m]
}

export function applyEnchantmentsToSlot(
  baseStats: StatMap,
  basePerks: Record<string, number>,
  enchantNames: string[]
): { stats: StatMap; perks: Record<string, number> } {
  const ordered = [...enchantNames].reverse()

  const mult: Partial<Record<StatKey, number>> = {}
  const add:  Partial<Record<StatKey, number>> = {}
  const perks = { ...basePerks }

  for (const name of ordered) {
    if (!name) continue
    const e = getEnchant(name)
    if (!e) continue
    const es = e.stats

    if (es.positiveStats) {
      const mods = normalizeModifiers(es.positiveStats as StatModifier | StatModifier[])
      for (const key of STAT_KEYS) {
        const base = baseStats[key] ?? 0
        if (base > 0) {
          for (const mod of mods) {
            if (mod.type === 'multiplier') mult[key] = (mult[key] ?? 1) * mod.value
            else add[key] = (add[key] ?? 0) + mod.value
          }
        }
      }
    }

    if (es.negativeStats) {
      const mods = normalizeModifiers(es.negativeStats as StatModifier | StatModifier[])
      for (const key of STAT_KEYS) {
        const base = baseStats[key] ?? 0
        if (base < 0) {
          for (const mod of mods) {
            if (mod.type === 'multiplier') mult[key] = (mult[key] ?? 1) * mod.value
            else add[key] = (add[key] ?? 0) + mod.value
          }
        }
      }
    }

    if (es.defenseStats) {
      const mods = normalizeModifiers(es.defenseStats as StatModifier | StatModifier[])
      const defenseKeys = STAT_KEYS.filter(k => k.endsWith('Defense'))
      for (const key of defenseKeys) {
        const base = baseStats[key] ?? 0
        if (base > 0) {
          for (const mod of mods) {
            if (mod.type === 'multiplier') mult[key] = (mult[key] ?? 1) * mod.value
            else add[key] = (add[key] ?? 0) + mod.value
          }
        }
      }
    }

    if (es.perks) {
      const mods = normalizeModifiers(es.perks as StatModifier | StatModifier[])
      for (const perkName of Object.keys(perks)) {
        let v = perks[perkName]
        for (const mod of mods) v = applyMod(v, mod)
        perks[perkName] = v
      }
    }

    for (const [key, modifier] of Object.entries(es)) {
      if (!modifier) continue
      if (['positiveStats', 'negativeStats', 'defenseStats', 'perks'].includes(key)) continue
      if (!STAT_KEYS.includes(key as StatKey)) continue
      const mods = normalizeModifiers(modifier as StatModifier | StatModifier[])
      for (const mod of mods) {
        if (mod.type === 'multiplier') mult[key as StatKey] = (mult[key as StatKey] ?? 1) * mod.value
        else add[key as StatKey] = (add[key as StatKey] ?? 0) + mod.value
      }
    }

    for (const eff of e.effects) {
      perks[eff.name] = (perks[eff.name] ?? 0) + eff.value
    }
  }

  const stats: StatMap = {}
  const allKeys = new Set<StatKey>([
    ...Object.keys(baseStats) as StatKey[],
    ...Object.keys(mult) as StatKey[],
    ...Object.keys(add) as StatKey[],
  ])
  for (const key of allKeys) {
    const base = baseStats[key] ?? 0
    const result = base * (mult[key] ?? 1) + (add[key] ?? 0)
    if (result !== 0) stats[key] = result
  }

  return { stats, perks }
}

// ─── Perk Effectiveness ───────────────────────────────────────────────────────

const ENCHANT_EFFECT_PERK_NAMES = new Set(
  (enchantmentsRaw as Enchantment[]).flatMap(e => (e.effects ?? []).map(ef => ef.name))
)

const PERK_EFFECTIVENESS_EXEMPT = new Set([
  ...ENCHANT_EFFECT_PERK_NAMES,
  "Cursed",
  "Luminescent Fervor",
  "Valor",
  "Spirit Commune",
  "Channeled Weapon",
  "Quickcast",
  "Thief Training",
  "Vampire",
])

export function applyPerkEffectiveness(
  perks: Record<string, number>,
  perkEffectivenessStacks: number,
  cursedStacks: number
): Record<string, number> {
  if (perkEffectivenessStacks <= 0 && cursedStacks <= 0) return perks
  const multiplier = (1 + perkEffectivenessStacks * 0.1) * (1 + cursedStacks * 0.1)
  const result: Record<string, number> = {}
  for (const [name, value] of Object.entries(perks)) {
    result[name] = PERK_EFFECTIVENESS_EXEMPT.has(name)
      ? value
      : value * multiplier
  }
  return result
}

// ─── Infusion helper ──────────────────────────────────────────────────────────

export function applyInfusion(
  baseStats: StatMap,
  basePerks: Record<string, number>
): { stats: StatMap; perks: Record<string, number> } {
  const stats: StatMap = {}
  for (const [k, v] of Object.entries(baseStats)) {
    if (v != null) stats[k as StatKey] = v * 0.5
  }
  return { stats, perks: { ...basePerks } }
}

// ─── Shrine of Balance ────────────────────────────────────────────────────────

export const SHRINE_MULTIPLIERS: Record<number, number> = {
  1: 3.0,
  2: 1.7,
  3: 1.4,
  4: 1.1,
  5: 1.0,
}

export function applyShrineToScalings(
  scalings: Record<string, number>,
  tier: number
): Record<string, number> {
  const mult = SHRINE_MULTIPLIERS[tier] ?? 1.0
  if (mult === 1.0) return { ...scalings }
  const result: Record<string, number> = {}
  for (const [k, v] of Object.entries(scalings)) {
    result[k] = Math.round((v * mult + Number.EPSILON) * 100) / 100
  }
  return result
}

export function applyShrineToStats(
  stats: StatMap|undefined|null,
  tier: number
): StatMap {
  if (!stats) return {}
  const mult = SHRINE_MULTIPLIERS[tier] ?? 1.0
  if (mult === 1.0) {
    const r: StatMap = {}
    for (const [k, v] of Object.entries(stats)) {
      if (v == null || !STAT_KEYS.includes(k as StatKey)) continue
      r[k as StatKey] = v as number
    }
    return r
  }
  const result: StatMap = {}
  for (const [k, v] of Object.entries(stats)) {
    if (v == null || !STAT_KEYS.includes(k as StatKey)) continue
    result[k as StatKey] = (v as number) > 0
      ? Math.round(((v as number) * mult + Number.EPSILON) * 100) / 100
      : (v as number)
  }
  return result
}

export function checkHybrid(
  part1: { [key: string]: any } | undefined,
  part2: { [key: string]: any } | undefined
): boolean {
  if (!part1 || !part2) return false
  const scaleKeys = ["dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling","earthScaling","airScaling","hexScaling","holyScaling","summonScaling"]
  const scalings1 = new Set(scaleKeys.filter(k => part1[k] != null && part1[k] !== 0))
  const scalings2 = new Set(scaleKeys.filter(k => part2[k] != null && part2[k] !== 0))
  if (scalings1.size === 0 || scalings2.size === 0) return false
  for (const k of scalings1) { if (scalings2.has(k)) return false }
  return true
}

// ─── Standard weapon type resolution ─────────────────────────────────────────

const WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Medium Handle": {
    "Small Blade":  "Dagger",
    "Medium Blade": "1-Handed Sword",
    "Heavy Blade":  "Unbalanced Sword",
    "Hammer Head":  "Mallet",
  },
  "Long Handle": {
    "Small Blade":  "Dagger",
    "Medium Blade": "2-Handed Sword",
    "Heavy Blade":  "Greatsword",
    "Hammer Head":  "Mallet",
  },
  "Pole": {
    "Small Blade":  "Spear",
    "Medium Blade": "Spear",
    "Heavy Blade":  "Great Spear",
    "Hammer Head":  "War Hammer",
  },
}

export function getWeaponType(handleType: string, bladeType: string): string {
  return WEAPON_TYPE_MAP[handleType]?.[bladeType] ?? ""
}

export function resolveWeaponType(
  handleType: string,
  bladeType: string,
  perks: Record<string, number>
): { base: string; final: string; modifier: string } {
  const base = getWeaponType(handleType, bladeType)
  if (!base) return { base: "", final: "", modifier: "" }

  if ((perks["Dual Wielding"] ?? 0) > 0) {
    if (bladeType === "Small Blade")  return { base, final: "Dual Wielding Daggers", modifier: "Dual Wielding" }
    if (bladeType === "Medium Blade") return { base, final: "Dual Swords",           modifier: "Dual Wielding" }
    if (bladeType === "Heavy Blade")  return { base, final: "Dual Unbalanced Swords",modifier: "Dual Wielding" }
    if (bladeType === "Hammer Head")  return { base, final: "Dual Mallets",          modifier: "Dual Wielding" }
  }

  if ((perks["Lance"] ?? 0) > 0) {
    if (handleType === "Long Handle" || handleType === "Medium Handle")
      return { base, final: "Lance", modifier: "Lance" }
  }

  if ((perks["Duelist Stance"] ?? 0) > 0 && bladeType === "Medium Blade") {
    return { base, final: "Rapier", modifier: "Duelist Stance" }
  }

  if ((perks["Saw Stance"] ?? 0) > 0 && bladeType === "Medium Blade") {
    return { base, final: "Chainsaw", modifier: "Saw Stance" }
  }

  if ((perks["Kama Blades"] ?? 0) > 0) {
    if (base === "Dagger") return { base, final: "Dual Kamas", modifier: "Kama Blades" }
    if (base === "Spear")  return { base, final: "Scythe",     modifier: "Kama Blades" }
  }

  return { base, final: base, modifier: "" }
}

// ─── Monk weapon type resolution ──────────────────────────────────────────────

const MONK_WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Monk Essence": {
    "Gloves": "Fists",
    "Shield": "Shield",
  },
  "Essence":{
    "Gloves": "Fists",
    "Shield": "Shield",
  }
}

export function getMonkWeaponType(essenceType: string, gloveType: string): string {
  return MONK_WEAPON_TYPE_MAP[essenceType]?.[gloveType] ?? "Fists"
}

export function resolveMonkWeaponType(
  essenceType: string,
  gloveType: string,
  perks: Record<string, number>
): { base: string; final: string; modifier: string } {
  const base = getMonkWeaponType(essenceType, gloveType)

  if ((perks["Saw Heart"] ?? 0) > 0 && base === "Fists") {
    return { base, final: "Chain Fists", modifier: "Saw Heart" }
  }

  if ((perks["Locked And Loaded"] ?? 0) > 0 && base === "Fists") {
    return { base, final: "Fists + Gun", modifier: "Locked And Loaded" }
  }

  return { base, final: base, modifier: "" }
}

// ─── Shared WeaponResult interface ───────────────────────────────────────────

export interface WeaponResult {
  part1DamageTypes: Record<string, number>
  part2DamageTypes: Record<string, number>
  part1Name: string
  part2Name: string
  part1TypeLabel: string
  part2TypeLabel: string
  part1Type: string
  part2Type: string
  isMonk: boolean
  weaponType: string
  finalWeaponType: string
  weaponModifier: string
  tier: number
  stats: StatMap
  perks: Record<string, number>
  attackSpeed: number
  damageTypes: Record<string, number>
  part1RawScalings: Record<string, number>
  part2RawScalings: Record<string, number>
  part1RawStats: StatMap
  part2RawStats: StatMap
  part1FinalScalings: Record<string, number>
  part2FinalScalings: Record<string, number>
  part1FinalStats: StatMap
  part2FinalStats: StatMap
  scalings: Record<string, number>
  shrineActive: boolean
  hybridActive: boolean
  bladeName: string
  handleName: string
  bladeType: string
  handleType: string
  bladeRawScalings: Record<string, number>
  handleRawScalings: Record<string, number>
  bladeRawStats: StatMap
  handleRawStats: StatMap
  bladeFinalScalings: Record<string, number>
  handleFinalScalings: Record<string, number>
  bladeFinalStats: StatMap
  handleFinalStats: StatMap
}

// ─── Generic weapon calc ──────────────────────────────────────────────────────

function calcWeaponGeneric(
  part1: WeaponBlade | MonkGlove | null,
  part2: WeaponHandle | MonkEssence | null,
  part1TypeLabel: string,
  part2TypeLabel: string,
  part1TypeKey: string,
  part2TypeKey: string,
  isMonk: boolean,
  shrineActive: boolean
): WeaponResult | null {
  if (!part1 && !part2) return null

  const perks: Record<string, number> = {}
  const speedParts: number[] = []

  if (part1) {
    if (part1.attackSpeed != null) speedParts.push(part1.attackSpeed)
    if (part1.perkName) {
      perks[part1.perkName] = (perks[part1.perkName] ?? 0) + (part1.perkAmount ?? 1)
    }
    const p1perks = (part1 as any).perks as Array<{name:string;amount:number}> | undefined
    if (p1perks) {
      for (const p of p1perks) perks[p.name] = (perks[p.name] ?? 0) + p.amount
    }
  }
  if (part2) {
    if (part2.attackSpeed != null) speedParts.push(part2.attackSpeed)
    if (part2.perkName) {
      perks[part2.perkName] = (perks[part2.perkName] ?? 0) + (part2.perkAmount ?? 1)
    }
    const p2perks = (part2 as any).perks as Array<{name:string;amount:number}> | undefined
    if (p2perks) {
      for (const p of p2perks) perks[p.name] = (perks[p.name] ?? 0) + p.amount
    }
  }

  const attackSpeed = speedParts.length > 0
    ? speedParts.reduce((a, b) => a + b, 0) / speedParts.length
    : 1.0

  const dtKeys = [
    "trueType","physicalType","magicType","fireType",
    "waterType","earthType","airType","hexType","holyType","summonType"
  ]

  const part1DamageTypes: Record<string, number> = {}
  const part2DamageTypes: Record<string, number> = {}

  if (part1) {
    for (const key of dtKeys) {
      const v = (part1 as any)[key]
      if (v != null && v !== 0) {
        part1DamageTypes[key.replace("Type", "")] = v
      }
    }
  }

  if (part2) {
    for (const key of dtKeys) {
      const v = (part2 as any)[key]
      if (v != null && v !== 0) {
        part2DamageTypes[key.replace("Type", "")] = v
      }
    }
  }

  const damageTypes: Record<string, number> = { ...part1DamageTypes }
  for (const [k, v] of Object.entries(part2DamageTypes)) {
    damageTypes[k] = (damageTypes[k] ?? 0) + v
  }

  const scaleKeys = ["dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling","earthScaling","airScaling","hexScaling","holyScaling","summonScaling"]

  const part1RawScalings: Record<string, number> = {}
  const part2RawScalings: Record<string, number> = {}
  if (part1) {
    for (const key of scaleKeys) {
      const v = (part1 as any)[key]
      if (v != null && v !== 0) part1RawScalings[key.replace("Scaling", "")] = v
    }
  }
  if (part2) {
    for (const key of scaleKeys) {
      const v = (part2 as any)[key]
      if (v != null && v !== 0) part2RawScalings[key.replace("Scaling", "")] = v
    }
  }

  const part1RawStats: StatMap = part1 ? { ...(part1.stats as StatMap ?? {}) } : {}
  const part2RawStats: StatMap = part2 ? { ...(part2.stats as StatMap ?? {}) } : {}

  const part1FinalScalings = shrineActive && part1
    ? applyShrineToScalings(part1RawScalings, part1.tier)
    : { ...part1RawScalings }
  const part2FinalScalings = shrineActive && part2
    ? applyShrineToScalings(part2RawScalings, part2.tier)
    : { ...part2RawScalings }

  const part1FinalStats: StatMap = shrineActive && part1
    ? applyShrineToStats(part1.stats as StatMap, part1.tier)
    : { ...part1RawStats }
  const part2FinalStats: StatMap = shrineActive && part2
    ? applyShrineToStats(part2.stats as StatMap, part2.tier)
    : { ...part2RawStats }

  const hybridActive = checkHybrid(part1 ?? undefined, part2 ?? undefined)

  const mergedScalings: Record<string, number> = {}
  for (const [k, v] of Object.entries(part1FinalScalings)) mergedScalings[k] = (mergedScalings[k] ?? 0) + v
  for (const [k, v] of Object.entries(part2FinalScalings)) mergedScalings[k] = (mergedScalings[k] ?? 0) + v
  for (const k of Object.keys(mergedScalings)) mergedScalings[k] = Math.round((mergedScalings[k] + Number.EPSILON) * 100) / 100

  const scalings: Record<string, number> = { ...mergedScalings }
  if (hybridActive) {
    for (const k of Object.keys(scalings)) {
      scalings[k] = Math.round((scalings[k] * 1.5 + Number.EPSILON) * 100) / 100
    }
  }

  const combinedStats: StatMap = {}
  function mergeStats(s: StatMap) {
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue
      combinedStats[k as StatKey] = (combinedStats[k as StatKey] ?? 0) + v
    }
  }
  mergeStats(part1FinalStats)
  mergeStats(part2FinalStats)

  const finalStats: StatMap = {}
  for (const [k, v] of Object.entries(combinedStats)) {
    const rounded = Math.round((v + Number.EPSILON) * 100) / 100
    if (rounded !== 0) finalStats[k as StatKey] = rounded
  }

  const p1Type = (part1 as any)?.[part1TypeKey] ?? ""
  const p2Type = (part2 as any)?.[part2TypeKey] ?? ""

  let weaponType = ""
  let finalWeaponType = ""
  let weaponModifier = ""

  if (p1Type && p2Type) {
    if (isMonk) {
      const resolved = resolveMonkWeaponType(p2Type, p1Type, perks)
      weaponType = resolved.base
      finalWeaponType = resolved.final
      weaponModifier = resolved.modifier
    } else {
      const resolved = resolveWeaponType(p2Type, p1Type, perks)
      weaponType = resolved.base
      finalWeaponType = resolved.final
      weaponModifier = resolved.modifier
    }
  }

  const result: WeaponResult = {
    part1DamageTypes,
    part2DamageTypes,
    part1Name: part1?.name ?? "",
    part2Name: part2?.name ?? "",
    part1TypeLabel,
    part2TypeLabel,
    part1Type: p1Type,
    part2Type: p2Type,
    isMonk,
    weaponType,
    finalWeaponType,
    weaponModifier,
    tier: Math.max(part1?.tier ?? 1, part2?.tier ?? 1),
    stats: finalStats,
    perks,
    attackSpeed: Math.round(attackSpeed * 100) / 100,
    damageTypes,
    part1RawScalings,
    part2RawScalings,
    part1RawStats,
    part2RawStats,
    part1FinalScalings,
    part2FinalScalings,
    part1FinalStats,
    part2FinalStats,
    scalings,
    shrineActive,
    hybridActive,
    bladeName: part1?.name ?? "",
    handleName: part2?.name ?? "",
    bladeType: p1Type,
    handleType: p2Type,
    bladeRawScalings: part1RawScalings,
    handleRawScalings: part2RawScalings,
    bladeRawStats: part1RawStats,
    handleRawStats: part2RawStats,
    bladeFinalScalings: part1FinalScalings,
    handleFinalScalings: part2FinalScalings,
    bladeFinalStats: part1FinalStats,
    handleFinalStats: part2FinalStats,
  }

  return result
}

export function calcWeapon(
  bladeName: string,
  handleName: string,
  shrineActive: boolean = false
): WeaponResult | null {
  const blade = bladeName ? getBlade(bladeName) : null
  const handle = handleName ? getHandle(handleName) : null
  if (!blade && !handle) return null
  return calcWeaponGeneric(
    blade ?? null, handle ?? null,
    "Blade", "Handle",
    "bladeType", "handleType",
    false, shrineActive
  )
}

export function calcMonkWeapon(
  gloveName: string,
  essenceName: string,
  shrineActive: boolean = false,
  monkRank: number = 1
): WeaponResult | null {
  const glove = gloveName ? getGlove(gloveName) : null
  const essence = essenceName ? getEssence(essenceName) : null
  if (!glove && !essence) return null
  
  const result = calcWeaponGeneric(
    glove ?? null, essence ?? null,
    "Glove", "Essence",
    "gloveType", "essenceType",
    true, shrineActive
  )
  
  if (!result) return null

  const monkStatMult = 1 + Math.max(0, monkRank - 1) * 0.25
  const monkPerkBonus = Math.max(0, monkRank - 1)

  // Apply stat multiplier to glove's contribution in combined stats

  if (monkPerkBonus > 0 && glove) {
    const monkPct = Math.max(0, monkRank - 1) * 0.25
    const baseGloveStats = glove.stats as StatMap
    const shrineMult = shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0

    for (const [k, baseV] of Object.entries(baseGloveStats)) {
      if (baseV == null || (baseV as number) <= 0) continue
      const base = baseV as number
      const wrongVal = Math.round((base * shrineMult + Number.EPSILON) * 100) / 100
      const correctVal = Math.round((base * shrineMult + base * monkPct + Number.EPSILON) * 100) / 100
      const diff = Math.round((correctVal - wrongVal + Number.EPSILON) * 100) / 100
      if (diff !== 0) {
        result.stats[k as StatKey] = Math.round(
          ((result.stats[k as StatKey] ?? 0) + diff + Number.EPSILON) * 100
        ) / 100
      }
      result.part1FinalStats[k as StatKey] = correctVal
      result.part1RawStats[k as StatKey] = base
    }
  }
  // Apply perk bonus to first glove perk
  if (glove && monkPerkBonus > 0) {
    const gp = (glove as any).perks as Array<{name:string;amount:number}> | undefined
    if (gp && gp.length > 0) {
      result.perks[gp[0].name] = (result.perks[gp[0].name] ?? 0) + monkPerkBonus
    }
  }

  return result
}

// ─── Cooldown Reduction System ────────────────────────────────────────────────

export interface CDRStep {
  source: string
  pct: number
  multiplier: number
  isMultiply?: boolean
}

export interface CDRResult {
  runeCDR: number
  waCDR: number
  runeSetCD?: number
  runeBreakdown: CDRStep[]
  waBreakdown: CDRStep[]
}

export function calcCDR(
  perks: Record<string, number>,
  raceCooldownModifiers?: Record<string, number>,
  activeRuneName?: string,
  activeRaceName?: string
): CDRResult {
  const runeSteps: CDRStep[] = []
  const waSteps: CDRStep[] = []
  let runeSetCD: number | undefined = undefined

  for (const [perkName, perkAmount] of Object.entries(perks)) {
    const data = CDR_PERK_DATA[perkName]
    if (!data || perkAmount <= 0) continue

    const passesFilter = data.runeFilter == null
      || (activeRuneName != null && data.runeFilter.includes(activeRuneName))

    if (data.runeSetCD != null && passesFilter) {
      runeSetCD = data.runeSetCD
    }

    if (data.runePct && passesFilter) {
      const totalPct = data.runePct * perkAmount
      const displayPct = Math.round(totalPct * 100)
      const multiplier = 1 / (1 + totalPct)
      runeSteps.push({ source: perkName, pct: displayPct, multiplier })
    }

    if (data.waPct) {
      const totalPct = data.waPct * perkAmount
      const displayPct = Math.round(totalPct * 100)
      const multiplier = 1 / (1 + totalPct)

      waSteps.push({
        source: perkName,
        pct: displayPct,
        multiplier
      })
    }

    if (data.waMultiplier) {
      const multiplier = data.waMultiplier(perkAmount)

      waSteps.push({
        source: perkName,
        pct: Math.round((1 - multiplier) * 100),
        multiplier,
        isMultiply: true
      })
    }
  }

  if (raceCooldownModifiers) {
    if (raceCooldownModifiers["RuneCDR"] != null) {
      const m = raceCooldownModifiers["RuneCDR"]
      runeSteps.push({ source: `${activeRaceName} (Race)`, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
    }
    if (raceCooldownModifiers["weaponArtCDR"] != null) {
      const m = raceCooldownModifiers["weaponArtCDR"]
      waSteps.push({ source: `${activeRaceName} (Race)`, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
    }
  }

  const runeCDR = Math.round(runeSteps.reduce((acc, s) => acc * s.multiplier, 1.0) * 10000) / 10000
  const waCDR   = Math.round(waSteps.reduce((acc, s) => acc * s.multiplier, 1.0) * 10000) / 10000

  return { runeCDR, waCDR, runeSetCD, runeBreakdown: runeSteps, waBreakdown: waSteps }
}

export function applyCD(baseCooldown: number, cdrMultiplier: number): number {
  return Math.floor(baseCooldown * cdrMultiplier)
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export interface BuildResult {
  stats: StatMap
  perks: Record<string, number>
  cdr: CDRResult
}

export function calcBuild(state: BuildState): BuildResult {
  const stats: StatMap = {}
  const perks: Record<string, number> = {}

  function addStats(s: StatMap | undefined) {
    if (!s) return
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue
      if (!STAT_KEYS.includes(k as StatKey)) continue
      const key = k as StatKey
      stats[key] = (stats[key] ?? 0) + v
    }
  }

  function addPerks(list: Array<{ name: string; amount: number }> | undefined) {
    if (!list) return
    for (const p of list) perks[p.name] = (perks[p.name] ?? 0) + p.amount
  }

  // Race
  const race = races.find(r => r.name === state.race)
  addStats(race?.statModifiers)

  // Guild
  const guild = getGuild(state.guild)
  if (guild) {
    const rank = getGuildRank(guild, state.guildRank)
    if (rank) {
      addStats(rank.stats)
      addPerks(rank.perks)
    }
  }

  // ── Armor parts with enchantments + upgrade ───────────────────────────────
  type ArmorSlotKey = 'upgradeHelmet' | 'upgradeChestplate' | 'upgradeLeggings'
  const armorSlots: Array<[string, ArmorPart["type"], EnchantSlot, ArmorSlotKey]> = [
    [state.helmet,     "Helmet",     "helmet",     "upgradeHelmet"],
    [state.chestplate, "Chestplate", "chestplate", "upgradeChestplate"],
    [state.leggings,   "Leggings",   "leggings",   "upgradeLeggings"],
  ]

  for (const [armorName, partType, enchSlot, upgradeKey] of armorSlots) {
    if (!armorName) continue
    const part = getArmorPart(armorName, partType)
    if (!part) continue

    const upgradeLevel = state[upgradeKey] ?? 0
    const upgradedStats = applyUpgrade(part.stats as StatMap, upgradeLevel)

    const basePerksForSlot: Record<string, number> = {}
    if (part.perkName) basePerksForSlot[part.perkName] = 1

    const enchNames = state.enchantments[enchSlot]
    const slotResult = applyEnchantmentsToSlot(upgradedStats, basePerksForSlot, enchNames)
    addStats(slotResult.stats)
    for (const [k, v] of Object.entries(slotResult.perks)) {
      perks[k] = (perks[k] ?? 0) + v
    }
  }

  // ── Ring with enchantments + upgrade ─────────────────────────────────────
  if (state.ring) {
    const ring = getRing(state.ring)
    if (ring) {
      const upgradeLevel = state.upgradeRing ?? 0
      const upgradedStats = applyUpgrade(ring.stats, upgradeLevel)
      const basePerksForRing: Record<string, number> = ring.perkName
        ? { [ring.perkName]: ring.perkAmount ?? 1 } : {}
      const slotResult = applyEnchantmentsToSlot(upgradedStats, basePerksForRing, state.enchantments.ring)
      addStats(slotResult.stats)
      for (const [k, v] of Object.entries(slotResult.perks)) {
        perks[k] = (perks[k] ?? 0) + v
      }
    }
  }

  // ── Rune with enchantments + upgrade ─────────────────────────────────────
  if (state.rune) {
    const rune = getRune(state.rune)
    if (rune) {
      const upgradeLevel = state.upgradeRune ?? 0
      const upgradedStats = applyUpgrade(rune.stats, upgradeLevel)
      const basePerksForRune: Record<string, number> = rune.perkName
        ? { [rune.perkName]: rune.perkAmount ?? 1 } : {}
      const slotResult = applyEnchantmentsToSlot(upgradedStats, basePerksForRune, state.enchantments.rune)
      addStats(slotResult.stats)
      for (const [k, v] of Object.entries(slotResult.perks)) {
        perks[k] = (perks[k] ?? 0) + v
      }
    }
  }

  const monk = isMonkGuild(state.guild)

  if (monk) {
    if (state.monkGlove) {
      const glove = getGlove(state.monkGlove)
      if (glove) {
        // Monk stat bonus: rank 2 = ×1.25, rank 3 = ×1.5
        const monkStatMult = isMonkGuild(state.guild)
          ? 1 + Math.max(0, state.guildRank - 1) * 0.25
          : 1
        // Monk perk bonus: rank 1 = +0, rank 2 = +1, rank 3 = +2  
        const monkPerkBonus = isMonkGuild(state.guild)
          ? Math.max(0, state.guildRank - 1)
          : 0

        const monkPct = Math.max(0, state.guildRank - 1) * 0.25
        const baseGloveStats = glove.stats as StatMap
        const gloveStats: StatMap = {}
        for (const [k, v] of Object.entries(baseGloveStats)) {
          if (v == null) continue
          const base = v as number
          if (base <= 0) { gloveStats[k as StatKey] = base; continue }
          const shrineMult = state.shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0
          gloveStats[k as StatKey] = Math.round(
            (base * shrineMult + base * monkPct + Number.EPSILON) * 100
          ) / 100
        }

        addStats(gloveStats)
        if (glove.perkName) perks[glove.perkName] = (perks[glove.perkName] ?? 0) + (glove.perkAmount ?? 1)
        const gp = (glove as any).perks as Array<{name:string;amount:number}> | undefined
        if (gp) {
          for (let i = 0; i < gp.length; i++) {
            const p = gp[i]
            // Chỉ perk đầu tiên (index 0) được bonus
            const bonus = i === 0 ? monkPerkBonus : 0
            perks[p.name] = (perks[p.name] ?? 0) + p.amount + bonus
          }
        }
      }
    }
    if (state.monkEssence) {
      const essence = getEssence(state.monkEssence)
      if (essence) {
        const essenceStats = state.shrineActive
          ? applyShrineToStats(essence.stats as StatMap, essence.tier)
          : essence.stats as StatMap
        addStats(essenceStats)
        if (essence.perkName) perks[essence.perkName] = (perks[essence.perkName] ?? 0) + (essence.perkAmount ?? 1)
        const ep = (essence as any).perks as Array<{name:string;amount:number}> | undefined
        if (ep) for (const p of ep) perks[p.name] = (perks[p.name] ?? 0) + p.amount
      }
    }
  } else {
    if (state.weaponBlade) {
      const blade = getBlade(state.weaponBlade)
      if (blade) {
        const bladeStats = state.shrineActive
          ? applyShrineToStats(blade.stats as StatMap, blade.tier)
          : blade.stats as StatMap
        addStats(bladeStats)
        if (blade.perkName) perks[blade.perkName] = (perks[blade.perkName] ?? 0) + (blade.perkAmount ?? 1)
        const bp = (blade as any).perks as Array<{name:string;amount:number}> | undefined
        if (bp) for (const p of bp) perks[p.name] = (perks[p.name] ?? 0) + p.amount
      }
    }
    if (state.weaponHandle) {
      const handle = getHandle(state.weaponHandle)
      if (handle) {
        const handleStats = state.shrineActive
          ? applyShrineToStats(handle.stats as StatMap, handle.tier)
          : handle.stats as StatMap
        addStats(handleStats)
        if (handle.perkName) perks[handle.perkName] = (perks[handle.perkName] ?? 0) + (handle.perkAmount ?? 1)
        const hp = (handle as any).perks as Array<{name:string;amount:number}> | undefined
        if (hp) for (const p of hp) perks[p.name] = (perks[p.name] ?? 0) + p.amount
      }
    }
  }

  // Infusion slots (no upgrade on infusions)
  if (state.infusionHelmet) {
    const part = getArmorPart(state.infusionHelmet, "Helmet")
    if (part) {
      const basePerks: Record<string, number> = part.perkName ? { [part.perkName]: 1 } : {}
      const inf = applyInfusion(part.stats as StatMap, basePerks)
      addStats(inf.stats)
      for (const [k, v] of Object.entries(inf.perks)) perks[k] = (perks[k] ?? 0) + v
    }
  }

  if (state.infusionChestplate) {
    const part = getArmorPart(state.infusionChestplate, "Chestplate")
    if (part) {
      const basePerks: Record<string, number> = part.perkName ? { [part.perkName]: 1 } : {}
      const inf = applyInfusion(part.stats as StatMap, basePerks)
      addStats(inf.stats)
      for (const [k, v] of Object.entries(inf.perks)) perks[k] = (perks[k] ?? 0) + v
    }
  }

  if (state.infusionLeggings) {
    const part = getArmorPart(state.infusionLeggings, "Leggings")
    if (part) {
      const basePerks: Record<string, number> = part.perkName ? { [part.perkName]: 1 } : {}
      const inf = applyInfusion(part.stats as StatMap, basePerks)
      addStats(inf.stats)
      for (const [k, v] of Object.entries(inf.perks)) perks[k] = (perks[k] ?? 0) + v
    }
  }

  if (state.infusionRing) {
    const ring = getRing(state.infusionRing)
    if (ring) {
      const basePerks: Record<string, number> = ring.perkName ? { [ring.perkName]: ring.perkAmount ?? 1 } : {}
      const inf = applyInfusion(ring.stats, basePerks)
      addStats(inf.stats)
      for (const [k, v] of Object.entries(inf.perks)) perks[k] = (perks[k] ?? 0) + v
    }
  }

  // Round stats and filter zeros
  const finalStats: StatMap = {}
  for (const [k, v] of Object.entries(stats)) {
    const rounded = Math.round((v + Number.EPSILON) * 100) / 100
    if (rounded !== 0) finalStats[k as StatKey] = rounded
  }

  const cursedStacks = perks["Cursed"] ?? 0
  const perkEffectivenessStacks = perks["Perk Effectiveness"] ?? 0

  let finalPerks: Record<string, number> = {}
  for (const [k, v] of Object.entries(perks)) {
    const rounded = Math.round((v + Number.EPSILON) * 100) / 100
    if (rounded !== 0) finalPerks[k] = rounded
  }

  if (perkEffectivenessStacks > 0 || cursedStacks > 0) {
    finalPerks = applyPerkEffectiveness(finalPerks, perkEffectivenessStacks, cursedStacks)
    for (const k of Object.keys(finalPerks)) {
      finalPerks[k] = Math.round((finalPerks[k] + Number.EPSILON) * 100) / 100
    }
  }

    // Buckler grants an equal amount of Parry
  if (finalPerks["Buckler"] != null) {
    finalPerks["Parry"] = (finalPerks["Parry"] ?? 0) + finalPerks["Buckler"]
  }

  const cdr = calcCDR(finalPerks, race?.cooldownModifiers, state.rune || undefined, state.race || undefined)

  // Apply Stat Boost perks (summary only)
  const boostedStats = applyStatBoostPerks(finalStats, finalPerks)

  return { stats: boostedStats, perks: finalPerks, cdr }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatStat(key: string, value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100
  const abs = Math.abs(rounded)
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, "")
  const sign = rounded >= 0 ? "+" : "-"
  return PERCENT_STATS.has(key) ? `${sign}${formatted}%` : `${sign}${formatted}`
}

export function formatLabel(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase())
}

export function isExclusiveEnchant(e: Enchantment | undefined): boolean {
  return e?.stacking === "exclusive"
}

export function enforceEnchantSlot(
  selections: [string, string, string],
  changedIndex: number
): [string, string, string] {
  let s: [string, string, string] = [...selections] as [string, string, string]
  const changed = s[changedIndex]

  if (changed) {
    for (let i = 0; i < 3; i++) {
      if (i !== changedIndex && s[i] === changed) {
        s[i] = ""
      }
    }
  }

  const exclusiveIdx = s.findIndex(n => isExclusiveEnchant(getEnchant(n)))
  if (exclusiveIdx !== -1) {
    const exclusiveName = s[exclusiveIdx]
    return [exclusiveName, "", ""]
  }

  const filled = s.filter(Boolean)
  return [
    filled[0] ?? "",
    filled[1] ?? "",
    filled[2] ?? "",
  ]
}