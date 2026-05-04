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
//   note      — ghi chú hiển thị trong UI (optional)
// ─────────────────────────────────────────────────────────────────────────────

export interface PerkCDREntry {
  runePct?: number
  waPct?: number
  runeSetCD?: number
  runeFilter?: string[]
  waFilter?: string[]
  note?: string
}

export const CDR_PERK_DATA: Record<string, PerkCDREntry> = {
  "Caster": {
    runePct: 0.10,
    waPct: 0.10,
    note: "Rune and Weapon Art Cooldown reduction",
  },
  "Mage Rage": {
    runePct: 0.15,
    note: "Rune Cooldown Reduction",
  },
  "Gladiatorial Rage": {
    runeSetCD: 30,
    runeFilter: ["Rage Rune"],
    note: "Sets Rage Rune base CD to 30s",
  },
  "Quickcast": {
    waPct: 0.10,
    note: "Weapon Art cast speed / CDR",
  },
  "Poison Acceleration": {
    runePct: 0.10,
    waPct: 0.10,
    note: "WA and Rune CDR while Poisoned",
  },
  "Whirlwind": {
    runePct: 0.10,
    note: "Rune CDR",
  },
  "Channeled Weapon": {
    waPct: 0.10,
    note: "Weapon Art CDR",
  },
}