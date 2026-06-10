import type {
  Race, Guild, GuildRank, Armor, ArmorPart, Ring, Rune,
  Enchantment, Perk, StatMap, StatKey, StatModifier, EnchantSlot, BuildState,
  WeaponBlade, WeaponHandle, MonkGlove, MonkEssence
} from './types'
import { STAT_KEYS, PERCENT_STATS, applyUpgrade } from './types'
import { CDR_PERK_DATA } from '../data/cdr'
import { applyStatBoostPerks } from '../data/statboost'
import { getActiveBuildBuffs, getPerkBuffs, getWeaponArtBuffs, applyBuffPerkModifiers } from '../data/BuffData'

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
import { calcCrit } from './crit'
import type { CritResult } from './crit'

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

import { BOOST_DEF_MAP } from '../data/Boost'
import type { BoostEntry, BoostResult } from './types'

// Re-usable fast inline rounding utility
const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100

const RACE_MAP = Object.fromEntries(races.map(r => [r.name, r]))
const GUILD_MAP = Object.fromEntries(guilds.map(g => [g.name, g]))
const PERK_MAP = Object.fromEntries(perks.map(p => [p.name, p]))
const ENCHANT_MAP = Object.fromEntries(enchantments.map(e => [e.name, e]))
const RING_MAP = Object.fromEntries(rings.map(r => [r.name, r]))
const RUNE_MAP = Object.fromEntries(runes.map(r => [r.name, r]))
const ARMOR_MAP = Object.fromEntries(armorsRaw.map((a: any) => [
  a.name, 
  {
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
  } as Armor
]))
const BLADE_MAP = Object.fromEntries(blades.map(b => [b.name, b]))
const HANDLE_MAP = Object.fromEntries(handles.map(h => [h.name, h]))
const GLOVE_MAP = Object.fromEntries(gloves.map(g => [g.name, g]))
const ESSENCE_MAP = Object.fromEntries(essences.map(e => [e.name, e]))

export const armors: Armor[] = Object.values(ARMOR_MAP)

export function getRace(name: string): Race | undefined { return RACE_MAP[name] }
export function getPerk(name: string) { return PERK_MAP[name] }
export function getEnchant(name: string) { return ENCHANT_MAP[name] }
export function getRing(name: string) { return RING_MAP[name] }
export function getRune(name: string) { return RUNE_MAP[name] }
export function getArmor(name: string): Armor | undefined { return ARMOR_MAP[name] }
export function getBlade(name: string) { return BLADE_MAP[name] }
export function getHandle(name: string) { return HANDLE_MAP[name] }
export function getGlove(name: string) { return GLOVE_MAP[name] }
export function getEssence(name: string) { return ESSENCE_MAP[name] }
export function getGuild(name: string): Guild | undefined { return GUILD_MAP[name] }

export function getArmorPart(name: string, type: ArmorPart["type"]) {
  const armor = getArmor(name)
  if (!armor) return undefined
  for (let i = 0; i < armor.parts.length; i++) {
    if (armor.parts[i].type === type) return armor.parts[i]
  }
  return undefined
}
export function getGuildRank(guild: Guild, rank: number): GuildRank | undefined {
  for (let i = 0; i < guild.ranks.length; i++) {
    if (guild.ranks[i].rank === rank) return guild.ranks[i]
  }
  return undefined
}

export function isMonkGuild(guildName: string): boolean {
  return guildName === "Monk"
}

