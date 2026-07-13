export const DMG_TYPE_META: Record<string, { label: string; color: string }> = {
  physical: { label: 'Physical', color: '#fb923c' },
  magic:    { label: 'Magic',    color: '#818cf8' },
  fire:     { label: 'Fire',     color: '#f97316' },
  water:    { label: 'Water',    color: '#38bdf8' },
  earth:    { label: 'Earth',    color: '#a3e635' },
  air:      { label: 'Air',      color: '#AAFFDB' },
  hex:      { label: 'Hex',      color: '#e879f9' },
  holy:     { label: 'Holy',     color: '#facc15' },
  true:     { label: 'True',     color: '#f87171' },
  summon:   { label: 'Summon',   color: '#c084fc' },
  heal:     { label: 'Heal',     color: '#4ade80' },
}

export const DEF_TRACKED_TYPES = ['physical','magic','fire','water','earth','air','hex','holy'] as const

export const DEF_INHERITANCE: Record<string, string> = {
  air:   'physical',
  earth: 'physical',
  fire:  'water',
  water:  'magic',
  hex:   'magic',
  holy:  'magic',
}

export const PHYSICAL_INHERITED_TYPES = new Set(['air', 'earth'])

export const MAGIC_INHERITED_TYPES = new Set(['fire', 'water', 'hex', 'holy'])

export const FALLBACK_DMG_COLOR = '#e8e4da'
