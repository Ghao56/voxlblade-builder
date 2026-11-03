// summonView.ts — Phase 1 of the Summoner UI rework (SPEC §4.1).
// Pure functions: gather summon data into a view model for SummonPanel.svelte.
// NO calculation logic is duplicated here — every displayed number comes from
// the same functions the calculators use (calcSummonStat, calcSummonDamage,
// calcSummonBuffDmgMult, createSummonInstance, calcMaxSummonCount).
// TODO(summon-ui): display-only layer. If any formula below looks wrong,
// log it in the phase report instead of fixing it here.

import {
  MAX_LEVEL,
} from './constants'
import {
  calcSummonStat,
  calcSummonMaxHp,
  calcSummonDamage,
  calcSummonBuffDmgMult,
  type SummonInstance,
  type SummonSource,
} from '../data/SummonData'
import { DMG_TYPE_COLORS } from './constants/damage-types'
import { roundMultiplier } from './utils'
import { getSummonBaseDecay } from '../data/SummonData'

export interface SummonStatRow {
  key: 'tenacity' | 'defense' | 'attack'
  label: string
  base: number | null       // null if stat does not scale (e.g. Magic Def)
  mult: number | null       // boost factor applied to THIS stat only
  scaled: number
  unit?: '%' | ''
  dmgType?: string          // attacks: lowercase key for DMG_TYPE_COLORS
  dmgColor?: string         // resolved color, null-safe fallback handled in component
  ignoresArmor?: boolean    // true when the hit's dmgType === 'summon' (calcArmorMult shortcut)
  note?: string             // e.g. 'locked at spawn' (user-facing) — currently unused
}

export interface SummonPanelVM {
  name: string
  source: SummonSource
  count: number             // ACTIVE minions — from the player slider / summonCount, clamped to [0, cap]
  spawnCount: number        // RAW def.count — minions per cast
  cap: number               // passed in from caller (maxSummons), never recomputed here — see BUG-0001
  isRune: boolean           // routes slider writes (rune → vassalsCroakSummons state, WA → per-name state)
  trustyDmgMult: number     // 1 without the perk; from instance.trustyDmgMult
  trustyHpMult: number
  trustyTiers: { dmgIncr: number; hpIncr: number } | null // null without the perk — shown in the scaling strip
  scaling: { boostPct: number; levelFactor: number; mult: number }
  stats: SummonStatRow[]
  lifetime: { hp: number; maxHp: number; decayPerSec: number; baseDecay: number | null; seconds: number | null } // null = infinite
  swarm: { label: string; perHit: number; count: number; total: number; dmgType: string }[]
  buffs: { name: string; value: number; active: boolean; affectsDamage: boolean }[]
  /** Debuffs the summon applies on hit — ALL of them (even potency 0). NO
   *  DoT damage here: the summon DoT/Debuff system is SEPARATE from the
   *  player's and never receives player perks (owner decision, 2026-11). */
  debuffs: { name: string; potency: number }[]
}

/** Number formatting (SPEC §6): max 4 decimal places, trim trailing zeros.
 *  Reuses roundMultiplier from lib/utils — never invent rounding. */
export function fmtSummonNum(n: number): string {
  const r = roundMultiplier(n)
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '')
}

/** Formats survival time (seconds) — same Duration format shown in the
 *  SummonPanel Survival block: "45s", "1m 30s". Format-only, no math. */
export function fmtSummonDuration(secs: number): string {
  const s = Math.round(secs)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const r = s % 60
  return r > 0 ? `${m}m ${r}s` : `${m}m`
}

