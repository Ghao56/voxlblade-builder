import type { ProcCoefficient } from '../lib/types'

export const BADGE_CONFIG: Record<string, { color: string; label: string; title: string }> = {
  'Dragon State':  { color: '#a78bfa', label: '✦ Dragon', title: 'Dragon State: additional wave of Magic above HP threshold · Once per M1/M2' },
  'Spore Burst': { color: '#d900ff', label: '✦ Spore Burst', title: 'Spore Burst: burst of poison on finisher · Once per finisher' },
  'Chain':   { color: '#AAFFDB', label: 'Chain', title: 'Lightning Cloak: 1/3 of hit damage as Air+Magic chain lightning (up to 4 targets)' },
  'Luminescent': { color: '#fbbf24', label: '✦ Luminescent', title: 'Luminescent Fervor: 5% × perk amount of this hit\'s damage' },
  'Explosive': { color: '#f97316', label: '✦ Explosive', title: 'Explosive Charge: 100% of WA pre-boost damage as Physical+Fire explosion' },
  'Springblast': { color: '#f438d7', label: '✦ Springblast', title: 'Springblast: explosion on finisher while Bounce active · Per finisher hit' },
  'Royal Finisher': { color: '#60a5fa', label: '✦ Royal Finisher', title: 'Royal Finisher: damaging wave of Magic on finisher · Once per finisher' },
  'Curse Rip': { color: '#e879f9', label: '✦ Curse Rip', title: 'Curse Rip: 1/60 of damage dealt as lifesteal (requires debuffed opponent)' },
  'Inspiration': { color: '#ffde0f', label: '✦ Inspiration', title: 'Inspiration: pulse that slightly heals when M1/M2 land' },
  'Venom Eater': { color: '#4ade80', label: '✦ Venom Eater', title: 'Venom Eater: heal 0.1 HP per stack on crit vs poisoned target' },
  'Blub':  { color: '#38bdf8', label: '✦ Blub', title: 'Blub Blub: 15% × perk amount of this hit\'s damage as Water · 2 hits · 50% proc chance' },
  'Blood Thirsty': { color: '#ef4444', label: '✦ Blood Thirsty', title: 'Blood Thirsty: heal 0.3 HP per stack on hit vs Bleeding target' },
  'Echo Incineration': { color: '#f97316', label: '✦ Echo', title: 'Echo Incineration: (10+2.5×perkAmount)% for Fire+Air on hit' },
  'Venom Spitter': { color: '#a855f7', label: '✦ Venom Spitter', title: 'Venom Spitter: Finisher hits deal Hex damage + Damage Boost vs Poisoned' },
  'Cauterize': { color: '#fd5d00', label: '✦ Cauterize', title: 'Cauterize: Burn bursts as instant Fire (Singed) on any hit that can proc' },
  'Bombardier': { color: '#f97316', label: '✦ Bombardier', title: 'Bombardier: explosion on any hit · RNG chance · Cannot proc other effects' },
  'Phantom Pain': { color: '#e879f9', label: '✦ Phantom Pain', title: 'Phantom Pain: repeats a portion of the hit\'s damage as Hex after a short delay · Cannot proc other effects' },
  'Ichor Spark': { color: '#AAFFDB', label: '✦ Ichor Spark', title: 'Ichor Spark Chain Lightning: 20% × perk amount of this hit\'s damage as Air+Physical chain lightning (up to ? targets) · 12.5% chance at 1 perk' },
  'Lifesteal': { color: '#4ade80', label: '✦ Lifesteal', title: 'Lifesteal: heal 0.5% of damage dealt per stack + 0.1 flat HP per stack' },
  'Runic Blades': { color: '#43d8ff', label: '✦ Runic Blades', title: 'Runic Blades: magic proc on any hit vs Runic Blades target · Scales with weapon' },
  'Gnawing Poison': { color: '#22c55e', label: '✦ Gnawing Poison', title: 'Gnawing Poison: bites all Poisoned enemies on finisher · Burst of Hex+Physical · Grants Poison Potency' },
  'Cloudpush': { color: '#AAFFDB', label: '✦ Cloudpush', title: 'Cloudpush: deal x% of your damage as bonus air damage that counts as the applier\'s damage' },
  'Cinderpull': { color: '#f97316', label: '✦ Cinderpull', title: 'Cinderpull: deal x% of your damage as bonus fire damage that counts as the applier\'s damage' },
  'Quake': { color: '#a3722a', label: '✦ Quake', title: 'Quake: Earth shockwave on hit · RNG chance · Guardbreak · Cannot proc other effects' },
  'Sandnado': { color: '#d4a547', label: '✦ Sandnado', title: 'Ruler Of The Sands: sandnado on WA/Rune use · Reduced proc coefficient · Earth+Air damage' },
  'Blazing Finisher': { color: '#f97316', label: '✦ Blazing', title: 'Blazing Finisher: fire AoE on finisher vs burning · 2×perkAmount + 20% of finisher damage' },
  'Star Struck': { color: '#fde047', label: '✦ Star', title: 'Star Struck: landed M1/M2 shoot stars · random damage type · True star deals 6 base with 0.5 Magic scaling · stars can proc other on-hit effects' },
}

export interface ComputedType {
  key: string; label: string; color: string
  typeBase: number; scalingMult: number; combatMult: number
  applicableBoosts: Array<{ perkName: string; label: string; mult: number }>
  weaponBoostMult: number; weaponBoostLabel?: string
  typeDebuffMult: number
  defMult: number; enemyDefPct: number
  raw: number; critVal: number
  isHeal: boolean
  tag?: string
  oncePerGroup?: boolean
  isCurseRip?: boolean
  forceCrit: boolean
  isCritExempt?: boolean
  ungroup?: boolean
  phantomPainPct?: number
  healBoostMult?: number
  procCoefficient?: ProcCoefficient
  hitCount?: number
  activationDivisor?: number
  subHits?: number
  _bfBonusBase?: number
  _bfBonusRaw?: number
}

export interface PerkOnHitDmg {
  tag: string
  baseDmg: number
  scalingMult: number
  combatMult: number
  totalDmg: number
  dmgTypes: Record<string, number>
  procCoefficient?: ProcCoefficient
  isProcHit?: boolean
  rawFinisherNumerator?: number
  halfActivations?: boolean
  oncePerFinisher?: boolean
  alwaysOnHit?: boolean
  finisherOnly?: boolean
  getFinisherHitBaseDmg?: (ctx: { baseDmg: number; hitIndex: number }) => number
  canApplyBurn?: boolean
  weaponBoostMult?: number
  weaponBoostLabel?: string
}

export interface ComputedHit {
    group: string; index: number; count: number; isFinisher: boolean; label?: string
    isHeal: boolean
    types: ComputedType[]
    procCoefficient?: ProcCoefficient
    procCount?: number
    finisherGroupHitCount?: number
    eachHitM1M2?: boolean
}
