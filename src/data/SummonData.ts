import { MAX_LEVEL } from '../lib/constants'

export type SummonSource =
  | 'Possession'
  | 'Spore Trooper'
  | 'Croakernaut Rune'
  | 'Pack Leader Rune'
  | 'Sporeling Toss Rune'
  | 'Swarm Rune'
  | 'Blessedlings Summon'
  | 'Mage Bomber Summon'
  | 'Skeletal Woof Summon'
  | 'Toaladin Summon'
  | 'Undead Buni Summon'

const DECAY_BY_SOURCE: Record<SummonSource, number> = {
  Possession: 1.5,
  'Spore Trooper': 1,
  'Croakernaut Rune': 2,
  'Pack Leader Rune': 4,
  'Sporeling Toss Rune': 2,
  'Swarm Rune': 2,
  'Blessedlings Summon': 2,
  'Mage Bomber Summon': 3,
  'Skeletal Woof Summon': 1,
  'Toaladin Summon': 1,
  'Undead Buni Summon': 2,
}
// display-only accessor (SPEC ③): SummonPanel shows the RAW decay value
// beside the computed decayPerSec. Reading only — no logic here.
export function getSummonBaseDecay(source: SummonSource): number {
  return DECAY_BY_SOURCE[source]
}

const BASE_SUMMON_CAP = 15

export interface AppliedStatus {
  name: string
  potency: number
  durationSec: number
}

export interface SummonAttack {
  label: string
  baseDmg: number
  dmgType: string
  guardbreak?: boolean
  appliesStatus?: AppliedStatus[]
}

export interface SummonDef {
  name: string
  count: number
  baseHp: number
  baseDmg: number
  dmgType: string
  attacks?: SummonAttack[]
  source: SummonSource
  description?: string
  tenacity?: number
  physicalDefenseBoost?: number
  magicDefenseBoost?: number
  airDefenseBoost?: number
  waterDefenseBoost?: number
  buffs?: SummonBuffOrDebuff[]
  notes?: string[]
}

export interface SummonBuffOrDebuff {
  name: string
  value: number
}

export interface SummonInstance {
  def: SummonDef
  level: number
  spawnBoostPct: number // locked at summon time
  currentHp: number
  currentBoostPct: number // player's current boost
  decayPerSec: number // computed at summon, static after
  source: SummonSource
  spawnedAt: number // timestamp ms
  // Trusty Servant (1 without the perk). currentHp already includes the HP
  // mult; damage consumers multiply calcSummonDamage output by trustyDmgMult.
  trustyDmgMult: number
  trustyHpMult: number
  trustyTiers: TrustyServantTiers | null // null when the perk is absent
  buffs?: SummonBuffOrDebuff[]     // from Inspiration / Blessing / Sweet Tooth...
  debuffs?: SummonBuffOrDebuff[]   // external statuses applied to summon
}

export function calcSummonStat(base: number, summonBoostPct: number, level: number): number {
  return Math.round(base * (1 + (summonBoostPct / 100) * (1 + level / MAX_LEVEL)) * 100) / 100
}

export function calcSummonMaxHp(baseHp: number, spawnBoostPct: number, level: number): number {
  return calcSummonStat(baseHp, spawnBoostPct, level)
}

export function calcSummonDamage(baseDmg: number, currentBoostPct: number, spawnBoostPct: number, level: number): number {
  const effectiveBoost = Math.min(currentBoostPct, spawnBoostPct)
  return calcSummonStat(baseDmg, effectiveBoost, level)
}

// ── Trusty Servant multipliers (perk card, owner-confirmed reading 2026-11) ──
// Base boost stays 300% (damage) / 100% (HP) for EVERY summon; only the
// per-stack INCREMENT changes with the summon's base HP tier. Boost
// semantics = tool convention: member ×(1 + boostPct/100).
export interface TrustyServantTiers {
  dmgIncr: number // +100%/stack, or 150 (base HP ≤ 150) / 200 (≤ 75)
  hpIncr: number  // +50%/stack, or 75 (base HP < 200) / 100 (< 100)
}

export function getTrustyServantTiers(baseHp: number): TrustyServantTiers {
  return {
    dmgIncr: baseHp <= 75 ? 200 : baseHp <= 150 ? 150 : 100,
    hpIncr: baseHp < 100 ? 100 : baseHp < 200 ? 75 : 50,
  }
}

export function calcTrustyServantDmgBoostPct(baseHp: number, stacks: number): number {
  const t = getTrustyServantTiers(baseHp)
  return 300 + t.dmgIncr * Math.max(0, Math.floor(stacks))
}

export function calcTrustyServantHpBoostPct(baseHp: number, stacks: number): number {
  const t = getTrustyServantTiers(baseHp)
  return 100 + t.hpIncr * Math.max(0, Math.floor(stacks))
}

