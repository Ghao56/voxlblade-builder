import { applyBuffPerkModifiers, type GrantedBuff } from './BuffData'

const DRACONIC_INFUSION_COLOR_EFFECTS: Record<string, (perkAmt: number) => string> = {
  air:   perkAmt => `+${perkAmt * 10}% Attack Speed · +${perkAmt * 20}% Knockback `,
  fire:  perkAmt => `100% chance to apply Burn (proc-affected) · +${perkAmt * 15}% applied Burn potency`,
  hex:   perkAmt => `+${perkAmt * 5}% applied debuff potency · +${perkAmt * 15}% debuff duration`,
  holy:  perkAmt => `+${perkAmt * 10}% healing  · +${perkAmt * 5}% applied buff potency`,
  water: perkAmt => `Immune to debuffs · Pulse every ${Math.max(1, 8 - perkAmt)}s (heal 0.1 · 1.0 Water scaling · cleanses)`,
  earth: perkAmt => `+${perkAmt * 15}% Poise damage · +${Math.round(perkAmt * 0.15 * 1000) / 1000} Stun Resistance `,
}
export function getEffectiveDraconicInfusionPotency(
    guildName: string,
    draconicRuneInfusion: string,
    draconicColor: string,
    draconicBloodPerkAmt: number,
    perks: Record<string, number>,
): number {
    const rawBuffs = getDraconicInfusionBuff(guildName, draconicRuneInfusion, draconicColor, draconicBloodPerkAmt)
    if (rawBuffs.length === 0) return 0
    const [modified] = applyBuffPerkModifiers(rawBuffs, perks)
    return modified.potency
}

export function getDraconicInfusionBuff(
    guildName: string,
    draconicRuneInfusion: string,
    draconicColor: string,
    draconicBloodPerkAmt: number,
): GrantedBuff[] {
    if (guildName !== 'Draconic') return []
    if (draconicRuneInfusion !== 'infusion') return []

    const perkAmt = draconicBloodPerkAmt
    const color   = draconicColor
    const potency = Math.round(perkAmt * (color === 'holy' ? 0.115 : 0.1) * 1000) / 1000

    const colorLabel = color ? color.charAt(0).toUpperCase() + color.slice(1) : ''
    const effectFn    = color ? DRACONIC_INFUSION_COLOR_EFFECTS[color] : undefined
    const colorEffect = effectFn ? `${colorLabel}: ${effectFn(perkAmt)}` : 'No Dragon Blooded color → Physical damage type'

    return [{
        buffName:   'Draconic Infusion',
        isSelfDebuff: false,
        potency,
        duration:   20,
        condition:  `Dragon Infusion active · ${colorEffect}`,
        sourceName: 'Dragon Infusion',
        sourceType: 'rune' as const,
    }]
}

export function getDraconicHexDebuffs(
    guildName: string,
    draconicRuneInfusion: string,
    draconicColor: string,
    draconicBloodPerkAmt: number,
): GrantedBuff[] {
    if (guildName !== 'Draconic') return []
    const ability = draconicRuneInfusion
    if (draconicColor !== 'hex') return []
    if (ability !== 'claw' && ability !== 'bubble') return []

    const perkAmt = draconicBloodPerkAmt
    const abilityLabel = ability === 'claw' ? 'Dragon Claw' : 'Dragon Bubble'
    const srcName  = `${abilityLabel} (Hex)`
    const poolCond = `${abilityLabel} · Hex · 3 random chances from pool`

    return [
        { buffName: 'Weakness', potency: Math.round(perkAmt * 0.1 * 1000) / 1000, duration: 5, condition: `${abilityLabel} · Hex · on hit (guaranteed)`, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Bleed',    potency: 0,   duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Burn',     potency: 0,   duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Poison',   potency: 0,   duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Shatter',  potency: 0.2, duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Slowness', potency: 0.2, duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
        { buffName: 'Weakness', potency: 0.5, duration: 5, condition: poolCond, sourceName: srcName, sourceType: 'rune' as const, isSelfDebuff: false },
    ]
}