export function calcBoosts(perks: Record<string, number>, emotionalState?: string, level: number = 80, naturalCritChance: number = 0, jumpBoost: number = 0, summonCount: number = 0, ragePotency: number = 0): BoostResult {
  const dmgMap = new Map<string, BoostEntry>()
  const healMap = new Map<string, BoostEntry>()

  const lvlMult = Math.round((1 + Math.max(0, Math.min(80, level)) / 80) * 10000) / 10000
  dmgMap.set('Level Damage', {
    sourceName: 'Level Damage',
    rawMultiplier: lvlMult,
    condition: `LV0 → ×1.0 · LV80 → ×2.0`,
    type: 'dmg',
  })

  for (const perkName in perks) {
    if (!Object.prototype.hasOwnProperty.call(perks, perkName)) continue
    const perkAmount = perks[perkName]
    if (perkAmount <= 0) continue
    
    const def = BOOST_DEF_MAP.get(perkName)
    if (!def || def.isLevel) continue

    if (perkName === 'Emotional' && def.type === 'heal' && emotionalState !== 'both') continue

    const rawMult = 1 + def.multiplierPerPerk * perkAmount
    const entry: BoostEntry = {
      sourceName: perkName,
      rawMultiplier: rawMult,
      condition: def.condition,
      type: def.type,
    }

    if (def.type === 'dmg') dmgMap.set(perkName, entry)
    else healMap.set(perkName, entry)
  }
  
  const primalStacks = perks['Primal'] ?? 0
  if (primalStacks > 0 && naturalCritChance > 0) {
    const primalMult = 1 + (naturalCritChance * primalStacks) / 100
    dmgMap.set('Primal', {
      sourceName: 'Primal',
      rawMultiplier: Math.round(primalMult * 10000) / 10000,
      condition: `${naturalCritChance.toFixed(1)}% nat. crit × ${primalStacks} stack`,
      type: 'dmg',
    })
  }

  const springPoweredStacks = perks['Spring Powered'] ?? 0
  if (springPoweredStacks > 0 && jumpBoost > 0) {
    const springMult = 1 + (jumpBoost * 0.0075 * springPoweredStacks)
    dmgMap.set('Spring Powered', {
      sourceName: 'Spring Powered',
      rawMultiplier: Math.round(springMult * 10000) / 10000,
      condition: `${jumpBoost} jump boost × ${springPoweredStacks} stack × 0.75%`,
      type: 'dmg',
    })
  }

  if ((perks['Thief Training'] ?? 0) > 0) {
    dmgMap.set('Thief Training (behind)', {
      sourceName: 'Thief Training (behind)',
      rawMultiplier: 1.20,
      condition: 'attacking from behind',
      type: 'dmg',
    })
    dmgMap.set('Thief Training (would-crit bonus)', {
      sourceName: 'Thief Training (would-crit bonus)',
      rawMultiplier: 1.30,
      condition: 'if attack would have crit without perk',
      type: 'dmg',
    })
  }

  const oceansRageStacks = perks['Oceans Rage'] ?? 0
  if (oceansRageStacks > 0) {
    const mult = Math.round((1 + oceansRageStacks * 0.1) * 10000) / 10000
    healMap.set('Oceans Rage', {
      sourceName: 'Oceans Rage',
      rawMultiplier: mult,
      condition: `${oceansRageStacks} stack × 10% outgoing heal`,
      type: 'heal',
    })
  }
  
  const vassalsCroakStacks = Math.floor(perks['Vassals Croak'] ?? 0)
  if (vassalsCroakStacks > 0 && summonCount > 0) {
    const clampedCount = Math.floor(summonCount)
    const mult = 1 + 0.02 * clampedCount * vassalsCroakStacks
    dmgMap.set("Vassals Croak", {
      sourceName: "Vassals Croak",
      rawMultiplier: Math.round(mult * 100) / 100,
      condition: `${clampedCount} summons × ${vassalsCroakStacks} stack × 2%`,
      type: 'dmg',
    })
  }

  const frenzyStacks = perks['Frenzy'] ?? 0
  if (frenzyStacks > 0 && ragePotency > 0) {
    const frenzyPct = (0.05 + 0.1667 * ragePotency) * frenzyStacks
    dmgMap.set('Frenzy', {
      sourceName: 'Frenzy',
      rawMultiplier: Math.round((1 + frenzyPct) * 10000) / 10000,
      condition: `Rage active · potency ${Math.round(ragePotency * 1000) / 1000}`,
      type: 'dmg',
    })
  }

  const dmgEntries = [...dmgMap.values()]
  const healEntries = [...healMap.values()]

  let dmgFinal = 1.0
  for (let i = 0; i < dmgEntries.length; i++) dmgFinal *= dmgEntries[i].rawMultiplier

  let healFinal = 1.0
  for (let i = 0; i < healEntries.length; i++) healFinal *= healEntries[i].rawMultiplier

  return {
    dmgEntries,
    healEntries,
    dmgFinalMultiplier: Math.round(dmgFinal * 10000) / 10000,
    healFinalMultiplier: Math.round(healFinal * 10000) / 10000,
  }
  
}

export function applyMonkGuildBonus(stats: StatMap, glovePerks: Array<{name: string; amount: number}>, monkRank: number): { stats: StatMap; perkBonus: number } {
  const statMult = 1 + Math.max(0, monkRank - 1) * 0.25
  const boostedStats: StatMap = {}
  
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    const v = stats[k]
    if (v == null) continue
    boostedStats[k] = v > 0 ? round2(v * statMult) : v
  }
  return { stats: boostedStats, perkBonus: monkRank }
}

function applyMod(value: number, mod: StatModifier): number {
  return mod.type === "multiplier" ? value * mod.value : value + mod.value
}

function normalizeModifiers(m: StatModifier | StatModifier[]): StatModifier[] {
  return Array.isArray(m) ? m : [m]
}

