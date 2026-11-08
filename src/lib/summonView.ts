// summonView.ts — Phase 1 of the Summoner UI rework (SPEC §4.1). Pure
// view-model functions: NO calculation logic duplicated — every displayed
// number comes from the same functions the calculators use.
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
  calcBloodRushThresholdPct,
  calcBloodRushPotency,
  type SummonInstance,
  type SummonSource,
  type SummonBuffOrDebuff,
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
  /** Attack rows: per-type chunks (base × weight → scaled) for the type block. */
  dmgChunks?: Array<{ type: string; base: number; scaled: number }>
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
  lifetime: {
    hp: number
    maxHp: number
    decayPerSec: number
    baseDecay: number | null
    seconds: number | null // null = infinite — remaining time from the CURRENT hp
    rage: { thresholdPct: number | null; potency: number; active: boolean } // null = no Blood Rush
  }
  swarm: { label: string; perHit: number; count: number; total: number; dmgType: string }[]
  buffs: { name: string; value: number; active: boolean; affectsDamage: boolean }[]
  /** Debuffs the summon applies on hit — ALL of them (even potency 0). NO
   *  DoT damage: the summon DoT/Debuff system is SEPARATE from the player's
   *  and never receives player perks (owner decision, 2026-11). */
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
  /** True for the rune summon (Swarm Rune) — DamageAnalyzer uses it only to
   *  route slider writes to the right independent state (both sliders share
   *  the global cap as max but keep separate values; owner 2026-11). */
  isRune?: boolean
  /** Buff names currently OFF; caller passes keys `source::buffName` so the
   *  same buff name from two sources (rune + weapon) toggles independently. */
  offBuffKeys?: Iterable<string>
  /** Draggable Survival bar — current HP as % of max (0–100). Default 100 =
   *  full HP at spawn (instance.currentHp). Display-only simulation. */
  currentHpPct?: number
  /** Blood Rush perk stacks — Rage applies to the summon at/below its
   *  low-HP threshold (calcBloodRush* in SummonData). */
  bloodRushStacks?: number
}

// Read generically so labels stay in sync with the shared SummonDef contract.
const DEFENSE_FIELD_LABELS: Record<string, string> = {
  physicalDefenseBoost: 'Physical Def',
  magicDefenseBoost: 'Magic Def',
  hexDefenseBoost: 'Hex Def',
  fireDefenseBoost: 'Fire Def',
  airDefenseBoost: 'Air Def',
  waterDefenseBoost: 'Water Def',
}

