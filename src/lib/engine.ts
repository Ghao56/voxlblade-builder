import type {
  Race, Guild, GuildRank, Armor, ArmorPart, Ring, Rune,
  Enchantment, Perk, StatMap, StatKey, StatModifier, EnchantSlot, BuildState,
  WeaponBlade, WeaponHandle
} from './types'
import { STAT_KEYS, PERCENT_STATS } from './types'

import racesRaw from '../data/races.json'
import guildsRaw from '../data/guilds.json'
import armorsRaw from '../data/armors.json'
import ringsRaw from '../data/rings.json'
import runesRaw from '../data/runes.json'
import enchantmentsRaw from '../data/enchantments.json'
import perksRaw from '../data/perks.json'
import bladesRaw from '../data/blades.json'
import handlesRaw from '../data/handles.json'

export const races: Race[] = racesRaw as Race[]
export const guilds: Guild[] = guildsRaw as Guild[]
export const perks: Perk[] = perksRaw as Perk[]
export const rings: Ring[] = ringsRaw as Ring[]
export const runes: Rune[] = runesRaw as Rune[]
export const enchantments: Enchantment[] = enchantmentsRaw as Enchantment[]
export const blades: WeaponBlade[] = bladesRaw as WeaponBlade[]
export const handles: WeaponHandle[] = handlesRaw as WeaponHandle[]

export const armors: Armor[] = (armorsRaw as any[]).map(a => ({
  name: a.name,
  tags: a.tags,
  parts: a.parts.map((p: any) => ({
    type: p.type,
    description: p.description ?? a.sharedPart?.description ?? "",
    upgrade: p.upgrade ?? a.sharedPart?.upgrade ?? 0,
    stats: { ...(a.sharedPart?.stats ?? {}), ...(p.stats ?? {}) },
    perkName: p.perkName ?? a.sharedPart?.perkName ?? ""
  }))
}))

const PERK_MAP = Object.fromEntries(perks.map(p => [p.name, p]))
const ENCHANT_MAP = Object.fromEntries(enchantments.map(e => [e.name, e]))
const RING_MAP = Object.fromEntries(rings.map(r => [r.name, r]))
const RUNE_MAP = Object.fromEntries(runes.map(r => [r.name, r]))
const ARMOR_MAP = Object.fromEntries(armors.map(a => [a.name, a]))
const BLADE_MAP = Object.fromEntries(blades.map(b => [b.name, b]))
const HANDLE_MAP = Object.fromEntries(handles.map(h => [h.name, h]))

export function getPerk(name: string) { return PERK_MAP[name] }
export function getEnchant(name: string) { return ENCHANT_MAP[name] }
export function getRing(name: string) { return RING_MAP[name] }
export function getRune(name: string) { return RUNE_MAP[name] }
export function getArmor(name: string) { return ARMOR_MAP[name] }
export function getBlade(name: string) { return BLADE_MAP[name] }
export function getHandle(name: string) { return HANDLE_MAP[name] }
export function getArmorPart(name: string, type: ArmorPart["type"]) {
  return getArmor(name)?.parts.find(p => p.type === type)
}
export function getGuild(name: string) { return guilds.find(g => g.name === name) }
export function getGuildRank(guild: Guild, rank: number): GuildRank | undefined {
  return guild.ranks.find(r => r.rank === rank)
}

// ─── Enchantment logic ────────────────────────────────────────────────────────

function applyMod(value: number, mod: StatModifier): number {
  return mod.type === "multiplier" ? value * mod.value : value + mod.value
}

function normalizeModifiers(m: StatModifier | StatModifier[]): StatModifier[] {
  return Array.isArray(m) ? m : [m]
}

/**
 * Apply enchantments to a slot.
 * Order: right-to-left (index 2 → 1 → 0), so slot 0 (leftmost) applies last
 * and has the "final say" as the primary enchant.
 */