export function applyEnchantmentsToSlot(baseStats: StatMap, basePerks: Record<string, number>, enchantNames: string[]): { stats: StatMap; perks: Record<string, number> } {
  const ordered = [...enchantNames].reverse()
  const mult: Partial<Record<StatKey, number>> = {}
  const add: Partial<Record<StatKey, number>> = {}
  const perks = { ...basePerks }

  for (let i = 0; i < ordered.length; i++) {
    const name = ordered[i]
    if (!name) continue
    const e = getEnchant(name)
    if (!e) continue
    const es = e.stats

    if (es.positiveStats) {
      const mods = normalizeModifiers(es.positiveStats as StatModifier | StatModifier[])
      for (let j = 0; j < STAT_KEYS.length; j++) {
        const key = STAT_KEYS[j]
        if ((baseStats[key] ?? 0) > 0) {
          for (let m = 0; m < mods.length; m++) {
            if (mods[m].type === 'multiplier') mult[key] = (mult[key] ?? 1) * mods[m].value
            else add[key] = (add[key] ?? 0) + mods[m].value
          }
        }
      }
    }

    if (es.negativeStats) {
      const mods = normalizeModifiers(es.negativeStats as StatModifier | StatModifier[])
      for (let j = 0; j < STAT_KEYS.length; j++) {
        const key = STAT_KEYS[j]
        if ((baseStats[key] ?? 0) < 0) {
          for (let m = 0; m < mods.length; m++) {
            if (mods[m].type === 'multiplier') mult[key] = (mult[key] ?? 1) * mods[m].value
            else add[key] = (add[key] ?? 0) + mods[m].value
          }
        }
      }
    }

    if (es.defenseStats) {
      const mods = normalizeModifiers(es.defenseStats as StatModifier | StatModifier[])
      for (let j = 0; j < STAT_KEYS.length; j++) {
        const key = STAT_KEYS[j]
        if (key.endsWith('Defense') && (baseStats[key] ?? 0) > 0) {
          for (let m = 0; m < mods.length; m++) {
            if (mods[m].type === 'multiplier') mult[key] = (mult[key] ?? 1) * mods[m].value
            else add[key] = (add[key] ?? 0) + mods[m].value
          }
        }
      }
    }

    if (es.perks) {
      const mods = normalizeModifiers(es.perks as StatModifier | StatModifier[])
      for (const perkName in perks) {
        if (!Object.prototype.hasOwnProperty.call(perks, perkName)) continue
        let v = perks[perkName]
        for (let m = 0; m < mods.length; m++) v = applyMod(v, mods[m])
        perks[perkName] = v
      }
    }

    for (let j = 0; j < STAT_KEYS.length; j++) {
      const key = STAT_KEYS[j]
      const modifier = es[key]
      if (!modifier) continue
      const mods = normalizeModifiers(modifier as StatModifier | StatModifier[])
      for (let m = 0; m < mods.length; m++) {
        if (mods[m].type === 'multiplier') mult[key] = (mult[key] ?? 1) * mods[m].value
        else add[key] = (add[key] ?? 0) + mods[m].value
      }
    }

    if (e.effects) {
      for (let j = 0; j < e.effects.length; j++) {
        const eff = e.effects[j]
        perks[eff.name] = (perks[eff.name] ?? 0) + eff.value
      }
    }
  }

  const stats: StatMap = {}
  for (let j = 0; j < STAT_KEYS.length; j++) {
    const key = STAT_KEYS[j]
    const base = baseStats[key] ?? 0
    const m = mult[key] ?? 1
    const a = add[key] ?? 0
    const result = base * m + a
    if (result !== 0) stats[key] = result
  }

  return { stats, perks }
}

const ENCHANT_EFFECT_PERK_NAMES = new Set(
  (enchantmentsRaw as Enchantment[]).flatMap(e => (e.effects ?? []).map(ef => ef.name))
)

const PERK_EFFECTIVENESS_EXEMPT = new Set([
  ...ENCHANT_EFFECT_PERK_NAMES,
  "Cursed", "Luminescent Fervor", "Valor", "Spirit Commune",
  "Channeled Weapon", "Quickcast", "Thief Training", "Vampire",
])

export function applyPerkEffectiveness(perks: Record<string, number>, perkEffectivenessStacks: number, cursedStacks: number): Record<string, number> {
  if (perkEffectivenessStacks <= 0 && cursedStacks <= 0) return perks
  const multiplier = (1 + perkEffectivenessStacks * 0.1) * (1 + cursedStacks * 0.1)
  const result: Record<string, number> = {}
  for (const name in perks) {
    if (Object.prototype.hasOwnProperty.call(perks, name)) {
      result[name] = PERK_EFFECTIVENESS_EXEMPT.has(name) ? perks[name] : perks[name] * multiplier
    }
  }
  return result
}

export function applyInfusion(baseStats: StatMap, basePerks: Record<string, number>): { stats: StatMap; perks: Record<string, number> } {
  const stats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    const v = baseStats[k]
    if (v != null) stats[k] = v * 0.5
  }
  return { stats, perks: { ...basePerks } }
}

export const SHRINE_MULTIPLIERS: Record<number, number> = {
  1: 3.0, 2: 1.7, 3: 1.4, 4: 1.1, 5: 1.0,
}

export function applyShrineToScalings(scalings: Record<string, number>, tier: number): Record<string, number> {
  const mult = SHRINE_MULTIPLIERS[tier] ?? 1.0
  if (mult === 1.0) return { ...scalings }
  const result: Record<string, number> = {}
  for (const k in scalings) {
    if (Object.prototype.hasOwnProperty.call(scalings, k)) {
      result[k] = scalings[k] * mult
    }
  }
  return result
}

export function applyShrineToStats(stats: StatMap | undefined | null, tier: number): StatMap {
  if (!stats) return {}
  const mult = SHRINE_MULTIPLIERS[tier] ?? 1.0
  const result: StatMap = {}
  
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    const v = stats[k]
    if (v == null) continue
    if (mult === 1.0) {
      result[k] = v
    } else {
      result[k] = v > 0 ? round2(v * mult) : v
    }
  }
  return result
}

