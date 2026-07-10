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
  'Venom Eater': { color: '#4ade80', label: '✦ Venom Eater', title: 'Venom Eater: heal 0.1 HP per stack on crit vs poisoned target' },
  'Blub':  { color: '#38bdf8', label: '✦ Blub', title: 'Blub Blub: 15% × perk amount of this hit\'s damage as Water · 2 hits · 50% proc chance' },
  'Blood Thirsty': { color: '#ef4444', label: '✦ Blood Thirsty', title: 'Blood Thirsty: heal 0.3 HP per stack on hit vs Bleeding target' },
  'Echo Incineration': { color: '#f97316', label: '✦ Echo', title: 'Echo Incineration: (10+2.5×perkAmount)% for Fire+Air on hit' },
  'Venom Spitter': { color: '#a855f7', label: '✦ Venom Spitter', title: 'Venom Spitter: Finisher hits deal Hex damage + Damage Boost vs Poisoned' },
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
  healBoostMult?: number
  procCoefficient?: ProcCoefficient
  hitCount?: number
  activationDivisor?: number
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
  getFinisherHitBaseDmg?: (ctx: { baseDmg: number; hitIndex: number }) => number
}

export interface ComputedHit {
    group: string; index: number; count: number; isFinisher: boolean; label?: string
    isHeal: boolean
    types: ComputedType[]
    procCoefficient?: ProcCoefficient
}
