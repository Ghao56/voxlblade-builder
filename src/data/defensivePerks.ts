interface DefensivePerkSourceContext {
  hpFillPct: number
  adaptivePlateTriggered: boolean
  inDarkness: boolean
  rageActive: boolean
  isMounted: boolean
  hasProtection: boolean
  uniqueDebuffCount: number
}

interface DefensivePerkSource {
  perkName: string
  drPctPerStack?: number
  fixedDefPct?: number
  maxDrPct?: number
  isFlat?: boolean
  label: string
  conditionLabel: string
  hpBelowThreshold?: number
  minPerkForAlways?: number
  matchedOnly?: boolean
  dependsOn?: (ctx: DefensivePerkSourceContext) => boolean
  potencyCapped?: boolean
  grantsStunImmunity?: boolean
  drPctFn?: (amt: number, ctx: DefensivePerkSourceContext) => number
}

const DEFENSIVE_PERK_SOURCES: DefensivePerkSource[] = [
  {
    perkName: 'Barbskin',
    drPctPerStack: 20,
    label: 'Barbskin',
    conditionLabel: 'Grants damage reduction while bleeding per 1 of this perk',
  },
  {
    perkName: 'Stoneskin',
    drPctPerStack: 30,
    maxDrPct: 80,
    isFlat: true,
    label: 'Stoneskin',
    conditionLabel: 'Stoneskin lasts for the entirety of the Weapon Art animation and 50% of its cooldown after cooldown reduction effects',
  },
  {
    perkName: 'Adaptive Plate',
    drPctPerStack: 10,
    label: 'Adaptive Plate',
    conditionLabel: 'While bubble is active (vs all damage)',
  },
  {
    perkName: 'Adaptive Plate',
    drPctPerStack: 50,
    label: 'Adaptive Plate (Triggered types)',
    conditionLabel: 'Against the type(s) that triggered it — 10% all + 40% matched, additive',
    matchedOnly: true,
  },
  {
    perkName: 'Protector Spirit',
    drPctPerStack: 20,
    isFlat: true,
    label: 'Protector Spirit',
    conditionLabel: 'Below 50% HP (or always at 2+ perk) · 3s cooldown between activations',
    hpBelowThreshold: 50,
    minPerkForAlways: 2,
  },
  {
    perkName: 'Air Pressure',
    drPctPerStack: 10,
    label: 'Air Pressure (Max Potency)',
    conditionLabel: 'Air Pressure (Max Potency)',
    potencyCapped: true, // <-- Đánh dấu Air Pressure không nhận hệ số buff hiệu lực (potMult)
  },
  {
    perkName: 'Valor',
    drPctPerStack: 50,
    maxDrPct: 50,
    label: 'Valor (Shield Block)',
    conditionLabel: 'While blocking with one-handed weapon or spear',
  },
  {
    perkName: 'Vampire',
    drPctPerStack: 10 / 3,
    label: 'Vampire',
    conditionLabel: 'In darkness · removed in sunlight',
    dependsOn: ctx => ctx.inDarkness,
  },
  {
    perkName: 'Frenzy',
    drPctPerStack: 0,
    fixedDefPct: -30,
    label: 'Frenzy (Self)',
    conditionLabel: 'While Rage is active · flat, regardless of perk amount',
    dependsOn: ctx => ctx.rageActive,
    potencyCapped: true,
  },
  {
    perkName: 'Stored Corruption',
    drPctPerStack: -5,
    label: 'Stored Corruption',
    conditionLabel: 'Increases damage taken by 5% per 1 of this perk',
  },
  {
    perkName: 'Mounted Defense',
    drPctPerStack: 30,
    label: 'Mounted Defense',
    conditionLabel: 'While mounted on Glacial Snapper',
    dependsOn: ctx => ctx.isMounted,
  },
  {
    perkName: 'Carapace',
    drPctPerStack: 15,
    label: 'Carapace',
    conditionLabel: 'While you have Shield HP',
    dependsOn: ctx => ctx.hasProtection,
    grantsStunImmunity: true,
  },
  {
    perkName: 'Cursed Bark',
    label: 'Cursed Bark',
    conditionLabel: 'Per unique debuff on target',
    drPctFn: (amt, ctx) => 5 * ctx.uniqueDebuffCount * amt,
  },
]

export function getActiveDefensivePerkSources(
  perks: Record<string, number>,
  hpFillPct: number = 100,
  adaptivePlateTriggered: boolean = false,
  inDarkness: boolean = true,
  rageActive: boolean = false,
  isMounted: boolean = false,
  hasProtection: boolean = false,
  uniqueDebuffCount: number = 0,
): Array<{ name: string; defPct: number; isFlat?: boolean; condition: string; potencyCapped?: boolean; grantsStunImmunity?: boolean }> {
  const out: Array<{ name: string; defPct: number; isFlat?: boolean; condition: string; potencyCapped?: boolean; grantsStunImmunity?: boolean }> = []
  const ctx: DefensivePerkSourceContext = { hpFillPct, adaptivePlateTriggered, inDarkness, rageActive, isMounted, hasProtection, uniqueDebuffCount }

  for (const def of DEFENSIVE_PERK_SOURCES) {
    const amt = perks[def.perkName] ?? 0
    if (amt <= 0) continue
    if (def.hpBelowThreshold != null) {
      const bypassByPerk = def.minPerkForAlways != null && amt >= def.minPerkForAlways
      if (!bypassByPerk && hpFillPct >= def.hpBelowThreshold) continue
    }
    if (def.perkName === 'Adaptive Plate') {
      if (def.matchedOnly && !adaptivePlateTriggered) continue
      if (!def.matchedOnly && adaptivePlateTriggered) continue
    }
    if (def.dependsOn && !def.dependsOn(ctx)) continue

    let defPct = def.fixedDefPct ?? (def.drPctFn ? def.drPctFn(amt, ctx) : (def.drPctPerStack ?? 0) * amt)
    if (def.maxDrPct != null) defPct = Math.min(defPct, def.maxDrPct)
    defPct = Math.round(defPct * 100) / 100

    out.push({ 
      name: def.label, 
      defPct, 
      isFlat: def.isFlat, 
      condition: def.conditionLabel,
      potencyCapped: def.potencyCapped,
      grantsStunImmunity: def.grantsStunImmunity,
    })
  }
  return out
}

export function calcDefensivePotencyMult(
  perks: Record<string, number>,
  draconicRuneInfusion: string,
  draconicColor: string,
): number {
  let potMult = 1

  const bastionStacks = perks['Bastion Bless'] ?? 0
  if (bastionStacks > 0) {
    potMult += 0.1 * bastionStacks
  }

  if (draconicRuneInfusion === 'infusion' && draconicColor === 'holy') {
    const infPerkAmt = perks['Draconic Blood'] ?? 0
    potMult *= 1 + infPerkAmt * 0.05
  }

  return potMult
}