export function checkHybrid(part1: { [key: string]: any } | undefined, part2: { [key: string]: any } | undefined): boolean {
  if (!part1 || !part2) return false
  const scaleKeys = ["dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling","earthScaling","airScaling","hexScaling","holyScaling","summonScaling"]
  const s1 = part1.stats ?? part1
  const s2 = part2.stats ?? part2
  
  let p1Has = false, p2Has = false
  const scalings1 = new Set<string>()
  
  for (let i = 0; i < scaleKeys.length; i++) {
    const k = scaleKeys[i]
    if (s1[k] != null && s1[k] !== 0) { scalings1.add(k); p1Has = true }
    if (s2[k] != null && s2[k] !== 0) p2Has = true
  }
  if (!p1Has || !p2Has) return false

  for (let i = 0; i < scaleKeys.length; i++) {
    const k = scaleKeys[i]
    if (s2[k] != null && s2[k] !== 0 && scalings1.has(k)) return false
  }
  return true
}

const WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Medium Handle": { "Small Blade": "Dagger", "Medium Blade": "1-Handed Sword", "Heavy Blade": "Unbalanced Sword", "Hammer Head": "Mallet" },
  "Long Handle": { "Small Blade": "Dagger", "Medium Blade": "2-Handed Sword", "Heavy Blade": "Greatsword", "Hammer Head": "Mallet" },
  "Pole": { "Small Blade": "Spear", "Medium Blade": "Spear", "Heavy Blade": "Great Spear", "Hammer Head": "War Hammer" },
}

export function getWeaponType(handleType: string, bladeType: string): string {
  return WEAPON_TYPE_MAP[handleType]?.[bladeType] ?? ""
}

export function resolveWeaponType(handleType: string, bladeType: string, perks: Record<string, number>): { base: string; final: string; modifier: string } {
  const base = getWeaponType(handleType, bladeType)
  if (!base) return { base: "", final: "", modifier: "" }
  if ((perks["Kama Blades"] ?? 0) > 0) {
    if (base === "Dagger") return { base, final: "Dual Kamas", modifier: "Kama Blades" }
    if (base === "Spear") return { base, final: "Scythe", modifier: "Kama Blades" }
  }
  if (bladeType === "Hammer Head") {
    if ((perks["Artillery Mage"] ?? 0) > 0) return { base, final: "Artillery Mage", modifier: "Artillery Mage" }
    if ((perks["Stratos Winds"] ?? 0) > 0) return { base, final: "Stratos Winds", modifier: "Stratos Winds" }
    if ((perks["Storm Caster"] ?? 0) > 0) return { base, final: "Storm Caster", modifier: "Storm Caster" }
    if ((perks["Virulent Core"] ?? 0) > 0) return { base, final: "Virulent Core", modifier: "Virulent Core" }
  }
  if ((perks["Dual Wielding"] ?? 0) > 0) {
    if (bladeType === "Small Blade") return { base, final: "Dual Wielding Daggers", modifier: "Dual Wielding" }
    if (bladeType === "Medium Blade") return { base, final: "Dual Swords", modifier: "Dual Wielding" }
    if (bladeType === "Heavy Blade") return { base, final: "Dual Unbalanced Swords", modifier: "Dual Wielding" }
    if (bladeType === "Hammer Head") return { base, final: "Dual Mallets", modifier: "Dual Wielding" }
  }
  if ((perks["Lance"] ?? 0) > 0 && (handleType === "Long Handle" || handleType === "Medium Handle")) {
    return { base, final: "Lance", modifier: "Lance" }
  }
  if ((perks["Duelist Stance"] ?? 0) > 0 && bladeType === "Medium Blade") return { base, final: "Rapier", modifier: "Duelist Stance" }
  if ((perks["Saw Stance"] ?? 0) > 0 && bladeType === "Medium Blade") return { base, final: "Chainsaw", modifier: "Saw Stance" }

  return { base, final: base, modifier: "" }
}

const MONK_WEAPON_TYPE_MAP: Record<string, Record<string, string>> = {
  "Monk Essence": { "Gloves": "Fists", "Shield": "Shield" },
  "Essence": { "Gloves": "Fists", "Shield": "Shield" }
}

export function getMonkWeaponType(essenceType: string, gloveType: string): string {
  return MONK_WEAPON_TYPE_MAP[essenceType]?.[gloveType] ?? "Fists"
}

export function resolveMonkWeaponType(essenceType: string, gloveType: string, perks: Record<string, number>): { base: string; final: string; modifier: string } {
  const base = getMonkWeaponType(essenceType, gloveType)
  if ((perks["Saw Heart"] ?? 0) > 0 && base === "Fists") return { base, final: "Chain Fists", modifier: "Saw Heart" }
  if ((perks["Locked And Loaded"] ?? 0) > 0 && base === "Fists") return { base, final: "Fists + Gun", modifier: "Locked And Loaded" }
  return { base, final: base, modifier: "" }
}

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
  baseScalings: Record<string, number>
}

function extractDamageAndScalings(part: any) {
  const dtKeys = ["trueType","physicalType","magicType","fireType","waterType","earthType","airType","hexType","holyType","summonType"]
  const scaleKeys = ["dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling","earthScaling","airScaling","hexScaling","holyScaling","summonScaling"]
  
  const damageTypes: Record<string, number> = {}
  const rawScalings: Record<string, number> = {}
  const rawStats: StatMap = {}
  
  if (!part) return { damageTypes, rawScalings, rawStats }
  const src = part.stats ?? part
  
  for (let i = 0; i < dtKeys.length; i++) {
    const key = dtKeys[i]
    if (src[key]) damageTypes[key.replace("Type", "")] = src[key]
  }
  for (let i = 0; i < scaleKeys.length; i++) {
    const key = scaleKeys[i]
    if (src[key]) rawScalings[key.replace("Scaling", "")] = src[key]
  }
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (src[k] != null) rawStats[k] = src[k]
  }
  return { damageTypes, rawScalings, rawStats }
}