export function applyEnchantmentsToSlot(
  baseStats: StatMap,
  basePerks: Record<string, number>,
  enchantNames: string[]
): { stats: StatMap; perks: Record<string, number> } {
  const stats = { ...baseStats }
  const perks = { ...basePerks }

  // Apply right-to-left: [2, 1, 0]
  const ordered = [...enchantNames].reverse()

  for (const name of ordered) {
    if (!name) continue
    const e = getEnchant(name)
    if (!e) continue

    const es = e.stats

    // positiveStats: multiply all positive values
    if (es.positiveStats) {
      const mods = normalizeModifiers(es.positiveStats as StatModifier | StatModifier[])
      for (const key of Object.keys(stats) as StatKey[]) {
        const v = stats[key] ?? 0
        if (v > 0) {
          let nv = v
          for (const mod of mods) nv = applyMod(nv, mod)
          stats[key] = nv
        }
      }
    }

    // negativeStats: multiply all negative values
    if (es.negativeStats) {
      const mods = normalizeModifiers(es.negativeStats as StatModifier | StatModifier[])
      for (const key of Object.keys(stats) as StatKey[]) {
        const v = stats[key] ?? 0
        if (v < 0) {
          let nv = v
          for (const mod of mods) nv = applyMod(nv, mod)
          stats[key] = nv
        }
      }
    }

    if(es.defenseStats) {
      const mods = normalizeModifiers(es.defenseStats  as StatModifier | StatModifier[])
      const defenseKeys = STAT_KEYS.filter(k => k.endsWith('Defense'))
      for (const key of Object.keys(stats) as StatKey[]) {
        const v = stats[key] ?? 0
        if (v>0 && defenseKeys.includes(key)) {
          let nv = v
          for (const mod of mods) nv = applyMod(nv, mod)
          stats[key] = nv
        }
      }
    }

    // perks modifier
    if (es.perks) {
      const mods = normalizeModifiers(es.perks as StatModifier | StatModifier[])
      for (const perkName of Object.keys(perks)) {
        let v = perks[perkName]
        for (const mod of mods) v = applyMod(v, mod)
        perks[perkName] = v
      }
    }

    // specific stat keys
    for (const [key, modifier] of Object.entries(es)) {
      if (!modifier || ["positiveStats","negativeStats","perks"].includes(key)) continue
      if (!STAT_KEYS.includes(key as StatKey)) continue
      const mods = normalizeModifiers(modifier as StatModifier | StatModifier[])
      let v = stats[key as StatKey] ?? 0
      for (const mod of mods) v = applyMod(v, mod)
      stats[key as StatKey] = v
    }

    // effects → perks
    for (const eff of e.effects) {
      perks[eff.name] = (perks[eff.name] ?? 0) + eff.value
    }
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

/**
 * Apply an infusion slot: stats are halved, perks are kept as-is (no enchants).
 */
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

// ─── Weapon helpers ───────────────────────────────────────────────────────────

export interface WeaponResult {
  bladeName: string
  handleName: string
  bladeType: string
  handleType: string
  weaponType: string
  finalWeaponType: string
  weaponModifier: string
  tier: number
  stats: StatMap
  perks: Record<string, number>
  attackSpeed: number
  damageTypes: Record<string, number>
  scalings: Record<string, number>
}

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
  return WEAPON_TYPE_MAP[handleType]?.[bladeType] ?? "Weapon"
}

/**
 * Resolve the final weapon type accounting for perk overrides.
 * Returns { base, final, modifier } where modifier is the perk/ring that changed the type.
 */
export function resolveWeaponType(
  handleType: string,
  bladeType: string,
  perks: Record<string, number>
): { base: string; final: string; modifier: string } {
  const base = getWeaponType(handleType, bladeType)

  // Dual Wielding (all handles treated as Medium Handle for this perk)
  if ((perks["Dual Wielding"] ?? 0) > 0) {
    if (bladeType === "Small Blade")  return { base, final: "Dual Wielding Daggers", modifier: "Dual Wielding" }
    if (bladeType === "Medium Blade") return { base, final: "Dual Swords",           modifier: "Dual Wielding" }
    if (bladeType === "Heavy Blade")  return { base, final: "Dual Unbalanced Swords",modifier: "Dual Wielding" }
    if (bladeType === "Hammer Head")  return { base, final: "Dual Mallets",          modifier: "Dual Wielding" }
  }

  // Lance perk
  if ((perks["Lance"] ?? 0) > 0) {
    if (handleType === "Long Handle" || handleType === "Medium Handle")
      return { base, final: "Lance", modifier: "Lance" }
  }

  // Duelist Stance — only with Medium Blade
  if ((perks["Duelist Stance"] ?? 0) > 0 && bladeType === "Medium Blade") {
    return { base, final: "Rapier", modifier: "Duelist Stance" }
  }

  // Saw Stance — only with Medium Blade
  if ((perks["Saw Stance"] ?? 0) > 0 && bladeType === "Medium Blade") {
    return { base, final: "Chainsaw", modifier: "Saw Stance" }
  }

  // Kama Blades — with Dagger or Spear
  if ((perks["Kama Blades"] ?? 0) > 0) {
    if (base === "Dagger") return { base, final: "Dual Kamas", modifier: "Kama Blades" }
    if (base === "Spear")  return { base, final: "Scythe",     modifier: "Kama Blades" }
  }

  // Locked And Loaded (ring perk) — Fists → Dual Guns, anything else → Side Gun added
  if ((perks["Locked And Loaded"] ?? 0) > 0) {
    if (base === "Fists") return { base, final: "Dual Guns",        modifier: "Locked And Loaded" }
    return               { base, final: `${base} + Side Gun`,      modifier: "Locked And Loaded" }
  }

  return { base, final: base, modifier: "" }
}

export function calcWeapon(bladeName: string, handleName: string): WeaponResult | null {
  const blade = getBlade(bladeName)
  const handle = getHandle(handleName)
  if (!blade && !handle) return null

  const stats: StatMap = {}
  const perks: Record<string, number> = {}
  const speedParts: number[] = []

  function addStats(s: StatMap | undefined) {
    if (!s) return
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue
      const key = k as StatKey
      stats[key] = (stats[key] ?? 0) + v
    }
  }

  if (blade) {
    addStats(blade.stats)
    if (blade.attackSpeed != null) speedParts.push(blade.attackSpeed)
    if (blade.perkName) perks[blade.perkName] = (perks[blade.perkName] ?? 0) + (blade.perkStacks ?? 1)
  }

  if (handle) {
    addStats(handle.stats)
    if (handle.attackSpeed != null) speedParts.push(handle.attackSpeed)
    if (handle.perkName) perks[handle.perkName] = (perks[handle.perkName] ?? 0) + (handle.perkStacks ?? 1)
  }

  const attackSpeed = speedParts.length > 0
    ? speedParts.reduce((a, b) => a + b, 0) / speedParts.length
    : 1.0

  // Damage type multipliers (from blade)
  const damageTypes: Record<string, number> = {}
  if (blade) {
    const dtKeys = ["trueType","physicalType","magicType","fireType","waterType","earthType","airType","hexType","holyType","summonType"]
    for (const key of dtKeys) {
      const v = (blade as any)[key]
      if (v != null && v !== 0) damageTypes[key.replace("Type", "")] = v
    }
  }

  // Scalings (from blade)
  const scalings: Record<string, number> = {}
  if (blade) {
    const scaleKeys = ["dexterityScaling","physicalScaling","magicScaling","fireScaling","waterScaling","earthScaling","airScaling","hexScaling","holyScaling","summonScaling"]
    for (const key of scaleKeys) {
      const v = (blade as any)[key]
      if (v != null && v !== 0) scalings[key.replace("Scaling", "")] = v
    }
  }

  // Round stats
  const finalStats: StatMap = {}
  for (const [k, v] of Object.entries(stats)) {
    const rounded = Math.round((v + Number.EPSILON) * 100) / 100
    if (rounded !== 0) finalStats[k as StatKey] = rounded
  }

  const bladeType = blade?.bladeType ?? ""
  const handleType = handle?.handleType ?? ""
  const resolved = (bladeType && handleType)
    ? resolveWeaponType(handleType, bladeType, perks)
    : { base: "", final: "", modifier: "" }

  return {
    bladeName: blade?.name ?? "",
    handleName: handle?.name ?? "",
    bladeType,
    handleType,
    weaponType: resolved.base,
    finalWeaponType: resolved.final,
    weaponModifier: resolved.modifier,
    tier: Math.max(blade?.tier ?? 1, handle?.tier ?? 1),
    stats: finalStats,
    perks,
    attackSpeed: Math.round(attackSpeed * 100) / 100,
    damageTypes,
    scalings
  }
}

