import type {
  Race, Guild, GuildRank, Armor, ArmorPart, Ring, Rune,
  Enchantment, Perk, StatMap, StatKey, StatModifier, EnchantSlot, BuildState
} from './types'
import { STAT_KEYS, PERCENT_STATS } from './types'

import racesRaw from '../data/races.json'
import guildsRaw from '../data/guilds.json'
import armorsRaw from '../data/armors.json'
import ringsRaw from '../data/rings.json'
import runesRaw from '../data/runes.json'
import enchantmentsRaw from '../data/enchantments.json'
import perksRaw from '../data/perks.json'

export const races: Race[] = racesRaw as Race[]
export const guilds: Guild[] = guildsRaw as Guild[]
export const perks: Perk[] = perksRaw as Perk[]
export const rings: Ring[] = ringsRaw as Ring[]
export const runes: Rune[] = runesRaw as Rune[]
export const enchantments: Enchantment[] = enchantmentsRaw as Enchantment[]

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

export function getPerk(name: string) { return PERK_MAP[name] }
export function getEnchant(name: string) { return ENCHANT_MAP[name] }
export function getRing(name: string) { return RING_MAP[name] }
export function getRune(name: string) { return RUNE_MAP[name] }
export function getArmor(name: string) { return ARMOR_MAP[name] }
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
  (enchantmentsRaw as Enchantment[]).flatMap(e => e.effects.map(ef => ef.name))
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
 * Enforce rules for a single enchant slot's 3 selections:
 *
 * 1. Exclusive enchant → clears all other slots, occupies slot 0 only.
 * 2. No duplicates across slots — when a slot is changed, clear any other
 *    slot that already has the same enchant name.
 * 3. Cascade: slot 1 requires slot 0 filled; slot 2 requires slot 1 filled.
 *    (Gaps are not allowed — shift values left if needed.)
 *
 * changedIndex: which slot the user just edited (0, 1, or 2).
 */
export function enforceEnchantSlot(
  selections: [string, string, string],
  changedIndex: number
): [string, string, string] {
  let s: [string, string, string] = [...selections] as [string, string, string]
  const changed = s[changedIndex]

  // 1. If the newly set value is non-empty, remove it from every OTHER slot
  if (changed) {
    for (let i = 0; i < 3; i++) {
      if (i !== changedIndex && s[i] === changed) {
        s[i] = ""
      }
    }
  }

  // 2. If any slot is exclusive, it must be alone in slot 0
  const exclusiveIdx = s.findIndex(n => isExclusiveEnchant(getEnchant(n)))
  if (exclusiveIdx !== -1) {
    const exclusiveName = s[exclusiveIdx]
    return [exclusiveName, "", ""]
  }

  // 3. Cascade — compact leftward so there are no gaps
  const filled = s.filter(Boolean)
  return [
    filled[0] ?? "",
    filled[1] ?? "",
    filled[2] ?? "",
  ]
}