function calcWeaponGeneric(part1: WeaponBlade | MonkGlove | null, part2: WeaponHandle | MonkEssence | null, part1TypeLabel: string, part2TypeLabel: string, part1TypeKey: string, part2TypeKey: string, isMonk: boolean, shrineActive: boolean): WeaponResult | null {
  if (!part1 && !part2) return null

  const perks: Record<string, number> = {}
  const speedParts: number[] = []

  const processPartPerks = (part: any) => {
    if (!part) return
    if (part.attackSpeed != null) speedParts.push(part.attackSpeed)
    if (part.perkName) perks[part.perkName] = (perks[part.perkName] ?? 0) + (part.perkAmount ?? 1)
    if (part.perks) {
      for (let i = 0; i < part.perks.length; i++) {
        perks[part.perks[i].name] = (perks[part.perks[i].name] ?? 0) + part.perks[i].amount
      }
    }
  }
  processPartPerks(part1)
  processPartPerks(part2)

  let attackSpeed = 1.0
  if (speedParts.length > 0) {
    let sum = 0
    for (let i = 0; i < speedParts.length; i++) sum += speedParts[i]
    attackSpeed = sum / speedParts.length
  }

  const p1Data = extractDamageAndScalings(part1)
  const p2Data = extractDamageAndScalings(part2)

  const damageTypes: Record<string, number> = { ...p1Data.damageTypes }
  for (const k in p2Data.damageTypes) {
    if (Object.prototype.hasOwnProperty.call(p2Data.damageTypes, k)) {
      damageTypes[k] = (damageTypes[k] ?? 0) + p2Data.damageTypes[k]
    }
  }

  const part1FinalScalings = shrineActive && part1 ? applyShrineToScalings(p1Data.rawScalings, part1.tier) : { ...p1Data.rawScalings }
  const part2FinalScalings = shrineActive && part2 ? applyShrineToScalings(p2Data.rawScalings, part2.tier) : { ...p2Data.rawScalings }

  const part1FinalStats = shrineActive && part1 ? applyShrineToStats(part1.stats as StatMap, part1.tier) : { ...p1Data.rawStats }
  const part2FinalStats = shrineActive && part2 ? applyShrineToStats(part2.stats as StatMap, part2.tier) : { ...p2Data.rawStats }

  const hybridActive = checkHybrid(part1 ?? undefined, part2 ?? undefined)
  const mergedScalings: Record<string, number> = {}
  for (const k in part1FinalScalings) {
    if (Object.prototype.hasOwnProperty.call(part1FinalScalings, k)) mergedScalings[k] = (mergedScalings[k] ?? 0) + part1FinalScalings[k]
  }
  for (const k in part2FinalScalings) {
    if (Object.prototype.hasOwnProperty.call(part2FinalScalings, k)) mergedScalings[k] = (mergedScalings[k] ?? 0) + part2FinalScalings[k]
  }
  
  const scalings: Record<string, number> = { ...mergedScalings }
  if (hybridActive) {
    for (const k in scalings) {
      if (Object.prototype.hasOwnProperty.call(scalings, k)) scalings[k] *= 1.5
    }
  }

  const combinedStats: StatMap = {}
  const mergeStats = (s: StatMap) => {
    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i]
      if (s[k] != null) combinedStats[k] = (combinedStats[k] ?? 0) + (s[k] ?? 0)
    }
  }
  mergeStats(part1FinalStats)
  mergeStats(part2FinalStats)

  const finalStats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (combinedStats[k] != null) {
      const rounded = round2(combinedStats[k] ?? 0)
      if (rounded !== 0) finalStats[k] = rounded
    }
  }

  const p1Type = (part1 as any)?.[part1TypeKey] ?? ""
  const p2Type = (part2 as any)?.[part2TypeKey] ?? ""
  let weaponType = "", finalWeaponType = "", weaponModifier = ""

  if (p1Type && p2Type) {
    const resolved = isMonk ? resolveMonkWeaponType(p2Type, p1Type, perks) : resolveWeaponType(p2Type, p1Type, perks)
    weaponType = resolved.base
    finalWeaponType = resolved.final
    weaponModifier = resolved.modifier
  }

  return {
    part1DamageTypes: p1Data.damageTypes,
    part2DamageTypes: p2Data.damageTypes,
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
    attackSpeed: round2(attackSpeed),
    damageTypes,
    part1RawScalings: p1Data.rawScalings,
    part2RawScalings: p2Data.rawScalings,
    part1RawStats: p1Data.rawStats,
    part2RawStats: p2Data.rawStats,
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
    bladeRawScalings: p1Data.rawScalings,
    handleRawScalings: p2Data.rawScalings,
    bladeRawStats: p1Data.rawStats,
    handleRawStats: p2Data.rawStats,
    bladeFinalScalings: part1FinalScalings,
    handleFinalScalings: part2FinalScalings,
    bladeFinalStats: part1FinalStats,
    handleFinalStats: part2FinalStats,
    baseScalings: mergedScalings,
  }
}