// ─── Main calculator ──────────────────────────────────────────────────────────

export interface BuildResult {
  stats: StatMap
  perks: Record<string, number>
}

export function calcBuild(state: BuildState): BuildResult {
  const stats: StatMap = {}
  const perks: Record<string, number> = {}

  function addStats(s: StatMap | undefined) {
    if (!s) return
    for (const [k, v] of Object.entries(s)) {
      if (v == null) continue
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

  // Armor parts with enchantments
  const armorSlots: Array<[string, ArmorPart["type"], EnchantSlot]> = [
    [state.helmet, "Helmet", "helmet"],
    [state.chestplate, "Chestplate", "chestplate"],
    [state.leggings, "Leggings", "leggings"],
  ]

  for (const [armorName, partType, enchSlot] of armorSlots) {
    if (!armorName) continue
    const part = getArmorPart(armorName, partType)
    if (!part) continue

    const basePerksForSlot: Record<string, number> = {}
    if (part.perkName) basePerksForSlot[part.perkName] = 1

    const enchNames = state.enchantments[enchSlot]
    const slotResult = applyEnchantmentsToSlot(part.stats as StatMap, basePerksForSlot, enchNames)
    addStats(slotResult.stats)
    for (const [k, v] of Object.entries(slotResult.perks)) {
      perks[k] = (perks[k] ?? 0) + v
    }
  }

  // Ring with enchantments
  if (state.ring) {
    const ring = getRing(state.ring)
    if (ring) {
      const basePerksForRing: Record<string, number> = ring.perkName
        ? { [ring.perkName]: ring.perkStacks ?? 1 } : {}
      const slotResult = applyEnchantmentsToSlot(ring.stats, basePerksForRing, state.enchantments.ring)
      addStats(slotResult.stats)
      for (const [k, v] of Object.entries(slotResult.perks)) {
        perks[k] = (perks[k] ?? 0) + v
      }
    }
  }

  // Rune with enchantments
  if (state.rune) {
    const rune = getRune(state.rune)
    if (rune) {
      const basePerksForRune: Record<string, number> = rune.perkName
        ? { [rune.perkName]: rune.perkStacks ?? 1 } : {}
      const slotResult = applyEnchantmentsToSlot(rune.stats, basePerksForRune, state.enchantments.rune)
      addStats(slotResult.stats)
      for (const [k, v] of Object.entries(slotResult.perks)) {
        perks[k] = (perks[k] ?? 0) + v
      }
    }
  }

  // ── Weapon ──────────────────────────────────────────────────────────────────
  if (state.weaponBlade) {
    const blade = getBlade(state.weaponBlade)
    if (blade) {
      addStats(blade.stats)
      if (blade.perkName) perks[blade.perkName] = (perks[blade.perkName] ?? 0) + (blade.perkStacks ?? 1)
    }
  }
  if (state.weaponHandle) {
    const handle = getHandle(state.weaponHandle)
    if (handle) {
      addStats(handle.stats)
      if (handle.perkName) perks[handle.perkName] = (perks[handle.perkName] ?? 0) + (handle.perkStacks ?? 1)
    }
  }

  // ── Infusion slots ──────────────────────────────────────────────────────────
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
      const basePerks: Record<string, number> = ring.perkName ? { [ring.perkName]: ring.perkStacks ?? 1 } : {}
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

  return { stats: finalStats, perks: finalPerks }
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

/**
 * Enforce rules for a single enchant slot's 3 selections.
 */
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