import { MAX_LEVEL } from '../lib/constants'

export function calcSummonStat(base: number, summonBoostPct: number, level: number): number {
  return Math.round(base * (1 + (summonBoostPct / 100) * (1 + level / MAX_LEVEL)) * 100) / 100
}

const BASE_SUMMON_CAP = 15

export function calcMaxSummonCount(perks: Record<string, number>): number {
  return BASE_SUMMON_CAP + Math.floor(perks['Swarm'] ?? 0)
}

interface SummonAttack {
  label: string
  baseDmg: number
  dmgType: string
  guardbreak?: boolean
}

interface SummonDef {
  name: string
  count: number
  baseHp?: number
  baseDmg: number
  dmgType: string
  attacks?: SummonAttack[]
  tenacity?: number
  notes?: string[]
}

const SUMMON_DEFS: SummonDef[] = [
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
      { label: "Radial Explosion", baseDmg: 20, dmgType: "Magic", guardbreak: true },
      { label: "Beam",             baseDmg: 15, dmgType: "Magic" },
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

type SummonPerkMode =
  | 'spawn_only'
  | 'adaptive'
  | 'passive'

interface SummonPerkDef {
  perkName: string
  description: string
  mode: SummonPerkMode
  affectsDmg?: boolean
  affectsHp?: boolean
  affectsCount?: boolean
  notes?: string
}

const SUMMON_PERK_DEFS: SummonPerkDef[] = [
  {
    perkName: "Swarm",
    description: "Increases max summon count by 1 per stack",
    mode: 'passive',
    affectsCount: true,
  },
]