export function calcWeapon(bladeName: string, handleName: string, shrineActive: boolean = false): WeaponResult | null {
  return calcWeaponGeneric(getBlade(bladeName) ?? null, getHandle(handleName) ?? null, "Blade", "Handle", "bladeType", "handleType", false, shrineActive)
}

export function calcMonkWeapon(gloveName: string, essenceName: string, shrineActive: boolean = false, monkRank: number = 1): WeaponResult | null {
  const glove = getGlove(gloveName)
  const result = calcWeaponGeneric(glove ?? null, getEssence(essenceName) ?? null, "Glove", "Essence", "gloveType", "essenceType", true, shrineActive)
  if (!result) return null

  const monkPerkBonus = Math.max(0, monkRank - 1)
  if (monkPerkBonus > 0 && glove) {
    const monkPct = monkPerkBonus * 0.25
    const baseGloveStats = glove.stats as StatMap
    const shrineMult = shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0

    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i]
      const baseV = baseGloveStats[k]
      if (baseV == null || baseV <= 0) continue
      const wrongVal = round2(baseV * shrineMult)
      const correctVal = round2(baseV * shrineMult + baseV * monkPct)
      const diff = round2(correctVal - wrongVal)
      if (diff !== 0) result.stats[k] = round2((result.stats[k] ?? 0) + diff)
      result.part1FinalStats[k] = correctVal
      result.part1RawStats[k] = baseV
    }
    const gp = (glove as any).perks as Array<{name:string;amount:number}> | undefined
    if (gp && gp.length > 0) result.perks[gp[0].name] = (result.perks[gp[0].name] ?? 0) + monkPerkBonus
  }
  return result
}

export interface CDRStep { source: string; pct: number; multiplier: number; isMultiply?: boolean }
export interface CDRResult { runeCDR: number; waCDR: number; runeSetCD?: number; runeBreakdown: CDRStep[]; waBreakdown: CDRStep[] }

