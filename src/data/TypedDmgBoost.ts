import type { GrantedBuff } from './BuffData'

export interface TypedDmgBoostCtx {
  perks: Record<string, number>
  activeBuffs?: GrantedBuff[]
  inSunlight?: boolean
  draconicColor?: string
}

interface TypedDmgBoostDef {
  perkName: string
  label: string
  potencySource: 'buff' | 'perkAmount'
  buffName?: string
  getAffectedTypes: (potencyOrAmount: number, ctx: TypedDmgBoostCtx) => string[]
  getDamageMultiplier?: (potencyOrAmount: number) => number
  getHealMultiplier?: (potencyOrAmount: number) => number
  activeIf?: (ctx: TypedDmgBoostCtx) => boolean
  conditionLabel: string
  appliesToGroups?: string[]
}

const TYPED_DMG_BOOST_DEFS: TypedDmgBoostDef[] = [
  {
    perkName: 'Glyph Conduit',
    label: 'Glyph Conduit',
    potencySource: 'buff',
    buffName: 'Glyph Conduit',
    getAffectedTypes: () => ['magic'],
    getDamageMultiplier: (potency) => potency > 0 ? 1 + potency * 2 : 1,
    conditionLabel: 'On RMB or Rune use (buff active)',
  },
  {
    perkName: 'Rage',
    label: 'Rage',
    potencySource: 'buff',
    buffName: 'Rage',
    getAffectedTypes: (_potency, ctx) => {
      const types = ['physical']
      if ((ctx.perks['Mage Rage'] ?? 0) > 0) types.push('magic')
      if ((ctx.perks['Oceans Rage'] ?? 0) > 0) types.push('water')
      if ((ctx.perks['Scourge'] ?? 0) > 0) types.push('true')
      if ((ctx.perks['Cursed Experiment'] ?? 0) > 0) types.push('hex')
      return types
    },
    getDamageMultiplier: (potency) => potency > 0 ? 1 + potency : 1,
    conditionLabel: 'While Rage is active',
  },
  {
    perkName: 'Photosynthesis',
    label: 'Photosynthesis',
    potencySource: 'perkAmount',
    getAffectedTypes: () => ['holy', 'earth'],
    getDamageMultiplier: (amt) => 1 + 0.2 * amt,
    getHealMultiplier: (amt) => 1 + 0.15 * amt,
    activeIf: (ctx) => !!ctx.inSunlight,
    conditionLabel: 'While standing in Sunlight',
  },
]

function getMaxBuffPotency(buffName: string, activeBuffs: GrantedBuff[] | undefined): number {
  if (!activeBuffs || activeBuffs.length === 0) return 0
  const matches = activeBuffs.filter(b => b.buffName === buffName)
  if (matches.length === 0) return 0
  return Math.max(...matches.map(b => b.potency))
}

export interface TypedDmgBoostEntry {
  perkName: string
  label: string
  types: string[]
  dmgMult: number
  healMult: number
  condition: string
  appliesToGroups?: string[]
}

export interface TypedDmgBoostResult {
  dmgMultByType: Record<string, number>
  healMult: number
  activeEntries: TypedDmgBoostEntry[]
}

export function calcTypedDmgBoosts(
  perks: Record<string, number>,
  ctx: TypedDmgBoostCtx
): TypedDmgBoostResult {
  const dmgMultByType: Record<string, number> = {}
  let healMult = 1
  const activeEntries: TypedDmgBoostEntry[] = []

  for (const def of TYPED_DMG_BOOST_DEFS) {
    const perkAmount = perks[def.perkName] ?? 0
    if (def.activeIf && !def.activeIf(ctx)) continue

    const drivingValue = def.potencySource === 'buff'
      ? getMaxBuffPotency(def.buffName!, ctx.activeBuffs)
      : perkAmount

    if (def.potencySource !== 'buff' && perkAmount <= 0) continue
    if (drivingValue <= 0) continue

    const dmgMult = def.getDamageMultiplier ? def.getDamageMultiplier(drivingValue) : 1
    const hMult = def.getHealMultiplier ? def.getHealMultiplier(drivingValue) : 1
    if (dmgMult === 1 && hMult === 1) continue

    const types = def.getAffectedTypes(drivingValue, ctx)
    for (const t of types) {
      dmgMultByType[t] = (dmgMultByType[t] ?? 1) * dmgMult
    }
    if (hMult !== 1) healMult *= hMult

    activeEntries.push({
      perkName: def.perkName,
      label: def.label,
      types,
      dmgMult,
      healMult: hMult,
      condition: def.conditionLabel,
      appliesToGroups: def.appliesToGroups,
    })
  }

  return { dmgMultByType, healMult, activeEntries }
}