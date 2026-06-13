export function calcSummonStat(base: number, summonBoostPct: number, level: number): number {
  return Math.round(base * (1 + (summonBoostPct / 100) * (1 + level / 80)) * 100) / 100
}

export interface SummonAttack {
  label: string
  baseDmg: number
  dmgType: string
  guardbreak?: boolean
}

export interface SummonDef {
  name: string
  count: number
  baseHp?: number
  baseDmg: number
  dmgType: string
  attacks?: SummonAttack[]
  tenacity?: number
  notes?: string[]
}

export const SUMMON_DEFS: SummonDef[] = [
  {
    name: "Mage Bomber",
    count: 2,
    baseDmg: 35,
    dmgType: "magic",
    notes: ["High knockback resistance", "Explosion on contact"],
  },
  {
    name: "Blessedling",
    count: 2,
    baseDmg: 20,
    dmgType: "holy",
    attacks: [
      { label: "Radial Explosion", baseDmg: 20, dmgType: "holy", guardbreak: true },
      { label: "Beam",             baseDmg: 15, dmgType: "holy" },
    ],
    notes: ["Radial explosion guardbreaks"],
  },
]

export const SUMMON_MAP = Object.fromEntries(SUMMON_DEFS.map(s => [s.name, s]))

export const WA_SUMMON_MAP: Record<string, string> = {
  "Mage Bomber Summon":    "Mage Bomber",
  "Blessedlings Summon":   "Blessedling",
  "Toaladin Summon":       "Toaladin",
  "Undead Buni Summon":    "Undead Buni",
  "Skeletal Woof Summon":  "Skeletal Woof",
}

// ── 3. Perks ảnh hưởng summon ────────────────────────────────────────────────
export type SummonPerkMode =
  | 'spawn_only'
  | 'adaptive'
  | 'passive'

export interface SummonPerkDef {
  perkName: string
  description: string
  mode: SummonPerkMode
  affectsDmg?: boolean
  affectsHp?: boolean
  affectsCount?: boolean
  notes?: string
}

export const SUMMON_PERK_DEFS: SummonPerkDef[] = [
  {
    perkName: "Swarm",
    description: "Increases max summon count by 1 per stack",
    mode: 'passive',
    affectsCount: true,
  },
]