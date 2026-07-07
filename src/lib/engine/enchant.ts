import type { StatKey, StatModifier, StatMap, Enchantment } from '../types'
import { STAT_KEYS, PERCENT_STATS, applyUpgrade } from '../types'
import { getEnchant, enchantmentsRaw } from './data'
import { round2 } from './_utils'

// ─── Stat modifier helpers ────────────────────────────────────────────────────

function applyMod(value: number, mod: StatModifier): number {
  return mod.type === "multiplier" ? value * mod.value : value + mod.value
}

function normalizeModifiers(m: StatModifier | StatModifier[]): StatModifier[] {
  return Array.isArray(m) ? m : [m]
}

function applyModsToKey(
  key:  StatKey,
  mods: StatModifier[],
  mult: Partial<Record<StatKey, number>>,
  add:  Partial<Record<StatKey, number>>,
): void {
  for (let m = 0; m < mods.length; m++) {
    if (mods[m].type === 'multiplier') mult[key] = (mult[key] ?? 1) * mods[m].value
    else                               add[key]  = (add[key]  ?? 0) + mods[m].value
  }
}

function applyModsWhere(
  mods:      StatModifier[],
  baseStats: StatMap,
  mult:      Partial<Record<StatKey, number>>,
  add:       Partial<Record<StatKey, number>>,
  predicate: (baseValue: number, key: StatKey) => boolean,
): void {
  for (let j = 0; j < STAT_KEYS.length; j++) {
    const key = STAT_KEYS[j]
    if (predicate(baseStats[key] ?? 0, key)) applyModsToKey(key, mods, mult, add)
  }
}

// ─── Enchantment application ──────────────────────────────────────────────────

type StatSelectorEntry = {
  key:  'positiveStats' | 'negativeStats' | 'defenseStats'
  pred: (v: number, k: StatKey) => boolean
}

const STAT_SELECTORS: StatSelectorEntry[] = [
  { key: 'positiveStats', pred: (v)    => v > 0 },
  { key: 'negativeStats', pred: (v)    => v < 0 },
  { key: 'defenseStats',  pred: (v, k) => k.endsWith('Defense') && v > 0 },
]

export function applyEnchantmentsToSlot(
  baseStats:    StatMap,
  basePerks:    Record<string, number>,
  enchantNames: string[],
): { stats: StatMap; perks: Record<string, number> } {
  const ordered = [...enchantNames].reverse()
  const mult: Partial<Record<StatKey, number>> = {}
  const add:  Partial<Record<StatKey, number>> = {}
  const perks = { ...basePerks }

  for (let i = 0; i < ordered.length; i++) {
    const name = ordered[i]
    if (!name) continue
    const e = getEnchant(name)
    if (!e) continue
    const es = e.stats

    for (const { key, pred } of STAT_SELECTORS) {
      if (!es[key]) continue
      applyModsWhere(normalizeModifiers(es[key] as StatModifier | StatModifier[]), baseStats, mult, add, pred)
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
      const key      = STAT_KEYS[j]
      const modifier = es[key]
      if (!modifier) continue
      applyModsToKey(key, normalizeModifiers(modifier as StatModifier | StatModifier[]), mult, add)
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
    const key    = STAT_KEYS[j]
    const result = (baseStats[key] ?? 0) * (mult[key] ?? 1) + (add[key] ?? 0)
    if (result !== 0) stats[key] = result
  }

  return { stats, perks }
}

// ─── Perk effectiveness ───────────────────────────────────────────────────────

const ENCHANT_EFFECT_PERK_NAMES = new Set(
  (enchantmentsRaw as Enchantment[]).flatMap(e => (e.effects ?? []).map(ef => ef.name))
)

const PERK_EFFECTIVENESS_EXEMPT = new Set([
  ...ENCHANT_EFFECT_PERK_NAMES,
  "Cursed", "Luminescent Fervor", "Valor", "Spirit Commune",
  "Channeled Weapon", "Quickcast", "Thief Training", "Vampire", "Heal Boost", "Stored Corruption",
  "Minion Absorption", "Poison Potency", "Burn Potency", "Bleed Potency",
])

export function applyPerkEffectiveness(
  perks:                   Record<string, number>,
  perkEffectivenessStacks: number,
  cursedStacks:            number,
): Record<string, number> {
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

// ─── Infusion ─────────────────────────────────────────────────────────────────

export function applyInfusion(
  baseStats: StatMap,
  basePerks: Record<string, number>,
): { stats: StatMap; perks: Record<string, number> } {
  const stats: StatMap = {}
  for (let i = 0; i < STAT_KEYS.length; i++) {
    const k = STAT_KEYS[i]
    const v = baseStats[k]
    if (v != null) stats[k] = v * 0.5
  }
  return { stats, perks: { ...basePerks } }
}

// ─── Enchant slot enforcement ─────────────────────────────────────────────────

export function isExclusiveEnchant(e: Enchantment | undefined): boolean {
  return e?.stacking === "exclusive"
}

export function enforceEnchantSlot(
  selections:   [string, string, string],
  changedIndex: number,
): [string, string, string] {
  const s: [string, string, string] = [selections[0], selections[1], selections[2]]
  const changed = s[changedIndex]
  if (changed) {
    for (let i = 0; i < 3; i++) {
      if (i !== changedIndex && s[i] === changed) s[i] = ""
    }
  }

  let exclusiveIdx = -1
  for (let i = 0; i < s.length; i++) {
    if (isExclusiveEnchant(getEnchant(s[i]))) { exclusiveIdx = i; break }
  }
  if (exclusiveIdx !== -1) return [s[exclusiveIdx], "", ""]

  const filled: string[] = []
  for (let i = 0; i < s.length; i++) { if (s[i]) filled.push(s[i]) }
  return [filled[0] ?? "", filled[1] ?? "", filled[2] ?? ""]
}