export function buildSummonVM(input: SummonVMInput): SummonPanelVM {
  const { instance, level } = input
  const def = instance.def

  const colorOf = (rawType: string): string =>
    DMG_TYPE_COLORS[rawType.toLowerCase()] ?? '#e8e4da'

  // ① scaling — mult must be EXACTLY the factor calcSummonStat applies,
  // achieved by feeding base = 1 (never rewrite the formula).
  const spawnMult = calcSummonStat(1, instance.spawnBoostPct, level)
  const levelFactor = 1 + level / MAX_LEVEL
  const scaling = { boostPct: instance.spawnBoostPct, levelFactor, mult: spawnMult }

  // Damage mult (buff chain) — same function the damage pipeline uses. Toggle
  // state lives in DamageAnalyzer: key `source::buffName` so the same buff
  // name arriving from rune + weapon toggles independently. Only active buffs
  // enter the mult chain.
  const offKeys = new Set(input.offBuffKeys ?? [])
  const isBuffActive = (buffName: string): boolean =>
    !offKeys.has(`${instance.source}::${buffName}`)
  // Blood Rush (Blood Bumblz armor perk): threshold + Rage potency per stacks.
  // RAGE BUFFS PURE PHYSICAL ONLY (card: "Increase pure Physical damage dealt
  // by 10% per 0.1 potency") → per-chunk mult below adds ×(1+potency) to
  // physical chunks; Rage never enters the type-agnostic buff chain.
  // Toggleable like any buff via the Buffs block (key `source::Rage`).
  const brStacks = Math.max(0, Math.floor(input.bloodRushStacks ?? 0))
  const rageThresholdPct = calcBloodRushThresholdPct(brStacks)
  const ragePotency = calcBloodRushPotency(brStacks)
  const currentHpPct = Math.max(0, Math.min(100, input.currentHpPct ?? 100))
  const rageActive =
    rageThresholdPct !== null && currentHpPct <= rageThresholdPct && isBuffActive('Rage')

  const activeBuffs = (instance.buffs ?? []).filter(b => isBuffActive(b.name))
  const buffMult = calcSummonBuffDmgMult(activeBuffs)
  // Per-chunk damage mult: Rage adds ×(1+potency) ONLY to physical chunks.
  const chunkMult = (dmgType: string): number =>
    buffMult * (rageActive && dmgType.toLowerCase() === 'physical' ? 1 + ragePotency : 1)

  // ② stat rows — damage scales from min(currentBoost, spawnBoost), exactly
  // like the panel scaling strip shows. HP is NOT listed here (owner 2026-11):
  // the Survival block is the only HP display, so no stat is printed twice.
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

  // ④ swarm rows — Active count comes from the INPUT (player slider or raw
  // def.count for WA summons), NEVER from the enriched def: enrichSummonDef
  // overwrites def.count of rune summons with summonCount and loses the
  // "X per cast" info.
  const count = Math.max(0, Math.min(Math.floor(input.activeCount), input.cap))
  const swarmRows: SummonPanelVM['swarm'] = []
  if (def.attacks && def.attacks.length > 0) {
    for (const atk of def.attacks) {
      // Utility attacks (Howl: no damage, only applies Shatter) are NOT stat
      // rows — a "0 ×mult 0" row is noise. They still show in Applied Debuffs.
      if (atk.baseDmg <= 0) continue
      const dmgType = atk.dmgType.toLowerCase()
      // Per-chunk scaling: each damage-type chunk gets its own mult — this is
      // where Rage's physical-only boost lands (weights sum to 1 in all defs).
      const scaledChunks = Object.entries(atk.dmgTypes ?? { [dmgType]: 1 }).map(
        ([chunkType, weight]) => ({
          type: chunkType,
          weight,
          scaled:
            calcSummonDamage(atk.baseDmg, instance.currentBoostPct, instance.spawnBoostPct, level) *
            weight * chunkMult(chunkType) * instance.trustyDmgMult,
        }),
      )
      const perHit = Math.round(scaledChunks.reduce((acc, c) => acc + c.scaled, 0) * 100) / 100
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
        // Mult column = FULL per-hit factor so Base × Mult = Scaled exactly:
        // scaling × buff chain × Trusty Servant dmg mult (Rage boosted its
        // share when the attack has physical chunks) — previously Trusty
        // was baked into Scaled but hidden from Mult (owner complaint).
        mult: perHit / atk.baseDmg,
        scaled: perHit,
        dmgType,
        dmgColor: colorOf(atk.dmgType),
        ignoresArmor: dmgType === 'summon', // calcArmorMult mult=1 shortcut for 'summon'
        dmgChunks: scaledChunks.map(c => ({
          type: c.type,
          base: Math.round(atk.baseDmg * c.weight * 100) / 100,
          scaled: Math.round(c.scaled * 100) / 100,
        })),
      })
    }
  } else {
    const dmgType = def.dmgType.toLowerCase()
    // Same per-chunk scaling as named attacks — Rage lands on physical here too.
    const perHit = Math.round(
      calcSummonDamage(def.baseDmg, instance.currentBoostPct, instance.spawnBoostPct, level) *
        chunkMult(dmgType) * instance.trustyDmgMult * 100,
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
      // Same rule as attack rows: Mult = Base × Mult = Scaled (Full multiplier, incl. Trusty).
      mult: perHit / def.baseDmg,
      scaled: perHit,
      dmgType,
      dmgColor: colorOf(def.dmgType),
      ignoresArmor: dmgType === 'summon',
    })
  }

  // ③ lifetime — max HP straight off the instance formulas; current HP from
  // the drag override (100 = full at spawn). Remaining survival = pct / decay.
  const decayPerSec = Math.round(instance.decayPerSec * 100) / 100 // % of max HP per second
  const fullSeconds =
    instance.decayPerSec > 0 && isFinite(instance.decayPerSec)
      ? 100 / instance.decayPerSec // % HP/s → survival in seconds (boost divisor already inside)
      : null
  const maxHp = calcSummonMaxHp(def.baseHp, instance.spawnBoostPct, level) * instance.trustyHpMult
  const seconds = fullSeconds === null ? null : (fullSeconds * currentHpPct) / 100

  // affectsDamage via calcSummonBuffDmgMult itself — no perk name hardcoding.
  const buffs = (instance.buffs ?? []).map(b => ({
    name: b.name,
    value: b.value,
    active: isBuffActive(b.name),
    affectsDamage: calcSummonBuffDmgMult([b]) !== 1,
  }))
  // Blood Rush surfacing in the Buffs block: listed whenever equipped, active
  // only below the threshold — mirrors how the perk card reads in-game. Rage
  // boosts PURE PHYSICAL damage only, so affectsDamage is set directly (the
  // type-agnostic chain check would report false).
  if (rageThresholdPct !== null) {
    buffs.push({
      name: 'Rage',
      value: ragePotency,
      active: rageActive,
      affectsDamage: ragePotency > 0,
    })
  }

  // ⑤ applied debuffs — LIST ALL, even potency 0 (e.g. Bumblz Poison potency 0
  // must still be listed — owner requirement 2026-11). NO DoT damage shown:
  // the summon DoT/Debuff system is separate from the player's and never
  // receives player perks.
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
      hp: Math.round((maxHp * currentHpPct) / 100 * 100) / 100,
      maxHp, // × Trusty HP mult — matches currentHp-at-spawn
      decayPerSec,
      // base decay from the original SummonData accessor — display-only, the
      // UI never rebuilds the ÷ (1 + boost) formula (single source of truth).
      baseDecay: getSummonBaseDecay(instance.source) ?? null,
      seconds, // remaining time from the dragged current HP
      rage: { thresholdPct: rageThresholdPct, potency: ragePotency, active: rageActive },
    },
    swarm: swarmRows,
    buffs,
    debuffs,
  }
}
