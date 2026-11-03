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
  key: 'hp' | 'tenacity' | 'defense' | 'attack'
  label: string
  base: number | null       // null if stat does not scale (e.g. Magic Def)
  mult: number | null       // boost factor applied to THIS stat only
  scaled: number
  unit?: '%' | ''
  dmgType?: string          // attacks: lowercase key for DMG_TYPE_COLORS
  dmgColor?: string         // resolved color, null-safe fallback handled in component
  ignoresArmor?: boolean    // true when the hit's dmgType === 'summon' (calcArmorMult shortcut)
  note?: string             // e.g. 'locked at spawn' (user-facing)
}

export interface SummonPanelVM {
  name: string
  source: SummonSource
  count: number             // ACTIVE minions — từ summonCount/slider của player, clamp [0, cap]
  spawnCount: number        // def.count NGUYÊN BẢN — "X con / lần triệu hồi"
  cap: number               // passed in from caller (maxSummons), never recomputed here — see BUG-0001
  scaling: { boostPct: number; levelFactor: number; mult: number }
  stats: SummonStatRow[]
  lifetime: { hp: number; maxHp: number; decayPerSec: number; baseDecay: number | null; seconds: number | null } // null = infinite
  swarm: { label: string; perHit: number; count: number; total: number; dmgType: string }[]
  buffs: { name: string; value: number; active: boolean; affectsDamage: boolean }[]
  /** Danh sách debuff summon áp lên địch — TẤT CẢ (kể cả potency 0). KHÔNG
   *  có damage DoT ở đây: hệ thống DoT/Debuff của summon KHÁC của player,
   *  không nhận perk của player (quyết định của chủ dự án, 2026-11). */
  debuffs: { name: string; potency: number }[]
}

/** Format số theo §6: tối đa 4 chữ số thập phân, bỏ số 0 thừa. Dùng lại
 *  roundMultiplier của lib/utils — không tự viết công thức làm tròn. */
export function fmtSummonNum(n: number): string {
  const r = roundMultiplier(n)
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '')
}

/** Định dạng thời gian sống còn (giây) — cùng format Duration hiển thị ở
 *  khối ③ của SummonPanel: "45s", "1m 30s". Chỉ format, không tính toán. */
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
  activeCount: number // REQUIRED — "đang hoạt động", nguồn: build.summonCount / VS slider (rune) hoặc def.count (WA)
  spawnCount: number // REQUIRED — def.count nguyên bản (trước enrichSummonDef ghi đè)
  /** Tên buff đang OFF; caller truyền key `source::buffName` để cùng tên buff từ
   *  hai nguồn (rune + vũ khí) không đụng nhau. */
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

  // ② stat rows — HP scales from spawnBoostPct (locked), damage from
  // min(currentBoost, spawnBoost), exactly like the panel scaling strip shows. Blocks with
  // separate mults carry their own mult in the row; shared one lives at ①.
  const stats: SummonStatRow[] = []

  stats.push({
    key: 'hp',
    label: 'HP',
    base: def.baseHp,
    mult: spawnMult,
    scaled: calcSummonMaxHp(def.baseHp, instance.spawnBoostPct, level),
    note: 'locked at spawn',
  })

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
  // Active count (số con đang hoạt động) lấy từ INPUT (summonCount/slider của
  // player hoặc def.count với WA summon), KHÔNG đọc từ def đã enrich — vì
  // enrichSummonDef đè def.count của rune-summon bằng summonCount, làm mất
  // info "X con / lần triệu hồi". spawnCount từ raw def, truyền qua input.
  const count = Math.max(0, Math.min(Math.floor(input.activeCount), input.cap))
  const swarmRows: SummonPanelVM['swarm'] = []
  if (def.attacks && def.attacks.length > 0) {
    for (const atk of def.attacks) {
      const dmgType = atk.dmgType.toLowerCase()
      const perHit = Math.round(
        calcSummonDamage(atk.baseDmg, instance.currentBoostPct, instance.spawnBoostPct, level) *
          buffMult * 100,
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
        buffMult * 100,
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

  // ⑤ applied debuffs — HIỂN THỊ TẤT CẢ debuff def áp lên địch, kể cả potency 0
  // (vd Poison của Bumblz potency 0 vẫn phải liệt kê để biết summon áp gì —
  // yêu cầu của chủ dự án 2026-11). KHÔNG hiển thị damage DoT: hệ thống
  // DoT/Debuff của summon tách riêng với của player và KHÔNG nhận perk của
  // player (poison/burn/bleed potency…).
  const debuffs = (instance.debuffs ?? [])
    .map(d => ({ name: d.name, potency: d.value }))

  return {
    name: def.name,
    source: instance.source,
    count,
    spawnCount: input.spawnCount,
    cap: input.cap,
    scaling,
    stats,
    lifetime: {
      hp: Math.round(instance.currentHp * 100) / 100,
      maxHp: calcSummonMaxHp(def.baseHp, instance.spawnBoostPct, level),
      decayPerSec,
      // decay gốc từ hàm gốc của SummonData — UI chỉ hiển thị, không dựng lại
      // phép tính ÷ (1 + boost) (giữ single source of truth).
      baseDecay: getSummonBaseDecay(instance.source) ?? null,
      seconds,
    },
    swarm: swarmRows,
    buffs,
    debuffs,
  }
}
