// src/data/cdr.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cooldown Reduction data per perk.
// Chỉnh sửa file này để thêm/sửa CDR của từng perk.
//
// Fields:
//   runePct   — % giảm Rune CD per stack (additive same-source). 0.10 = 10%
//   waPct     — % giảm Weapon Art CD per stack
//   runeFilter — nếu có, chỉ áp dụng cho Rune có name nằm trong list này
//   waFilter  — nếu có, chỉ áp dụng cho WA có name nằm trong list này
// ─────────────────────────────────────────────────────────────────────────────

export interface PerkCDREntry {
  runePct?: number
  waPct?: number

  runeMultiplier?: (perkAmount: number) => number
  waMultiplier?: (perkAmount: number) => number

  runeSetCD?: number
  runeFilter?: string[]
  waFilter?: string[]
}

export const CDR_PERK_DATA: Record<string, PerkCDREntry> = {
  "Caster": {
    runePct: 0.15,
    waPct: 0.15,
  },
  "Channeled Weapon": {
    waMultiplier: (perkAmount) => 0.8 - 0.05 * perkAmount,
  }
}