export function calcCDR(perks: Record<string, number>, raceCooldownModifiers?: Record<string, number>, activeRuneName?: string, activeRaceName?: string, emotionalState?:'buffs' | 'debuffs' | 'both'): CDRResult {
  const runeSteps: CDRStep[] = []
  const waSteps: CDRStep[] = []
  
  const emotionalAmt = perks["Emotional"] ?? 0
  if (emotionalAmt > 0 && emotionalState === 'buffs') {
    const totalPct = 0.5 * emotionalAmt
    waSteps.push({ source: "Emotional (Only Buffs)", pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
  }
  let runeSetCD: number | undefined = undefined

  for (const perkName in perks) {
    if (!Object.prototype.hasOwnProperty.call(perks, perkName)) continue
    const perkAmount = perks[perkName]
    const data = CDR_PERK_DATA[perkName]
    if (!data || perkAmount <= 0) continue

    const passesFilter = data.runeFilter == null || (activeRuneName != null && data.runeFilter.includes(activeRuneName))
    if (data.runeSetCD != null && passesFilter) runeSetCD = data.runeSetCD

    if (data.runePct && passesFilter) {
      const totalPct = data.runePct * perkAmount
      runeSteps.push({ source: perkName, pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
    }
    if (data.runeMultiplier) {
      const m = data.runeMultiplier(perkAmount)
      runeSteps.push({ source: perkName, pct: Math.round((m - 1) * 100), multiplier: m, isMultiply: true })
    }
    if (data.waPct) {
      const totalPct = data.waPct * perkAmount
      waSteps.push({ source: perkName, pct: Math.round(totalPct * 100), multiplier: 1 / (1 + totalPct) })
    }
    if (data.waMultiplier) {
      const m = data.waMultiplier(perkAmount)
      waSteps.push({ source: perkName, pct: Math.round((1 - m) * 100), multiplier: m, isMultiply: true })
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

  let rCDR = 1.0
  for (let i = 0; i < runeSteps.length; i++) rCDR *= runeSteps[i].multiplier
  let wCDR = 1.0
  for (let i = 0; i < waSteps.length; i++) wCDR *= waSteps[i].multiplier

  return {
    runeCDR: Math.round(rCDR * 10000) / 10000,
    waCDR: Math.round(wCDR * 10000) / 10000,
    runeSetCD, runeBreakdown: runeSteps, waBreakdown: waSteps
  }
}

export function applyCD(baseCooldown: number, cdrMultiplier: number): number { return Math.floor(baseCooldown * cdrMultiplier) }
export function calcLevelDamageMultiplier(level: number): number { return Math.round((1 + Math.max(0, Math.min(80, level)) / 80) * 1000) / 1000 }

export interface BuildResult { stats: StatMap; perks: Record<string, number>; cdr: CDRResult; boosts: BoostResult; crit: CritResult }

export function calcBuild(state: BuildState): BuildResult {
  const stats: StatMap = {}
  const perks: Record<string, number> = {}

  // High performance internal accumulators without Object.entries allocation
  const addStats = (s: StatMap | undefined | null) => {
    if (!s) return
    for (let i = 0; i < STAT_KEYS.length; i++) {
      const k = STAT_KEYS[i]
      if (s[k] != null) stats[k] = (stats[k] ?? 0) + (s[k] ?? 0)
    }
  }
  const addPerks = (list: Array<{ name: string; amount: number }> | undefined) => {
    if (!list) return
    for (let i = 0; i < list.length; i++) {
      perks[list[i].name] = (perks[list[i].name] ?? 0) + list[i].amount
    }
  }
  const addPerkMap = (map: Record<string, number>) => {
    for (const k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        perks[k] = (perks[k] ?? 0) + map[k]
      }
    }
  }

  addStats(getRace(state.race)?.statModifiers)

  const guild = getGuild(state.guild)
  if (guild) {
    const rank = getGuildRank(guild, state.guildRank)
    if (rank) {
      addStats(rank.stats)
      addPerks(rank.perks)
    }
  }

  const armorSlots: Array<[string, ArmorPart["type"], EnchantSlot, 'upgradeHelmet' | 'upgradeChestplate' | 'upgradeLeggings']> = [
    [state.helmet, "Helmet", "helmet", "upgradeHelmet"],
    [state.chestplate, "Chestplate", "chestplate", "upgradeChestplate"],
    [state.leggings, "Leggings", "leggings", "upgradeLeggings"],
  ]

  for (let i = 0; i < armorSlots.length; i++) {
    const [armorName, partType, enchSlot, upgradeKey] = armorSlots[i]
    if (!armorName) continue
    const part = getArmorPart(armorName, partType)
    if (!part) continue

    const slotResult = applyEnchantmentsToSlot(
      applyUpgrade(part.stats as StatMap, state[upgradeKey] ?? 0), 
      part.perkName ? { [part.perkName]: 1 } : {}, 
      state.enchantments[enchSlot]
    )
    addStats(slotResult.stats)
    addPerkMap(slotResult.perks)
  }

  if (state.ring) {
    const ring = getRing(state.ring)
    if (ring) {
      const slotResult = applyEnchantmentsToSlot(
        applyUpgrade(ring.stats, state.upgradeRing ?? 0), 
        ring.perkName ? { [ring.perkName]: ring.perkAmount ?? 1 } : {}, 
        state.enchantments.ring
      )
      addStats(slotResult.stats)
      addPerkMap(slotResult.perks)
    }
  }

  if (state.rune) {
    const rune = getRune(state.rune)
    if (rune) {
      const slotResult = applyEnchantmentsToSlot(
        applyUpgrade(rune.stats, state.upgradeRune ?? 0), 
        rune.perkName ? { [rune.perkName]: rune.perkAmount ?? 1 } : {}, 
        state.enchantments.rune
      )
      addStats(slotResult.stats)
      addPerkMap(slotResult.perks)
    }
  }

  if (isMonkGuild(state.guild)) {
    const glove = getGlove(state.monkGlove)
    if (glove) {
      const monkPerkBonus = Math.max(0, state.guildRank - 1)
      const monkPct = monkPerkBonus * 0.25
      const gloveStats: StatMap = {}
      const baseGloveStats = glove.stats as StatMap

      for (let i = 0; i < STAT_KEYS.length; i++) {
        const k = STAT_KEYS[i]
        const v = baseGloveStats[k]
        if (v == null) continue
        if (v <= 0) { gloveStats[k] = v; continue }
        const shrineMult = state.shrineActive ? (SHRINE_MULTIPLIERS[glove.tier] ?? 1.0) : 1.0
        gloveStats[k] = round2(v * shrineMult + v * monkPct)
      }
      addStats(gloveStats)
      if (glove.perkName) perks[glove.perkName] = (perks[glove.perkName] ?? 0) + (glove.perkAmount ?? 1)
      if ((glove as any).perks) {
        const gp = (glove as any).perks
        for (let i = 0; i < gp.length; i++) {
          perks[gp[i].name] = (perks[gp[i].name] ?? 0) + gp[i].amount + (i === 0 ? monkPerkBonus : 0)
        }
      }
    }
    const essence = getEssence(state.monkEssence)
    if (essence) {
      addStats(state.shrineActive ? applyShrineToStats(essence.stats as StatMap, essence.tier) : essence.stats as StatMap)
      if (essence.perkName) perks[essence.perkName] = (perks[essence.perkName] ?? 0) + (essence.perkAmount ?? 1)
      if ((essence as any).perks) addPerks((essence as any).perks)
    }
  } else {
    const blade = getBlade(state.weaponBlade)
    if (blade) {
      addStats(state.shrineActive ? applyShrineToStats(blade.stats as StatMap, blade.tier) : blade.stats as StatMap)
      if (blade.perkName) perks[blade.perkName] = (perks[blade.perkName] ?? 0) + (blade.perkAmount ?? 1)
      if ((blade as any).perks) addPerks((blade as any).perks)
    }
    const handle = getHandle(state.weaponHandle)
    if (handle) {
      addStats(state.shrineActive ? applyShrineToStats(handle.stats as StatMap, handle.tier) : handle.stats as StatMap)
      if (handle.perkName) perks[handle.perkName] = (perks[handle.perkName] ?? 0) + (handle.perkAmount ?? 1)
      if ((handle as any).perks) addPerks((handle as any).perks)
    }
  }

  const infusionSlots: Array<[string, ArmorPart["type"] | "Ring"]> = [
    [state.infusionHelmet, "Helmet"],
    [state.infusionChestplate, "Chestplate"],
    [state.infusionLeggings, "Leggings"],
    [state.infusionRing, "Ring"]
  ]

  for (let i = 0; i < infusionSlots.length; i++) {
    const [infName, infType] = infusionSlots[i]
    if (!infName) continue
    const part = infType === "Ring" ? getRing(infName) : getArmorPart(infName, infType)
    if (part) {
      const inf = applyInfusion(part.stats as StatMap, part.perkName ? { [part.perkName]: (part as any).perkAmount ?? 1 } : {})
      addStats(inf.stats)
      addPerkMap(inf.perks)
    }
  }

  const finalStats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    if (stats[k] != null) {
      const rounded = round2(stats[k] ?? 0)
      if (rounded !== 0) finalStats[k] = rounded
    }
  }

  let finalPerks: Record<string, number> = {}
  for (const k in perks) {
    if (Object.prototype.hasOwnProperty.call(perks, k)) {
      const rounded = round2(perks[k])
      if (rounded !== 0) finalPerks[k] = rounded
    }
  }

  const cursedStacks = finalPerks["Cursed"] ?? 0
  const perkEffectivenessStacks = finalPerks["Perk Effectiveness"] ?? 0
  if (perkEffectivenessStacks > 0 || cursedStacks > 0) {
    finalPerks = applyPerkEffectiveness(finalPerks, perkEffectivenessStacks, cursedStacks)
    for (const k in finalPerks) {
      if (Object.prototype.hasOwnProperty.call(finalPerks, k)) {
        finalPerks[k] = round2(finalPerks[k])
      }
    }
  }

  if (finalPerks["Buckler"] != null) finalPerks["Parry"] = (finalPerks["Parry"] ?? 0) + finalPerks["Buckler"]
  const cdr = calcCDR(finalPerks, getRace(state.race)?.cooldownModifiers, state.rune || undefined, state.race || undefined, state.emotionalState)

  const boostedStats = applyStatBoostPerks(finalStats, finalPerks)
  if ((finalPerks['Gladiatorial Rage'] ?? 0) > 0) {
    const BOOST_KEYS: StatKey[] = ['dexterityBoost', 'physicalBoost', 'magicBoost', 'fireBoost', 'waterBoost', 'earthBoost', 'airBoost', 'hexBoost', 'holyBoost']
    let highestBoost = 0
    for (let i = 0; i < BOOST_KEYS.length; i++) {
      const bV = boostedStats[BOOST_KEYS[i]] ?? 0
      if (bV > highestBoost) highestBoost = bV
    }
    const armorPen = round2(highestBoost / 15)
    if (armorPen > 0) boostedStats['armorPenetration'] = (boostedStats['armorPenetration'] ?? 0) + armorPen
  }

  const crit = calcCrit(boostedStats, finalPerks)

  const _itemBuffs = getActiveBuildBuffs({
    rune: state.rune, ring: state.ring, infusionRing: state.infusionRing,
    helmet: state.helmet, chestplate: state.chestplate, leggings: state.leggings,
    weaponBlade: state.weaponBlade, weaponHandle: state.weaponHandle, monkGlove: state.monkGlove,
  })
  const _allBuffs = applyBuffPerkModifiers(
    [..._itemBuffs, ...getPerkBuffs(finalPerks), ...getWeaponArtBuffs(state.selectedWeaponArt)],
    finalPerks,
    state.rune || undefined
  )
  const _rageBuffs = _allBuffs.filter(b => b.buffName === 'Rage')
  const ragePotency = _rageBuffs.length > 0 ? Math.max(..._rageBuffs.map(b => b.potency)) : 0

  const boosts = calcBoosts(finalPerks, state.emotionalState, state.level ?? 80, crit.naturalCritChance, boostedStats.jumpBoost ?? 0, state.summonCount ?? 0, ragePotency)
  return { stats: boostedStats, perks: finalPerks, cdr, boosts, crit }
}

export function formatStat(key: string, value: number): string {
  const rounded = round2(value)
  const abs = Math.abs(rounded)
  const formatted = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, "")
  const sign = rounded >= 0 ? "+" : "-"
  return PERCENT_STATS.has(key) ? `${sign}${formatted}%` : `${sign}${formatted}`
}

export function formatLabel(key: string): string { return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, c => c.toUpperCase()) }
export function isExclusiveEnchant(e: Enchantment | undefined): boolean { return e?.stacking === "exclusive" }

export function enforceEnchantSlot(selections: [string, string, string], changedIndex: number): [string, string, string] {
  let s: [string, string, string] = [selections[0], selections[1], selections[2]]
  const changed = s[changedIndex]
  if (changed) {
    for (let i = 0; i < 3; i++) {
      if (i !== changedIndex && s[i] === changed) s[i] = ""
    }
  }
  let exclusiveIdx = -1
  for (let i = 0; i < s.length; i++) {
    if (isExclusiveEnchant(getEnchant(s[i]))) {
      exclusiveIdx = i
      break
    }
  }
  if (exclusiveIdx !== -1) return [s[exclusiveIdx], "", ""]
  
  // Dense filter implementation without standard array filter to save allocation
  const filled: string[] = []
  for (let i = 0; i < s.length; i++) {
    if (s[i]) filled.push(s[i])
  }
  return [filled[0] ?? "", filled[1] ?? "", filled[2] ?? ""]
}