export interface SummonVMInput {
  instance: SummonInstance
  level: number
  perks: Record<string, number>
  cap: number // REQUIRED — the single source of truth stays in DamageAnalyzer/App (maxSummons)
  activeCount: number // REQUIRED — "active now"; source: build.vassalsCroakSummons slider (rune) or per-summon WA state, default def.count
  spawnCount: number // REQUIRED — raw def.count (before enrichSummonDef overwrites it)
  /** True for the rune summon (Swarm Rune). DamageAnalyzer only needs it to
   *  route slider writes to the right independent state (owner 2026-11: both
   *  sliders share the global cap as max but keep separate values). */
  isRune?: boolean
  /** Buff names currently OFF; caller passes keys `source::buffName` so the
   *  same buff name from two sources (rune + weapon) toggles independently. */
  offBuffKeys?: Iterable<string>
}

// Defense fields are part of the shared SummonDef contract, so reading them
// generically keeps labels in sync with the SummonPanel stat table
// without hardcoding names.
const DEFENSE_FIELD_LABELS: Record<string, string> = {
  physicalDefenseBoost: 'Physical Def',
  magicDefenseBoost: 'Magic Def',
  airDefenseBoost: 'Air Def',
  waterDefenseBoost: 'Water Def',
}

export function buildSummonVM(input: SummonVMInput): SummonPanelVM {
  const { instance, level } = input
  const def = instance.def
  // Highlight colour per attack/dmgType, lowercase key (DMG_TYPE_COLORS keys).
  const colorOf = (rawType: string): string =>
    DMG_TYPE_COLORS[rawType.toLowerCase()] ?? '#e8e4da'

  // ① scaling — mult must be EXACTLY the factor calcSummonStat applies,
  // achieved by feeding base = 1 (never rewrite the formula).
  const spawnMult = calcSummonStat(1, instance.spawnBoostPct, level)
  const levelFactor = 1 + level / MAX_LEVEL
  const scaling = { boostPct: instance.spawnBoostPct, levelFactor, mult: spawnMult }

  // Damage mult (bonus-dmg buff chain) — same function the damage pipeline uses.
  // Toggle state lives in DamageAnalyzer (hoisted per TODO(summon-ui)): key
  // `source::buffName` so the same buff name arriving from two sources (rune
  // + weapon) toggles independently. Only active buffs enter the mult chain.
  const offKeys = new Set(input.offBuffKeys ?? [])
  const isBuffActive = (buffName: string): boolean =>
    !offKeys.has(`${instance.source}::${buffName}`)
  const activeBuffs = (instance.buffs ?? []).filter(b => isBuffActive(b.name))
  const buffMult = calcSummonBuffDmgMult(activeBuffs)

  // ② stat rows — damage scales from min(currentBoost, spawnBoost), exactly
  // like the panel scaling strip shows. HP is NOT listed here (owner request
  // 2026-11): the only HP display is the Survival block, so no stat is printed
  // twice. Blocks with separate mults carry their own mult in the row; the
  // shared one lives at ①.
  const stats: SummonStatRow[] = []

  if (def.tenacity !== undefined) {
    stats.push({
      key: 'tenacity',
      label: 'Tenacity',
      base: def.tenacity,
      mult: null,
      scaled: def.tenacity,
    })
  }

  for (const [field, label] of Object.entries(DEFENSE_FIELD_LABELS)) {
    const val = (def as unknown as Record<string, number | undefined>)[field]
    if (val === undefined) continue
    stats.push({
      key: 'defense',
      label,
      base: val,
      mult: null, // defenses do not scale with boost — mult column shows '—'
      scaled: val,
      unit: '%',
    })
  }

  // ④ swarm rows — one line per attack (or the def's base attack).
  // Active count comes from the INPUT (player summonCount/slider, or def.count
  // for WA summons) — NEVER from the enriched def, because enrichSummonDef
  // overwrites def.count of rune summons with summonCount and loses the
  // "X per cast" info. spawnCount comes from the raw def via input.
  const count = Math.max(0, Math.min(Math.floor(input.activeCount), input.cap))
  const swarmRows: SummonPanelVM['swarm'] = []
  if (def.attacks && def.attacks.length > 0) {
    for (const atk of def.attacks) {
      const dmgType = atk.dmgType.toLowerCase()
      const perHit = Math.round(
        calcSummonDamage(atk.baseDmg, instance.currentBoostPct, instance.spawnBoostPct, level) *
          buffMult * instance.trustyDmgMult * 100,
      ) / 100
      swarmRows.push({
        label: atk.label,
        perHit,
        count,
        total: Math.round(perHit * count * 100) / 100,
        dmgType,
      })
      stats.push({
        key: 'attack',
        label: atk.label,
        base: atk.baseDmg,
        mult: calcSummonStat(1, Math.min(instance.currentBoostPct, instance.spawnBoostPct), level),
        scaled: perHit,
        dmgType,
        dmgColor: colorOf(atk.dmgType),
        ignoresArmor: dmgType === 'summon', // calcArmorMult mult=1 shortcut for 'summon'
      })
    }
  } else {
    const dmgType = def.dmgType.toLowerCase()
    const perHit = Math.round(
      calcSummonDamage(def.baseDmg, instance.currentBoostPct, instance.spawnBoostPct, level) *
        buffMult * instance.trustyDmgMult * 100,
    ) / 100
    swarmRows.push({
      label: 'Base Attack',
      perHit,
      count,
      total: Math.round(perHit * count * 100) / 100,
      dmgType,
    })
    stats.push({
      key: 'attack',
      label: 'Base Attack',
      base: def.baseDmg,
      mult: calcSummonStat(1, Math.min(instance.currentBoostPct, instance.spawnBoostPct), level),
      scaled: perHit,
      dmgType,
      dmgColor: colorOf(def.dmgType),
      ignoresArmor: dmgType === 'summon',
    })
  }

  // ③ lifetime — numbers come straight off the instance (created once, static).
  const decayPerSec = Math.round(instance.decayPerSec * 100) / 100
  const seconds =
    instance.decayPerSec > 0 && isFinite(instance.decayPerSec)
      ? (instance.currentHp ?? 0) / instance.decayPerSec
      : null

  // a buff affects damage only if removing/keeping it changes the mult chain —
  // checked through calcSummonBuffDmgMult itself, no perk name hardcoding.
  const buffs = (instance.buffs ?? []).map(b => ({
    name: b.name,
    value: b.value,
    active: isBuffActive(b.name),
    affectsDamage: calcSummonBuffDmgMult([b]) !== 1,
  }))

  // ⑤ applied debuffs — LIST ALL debuffs the def applies, even potency 0
  // (e.g. Bumblz Poison potency 0 must still be listed so the user knows what
  // the summon applies — owner requirement 2026-11). NO DoT damage shown: the
  // summon DoT/Debuff system is separate from the player's and never receives
  // player perks (poison/burn/bleed potency…).
  const debuffs = (instance.debuffs ?? [])
    .map(d => ({ name: d.name, potency: d.value }))

  return {
    name: def.name,
    source: instance.source,
    count,
    spawnCount: input.spawnCount,
    cap: input.cap,
    isRune: input.isRune ?? false,
    trustyDmgMult: instance.trustyDmgMult,
    trustyHpMult: instance.trustyHpMult,
    trustyTiers: instance.trustyTiers,
    scaling,
    stats,
    lifetime: {
      hp: Math.round(instance.currentHp * 100) / 100, // already carries trustyHpMult (set at summon)
      // calcSummonMaxHp × Trusty HP mult — matches currentHp at spawn
      maxHp: calcSummonMaxHp(def.baseHp, instance.spawnBoostPct, level) * instance.trustyHpMult,
      decayPerSec,
      // base decay from the original SummonData accessor — display-only, the
      // UI never rebuilds the ÷ (1 + boost) formula (single source of truth).
      baseDecay: getSummonBaseDecay(instance.source) ?? null,
      seconds,
    },
    swarm: swarmRows,
    buffs,
    debuffs,
  }
}
