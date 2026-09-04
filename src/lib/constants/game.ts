// ──────────────────────────────────────────────
// Core game constants (single source of truth)
// ──────────────────────────────────────────────

export const MAX_LEVEL = 80
export const DEFAULT_LEVEL = 80
export const DEFAULT_HP_FILL = 100
export const DEFAULT_ENEMY_HP_FILL = 100
export const DEFAULT_INVENTORY_FILL = 250
export const MAX_INVENTORY_ITEMS = 250

const BASE_HP = 120
const HP_PER_LEVEL = 0.0125

export function calcBaseMaxHP(level: number): number {
  return Math.round(BASE_HP * (1 + level * HP_PER_LEVEL))
}

// ──────────────────────────────────────────────
// Timing constants
// ──────────────────────────────────────────────

export const SAVE_DEBOUNCE_MS = 300
export const UNDO_WINDOW_MS = 8000
export const SEARCH_BLUR_DELAY_MS = 150
export const IMPORT_SUCCESS_DISPLAY_MS = 2000
export const FOCUS_DELAY_MS = 20
export const DEFAULT_TOAST_DURATION_MS = 3000