export function calcSummonBuffDmgMult(
  buffs: SummonBuffOrDebuff[] = [],
  offBuffs: Iterable<string> = new Set<string>(),
): number {
  const off = new Set(offBuffs)
  let mult = 1
  for (const b of buffs) {
    if (off.has(b.name)) continue
    if (b.name === 'Rage Potency') mult *= 1 + b.value
  }
  return Math.round(mult * 100) / 100
}

function calcSummonDecayPercent(baseDecayPercent: number, spawnBoostPct: number): number {
  return baseDecayPercent / (1 + spawnBoostPct / 100)
}

export function calcMaxSummonCount(perks: Record<string, number>, hasTrustyServant: boolean = false): number {
  // Trusty Servant caps summons at 1 and Swarm cannot raise the cap under it
  // (perk card: "you may only have one minion at a time" / "Does not increase
  // summon cap when the user has Trusty Servant").
  if (hasTrustyServant || !!(perks['Trusty Servant'])) return 1
  return BASE_SUMMON_CAP + Math.floor(perks['Swarm'] ?? 0)
}

// TODO(summon-ui): unmodeled Swarm effects — "Reduces Summon HP and Damage by
// 25% - 5% * perkAmount" and "Doubles amount of summons spawned (any source)".
// Not fixed here; report-only per task scope.

function applySacrificialSummoning(decayPercent: number): number {
  // Sacrificial Summoning reduces decay by 25% relative to current decay
  return Math.round(decayPercent * 0.75 * 100) / 100
}

function applyTrustyServant(): { maxCount: number; decayPercent: number } {
  return { maxCount: 1, decayPercent: 0 }
}

export const SUMMON_DEFS: SummonDef[] = [
  {
    name: 'Mage Bomber',
    count: 2,
    baseHp: 100,
    baseDmg: 35,
    dmgType: 'magic',
    source: 'Mage Bomber Summon',
    tenacity: 0.5,
    physicalDefenseBoost: 0,
    attacks: [
      { label: 'Blast', baseDmg: 35, dmgType: 'Magic' },
    ],
    notes: ['High knockback resistance', 'Explosion on contact'],
  },
  {
    name: 'Blessedling',
    count: 2,
    baseHp: 80,
    baseDmg: 20,
    dmgType: 'holy',
    source: 'Blessedlings Summon',
    tenacity: 0.3,
    physicalDefenseBoost: 0.2,
    attacks: [
      { label: 'Radial Explosion', baseDmg: 20, dmgType: 'Magic', guardbreak: true },
      { label: 'Beam', baseDmg: 15, dmgType: 'Magic' },
    ],
    notes: ['Radial explosion guardbreaks'],
  },
  {
    name: 'Skeletal Woof',
    count: 1,
    baseHp: 120,
    baseDmg: 25,
    dmgType: 'physical',
    source: 'Skeletal Woof Summon',
    tenacity: 0.4,
    physicalDefenseBoost: 0.1,
    attacks: [{ label: 'Bite', baseDmg: 25, dmgType: 'Physical' }],
  },
  {
    name: 'Toaladin',
    count: 1,
    baseHp: 150,
    baseDmg: 40,
    dmgType: 'physical',
    source: 'Toaladin Summon',
    tenacity: 0.6,
    airDefenseBoost: -0.25,
    magicDefenseBoost: 0.2,
    waterDefenseBoost: 1,
    attacks: [
      { label: 'Slash', baseDmg: 20, dmgType: 'Physical' },
      { label: 'Body Slam', baseDmg: 25, dmgType: 'Physical' },
    ],
  },
  {
    name: 'Undead Buni',
    count: 2,
    baseHp: 90,
    baseDmg: 22,
    dmgType: 'hex',
    source: 'Undead Buni Summon',
    tenacity: 0.2,
    physicalDefenseBoost: 0.05,
  },
  {
    name: 'Spore Trooper',
    count: 2,
    baseHp: 70,
    baseDmg: 18,
    dmgType: 'magic',
    source: 'Spore Trooper',
    tenacity: 0.1,
  },
  {
    name: 'Possession',
    count: 1,
    baseHp: 200,
    baseDmg: 45,
    dmgType: 'physical',
    source: 'Possession',
    tenacity: 0.8,
  },
  {
    name: 'Croakernaut',
    count: 1,
    baseHp: 110,
    baseDmg: 28,
    dmgType: 'hex',
    source: 'Croakernaut Rune',
    tenacity: 0.35,
  },
  {
    name: 'Pack Leader',
    count: 3,
    baseHp: 60,
    baseDmg: 15,
    dmgType: 'physical',
    source: 'Pack Leader Rune',
    tenacity: 0.15,
  },
  {
    name: 'Sporeling',
    count: 2,
    baseHp: 50,
    baseDmg: 12,
    dmgType: 'magic',
    source: 'Sporeling Toss Rune',
    tenacity: 0.1,
  },
  {
    name: 'Bumblz',
    count: 3,
    baseHp: 50,
    baseDmg: 7,
    dmgType: 'physical',
    source: 'Swarm Rune',
    description: 'Spawns 3 Bumblz with the same stats as one',
    magicDefenseBoost: 0.2,
    attacks: [
      {
        label: 'Sting',
        baseDmg: 7,
        dmgType: 'Physical',
        appliesStatus: [{ name: 'Poison', potency: 0, durationSec: 5 }],
      },
    ],
    notes: ['Magic Defense +20%'],
  },
]

