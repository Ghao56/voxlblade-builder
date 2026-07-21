import { VOID_RAGE_PCT_PER_STACK, CHANNELED_WEAPON_PCT_PER_STACK, EMOTIONAL_PCT_PER_STACK, DRACONIC_BLOOD_PCT_PER_STACK } from '../constants/perks'
import { getEffectiveDraconicInfusionPotency } from '../../data/draconicBuffs'

export interface PerkDmgTypeBonusDef {
  perkName: string
  type?: string
  getType?: (ctx: { draconicColor: string }) => string
  amountPerStack: number
  getAmountPerStack?: (ctx: { draconicColor: string; perkAmount: number; guild: string; draconicRuneInfusion: string; perks: Record<string, number> }) => number
  condition?: (ctx: { ragePotency: number; draconicRuneInfusion: string; emotionalState: string; rageDisabled: boolean }) => boolean
  appliesWithoutProc?: boolean
}

export const PERK_DMG_TYPE_BONUS_DEFS: PerkDmgTypeBonusDef[] = [
  { perkName: 'Void Rage', type: 'hex', amountPerStack: VOID_RAGE_PCT_PER_STACK, condition: ctx => !ctx.rageDisabled && ctx.ragePotency > 0 },
  { perkName: 'Channeled Weapon', type: 'magic', amountPerStack: CHANNELED_WEAPON_PCT_PER_STACK },
  { perkName: 'Emotional', type: 'fire', amountPerStack: EMOTIONAL_PCT_PER_STACK, condition: ctx => ctx.emotionalState === 'debuffs' },
  {
    perkName: 'Draconic Blood',
    getType: ctx => ctx.draconicColor || 'physical',
    amountPerStack: DRACONIC_BLOOD_PCT_PER_STACK,
    getAmountPerStack: ctx => {
      if (ctx.perkAmount <= 0) return 0
      const effective = getEffectiveDraconicInfusionPotency(ctx.guild, ctx.draconicRuneInfusion, ctx.draconicColor || 'physical', ctx.perkAmount, ctx.perks)
      return effective / ctx.perkAmount
    },
    condition: ctx => ctx.draconicRuneInfusion === 'infusion',
    appliesWithoutProc: false,
  },
]

export function buildDmgTypeBonuses(includeNoProcExempt: boolean, ctx: {
  perks: Record<string, number>; ragePotency: number; draconicRuneInfusion: string;
  emotionalState: string; draconicColor: string; guild: string;
  draconicInfusionDisabled: boolean; toxinTransferHexBonus: number; rageDisabled: boolean;
}, excludePerks?: Set<string>): Record<string, number> {
  const bonus: Record<string, number> = {}
  for (const def of PERK_DMG_TYPE_BONUS_DEFS) {
    if (excludePerks?.has(def.perkName)) continue
    if (!includeNoProcExempt && def.appliesWithoutProc === false) continue
    const amt = ctx.perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (def.condition && !def.condition({ ragePotency: ctx.ragePotency, draconicRuneInfusion: ctx.draconicRuneInfusion, emotionalState: ctx.emotionalState, rageDisabled: ctx.rageDisabled })) continue
    if (def.perkName === 'Draconic Blood' && ctx.draconicInfusionDisabled) continue
    const type = def.getType ? def.getType({ draconicColor: ctx.draconicColor }) : def.type
    if (!type) continue
    const amountPerStack = def.getAmountPerStack
      ? def.getAmountPerStack({ draconicColor: ctx.draconicColor, perkAmount: amt, guild: ctx.guild, draconicRuneInfusion: ctx.draconicRuneInfusion, perks: ctx.perks })
      : def.amountPerStack
    bonus[type] = Math.round(((bonus[type] ?? 0) + amt * amountPerStack) * 10000) / 10000
  }
  if (ctx.toxinTransferHexBonus > 0) {
    bonus.hex = Math.round(((bonus.hex ?? 0) + ctx.toxinTransferHexBonus) * 10000) / 10000
  }
  return bonus
}
