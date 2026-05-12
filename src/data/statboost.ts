// src/data/statboost.ts
// ─────────────────────────────────────────────────────────────────────────────
// Stat Boost Perks — các perk thuộc tag "Stat Boost" làm thay đổi stat tổng hợp.
// Chỉ áp dụng lên finalStats (summary), KHÔNG ảnh hưởng detail cards từng slot.
//
// Thêm perk mới: viết thêm case trong applyStatBoostPerks().
// ─────────────────────────────────────────────────────────────────────────────

import type { StatMap, StatKey } from '../lib/types'

// Các stat được coi là "offensive boosts" (dùng cho Brawny, v.v.)
const OFFENSIVE_BOOSTS: StatKey[] = [
  'physicalBoost', 'magicBoost', 'fireBoost', 'waterBoost',
  'earthBoost', 'airBoost', 'hexBoost', 'holyBoost', 'dexterityBoost',
  // summonBoost bị loại trừ khỏi Brawny theo wiki
]

function r(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100 }

/**
 * Áp dụng tất cả Stat Boost perks lên finalStats.
 * Gọi sau khi đã có finalStats + finalPerks hoàn chỉnh.
 */
export function applyStatBoostPerks(
  stats: StatMap,
  perks: Record<string, number>
): StatMap {
  // Clone để không mutate input
  const s: StatMap = { ...stats }

  // ── Brawny ──────────────────────────────────────────────────────────────
  // "Converts 20% of other positive offensive boosts to Physical Boost per 1 perk
  //  (100% at 5 stacks). Does not convert Summon Boost."
  const brawny = perks['Brawny'] ?? 0
  if (brawny > 0) {
    const convRate = Math.min(brawny * 0.20, 1.0)
    let gained = 0
    for (const key of OFFENSIVE_BOOSTS) {
      if (key === 'physicalBoost') continue          // không convert chính nó
      const val = s[key] ?? 0
      if (val <= 0) continue
      const converted = r(val * convRate)
      s[key] = r(val - converted)
      gained += converted
    }
    s['physicalBoost'] = r((s['physicalBoost'] ?? 0) + gained)
  }

  // ── Quick Witted ─────────────────────────────────────────────────────────
  // "Increases your Dexterity Boost scaling off of your Speed Boost."
  // Game rate: +1 Dex per 1 Speed per stack (cần xác nhận; dùng 1:1 per stack)
  const quickWitted = perks['Quick Witted'] ?? 0
  if (quickWitted > 0) {
    const speed = s['speedBoost'] ?? 0
    if (speed > 0) {
      const bonus = r(speed * quickWitted * 0.5) // 50% per stack — điều chỉnh nếu cần
      s['dexterityBoost'] = r((s['dexterityBoost'] ?? 0) + bonus)
    }
  }

  // ── Strong Tides ─────────────────────────────────────────────────────────
  // "Increases your Water Boost based on your Physical Boost."
  // Dùng rate 1:1 per stack (điều chỉnh nếu có data chính xác hơn)
  const strongTides = perks['Strong Tides'] ?? 0
  if (strongTides > 0) {
    const phys = s['physicalBoost'] ?? 0
    if (phys > 0) {
      const bonus = r(phys * strongTides * 0.5)
      s['waterBoost'] = r((s['waterBoost'] ?? 0) + bonus)
    }
  }

  // ── Rocky Body ───────────────────────────────────────────────────────────
  // "Increases your Physical Defense scaling off of your Earth Boost."
  const rockyBody = perks['Rocky Body'] ?? 0
  if (rockyBody > 0) {
    const earth = s['earthBoost'] ?? 0
    if (earth > 0) {
      const bonus = r(earth * rockyBody * 0.5)
      s['physicalDefense'] = r((s['physicalDefense'] ?? 0) + bonus)
    }
  }

  // ── Swift Guard ──────────────────────────────────────────────────────────
  // "Increases your Physical Defense scaling off of your Dexterity Boost."
  const swiftGuard = perks['Swift Guard'] ?? 0
  if (swiftGuard > 0) {
    const dex = s['dexterityBoost'] ?? 0
    if (dex > 0) {
      const bonus = r(dex * swiftGuard * 0.5)
      s['physicalDefense'] = r((s['physicalDefense'] ?? 0) + bonus)
    }
  }

  // ── Frozen Heart ─────────────────────────────────────────────────────────
  // "Increases Physical and Magic Defense as well as Warding scaling on Cold Resistance."
  const frozenHeart = perks['Frozen Heart'] ?? 0
  if (frozenHeart > 0) {
    const cold = s['coldResistance'] ?? 0
    if (cold > 0) {
      const bonus = r(cold * frozenHeart * 0.1)
      s['physicalDefense'] = r((s['physicalDefense'] ?? 0) + bonus)
      s['magicDefense']    = r((s['magicDefense'] ?? 0) + bonus)
      s['warding']         = r((s['warding'] ?? 0) + bonus)
    }
  }

  // ── Spellshield ──────────────────────────────────────────────────────────
  // "Gain Protection based on your Magic Boost and Defense."
  const spellshield = perks['Spellshield'] ?? 0
  if (spellshield > 0) {
    const magic = s['magicBoost'] ?? 0
    const mdef  = s['magicDefense'] ?? 0
    if (magic > 0 || mdef > 0) {
      const bonus = r((magic + mdef) * spellshield * 0.1)
      s['protection'] = r((s['protection'] ?? 0) + bonus)
    }
  }

  // ── Carapace ─────────────────────────────────────────────────────────────
  // "Gain low Protection scaling off of your Earth Boost."
  const carapace = perks['Carapace'] ?? 0
  if (carapace > 0) {
    const earth = s['earthBoost'] ?? 0
    if (earth > 0) {
      const bonus = r(earth * carapace * 0.1)
      s['protection'] = r((s['protection'] ?? 0) + bonus)
    }
  }

  // ── Whirl Foot ───────────────────────────────────────────────────────────
  // "Increases your Speed Boost scaling off of your Air Boost."
  const whirlFoot = perks['Whirl Foot'] ?? 0
  if (whirlFoot > 0) {
    const air = s['airBoost'] ?? 0
    if (air > 0) {
      const bonus = r(air * whirlFoot * 0.5)
      s['speedBoost'] = r((s['speedBoost'] ?? 0) + bonus)
    }
  }

  // ── Immovable ────────────────────────────────────────────────────────────
  // "Reduce received Knockback and increase Physical Defense scaling off of Tenacity."
  const immovable = perks['Immovable'] ?? 0
  if (immovable > 0) {
    const ten = s['tenacity'] ?? 0
    if (ten > 0) {
      const bonus = r(ten * immovable * 10) // Tenacity × 10 → %Defense
      s['physicalDefense'] = r((s['physicalDefense'] ?? 0) + bonus)
    }
  }

  // ── Ferocity ─────────────────────────────────────────────────────────────
  // "Tenacity grants a Damage Multiplier." — stat-side: no direct stat change,
  // affects damage calc. Skip (pure combat formula, not a stat).

  // ── Seismic Momentum ─────────────────────────────────────────────────────
  // "Your crit chance and Damage now scales on your Earth Boost instead of Dexterity Boost."
  // Pure combat formula — no stat modification here.

  // Clean up zeros
  const result: StatMap = {}
  for (const [k, v] of Object.entries(s)) {
    const rv = r(v as number)
    if (rv !== 0) result[k as StatKey] = rv
  }
  return result
}