export const SUMMON_MAP = Object.fromEntries(SUMMON_DEFS.map(s => [s.name, s]))

export const WA_SUMMON_MAP: Record<string, string> = {
  'Mage Bomber Summon': 'Mage Bomber',
  'Blessedlings Summon': 'Blessedling',
  'Toaladin Summon': 'Toaladin',
  'Undead Buni Summon': 'Undead Buni',
  'Skeletal Woof Summon': 'Skeletal Woof',
  'Spore Trooper': 'Spore Trooper',
  'Possession': 'Possession',
  'Croakernaut Rune': 'Croakernaut',
  'Pack Leader Rune': 'Pack Leader',
  'Sporeling Toss Rune': 'Sporeling',
  'Swarm Rune': 'Bumblz',
}

type SummonPerkMode = 'spawn_only' | 'adaptive' | 'passive'

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
    perkName: 'Swarm',
    description: 'Increases max summon count by 1 per stack',
    mode: 'passive',
    affectsCount: true,
  },
  {
    perkName: 'Sacrificial Summoning',
    description: 'Reduces summon decay by 25%',
    mode: 'adaptive',
    notes: 'Applied when summon is spawned',
  },
  {
    perkName: 'Trusty Servant',
    description: 'Removes decay from affected summons; limits to 1 summon total',
    mode: 'passive',
    affectsCount: true,
    affectsDmg: true,
    affectsHp: true,
    notes: 'Decay becomes 0. Dmg/HP multipliers implemented via calcTrustyServant*BoostPct (owner-confirmed per-stack-increment reading, 2026-11). TODO: tenacity multiplier — perk desc mentions one but the card gives no formula.',
  },
  {
    perkName: 'Sweet Tooth',
    description: 'Buffs summon damage (adaptive)',
    mode: 'adaptive',
    affectsDmg: true,
  },
  {
    perkName: 'Inspiration',
    description: 'Provides heal/buff to summons (adaptive)',
    mode: 'adaptive',
    affectsHp: true,
  },
  {
    perkName: 'Blessing',
    description: 'General buff that applies to summons when spawned',
    mode: 'spawn_only',
    affectsDmg: true,
    affectsHp: true,
  },
  {
    perkName: 'Smoldering',
    description: 'Does NOT apply to summons unless explicitly stated',
    mode: 'passive',
    affectsDmg: false,
    notes: 'Excluded from summon damage bonuses',
  },
]

const SUMMON_PERK_MAP = Object.fromEntries(SUMMON_PERK_DEFS.map(p => [p.perkName, p]))

export function createSummonInstance(
  def: SummonDef,
  level: number,
  playerBoostPct: number,
  perks: Record<string, number> = {},
  buffs?: SummonBuffOrDebuff[],
  debuffs?: SummonBuffOrDebuff[]
): SummonInstance {
  const spawnBoostPct = playerBoostPct
  const source = def.source
  const baseDecay = DECAY_BY_SOURCE[source]
  let decayPerSec = calcSummonDecayPercent(baseDecay, spawnBoostPct)

  const hasSacrificial = !!(perks['Sacrificial Summoning'])
  const hasTrusty = !!(perks['Trusty Servant'])

  if (hasSacrificial) {
    decayPerSec = applySacrificialSummoning(decayPerSec)
  }
  if (hasTrusty) {
    const ts = applyTrustyServant()
    decayPerSec = ts.decayPercent
  }

  const maxHp = calcSummonMaxHp(def.baseHp, spawnBoostPct, level)
  const trustyStacks = Math.max(0, Math.floor(perks['Trusty Servant'] ?? 0))
  const trustyDmgMult = trustyStacks > 0 ? 1 + calcTrustyServantDmgBoostPct(def.baseHp, trustyStacks) / 100 : 1
  const trustyHpMult = trustyStacks > 0 ? 1 + calcTrustyServantHpBoostPct(def.baseHp, trustyStacks) / 100 : 1

  return {
    def,
    level,
    spawnBoostPct,
    currentHp: maxHp * trustyHpMult,
    currentBoostPct: playerBoostPct,
    decayPerSec,
    source,
    spawnedAt: Date.now(),
    trustyDmgMult,
    trustyHpMult,
    trustyTiers: trustyStacks > 0 ? getTrustyServantTiers(def.baseHp) : null,
    buffs: buffs ?? def.buffs ?? [],
    debuffs: debuffs ?? [],
  }
}
