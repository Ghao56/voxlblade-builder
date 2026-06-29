import { getDraconicColorDmgMultiplier } from '../data/draconicColorEffects'

export const DRAGON_CLAW_BASE_DAMAGE = 25
export const DRAGON_CLAW_DAMAGE_PER_STACK = 2.5
export const DRAGON_CLAW_HOLY_HEAL_BASE = 5
export const DRAGON_CLAW_HOLY_HEAL_PER_STACK = 0.5
export const DRAGON_CLAW_WATER_HEAL_BASE = 1.923
export const DRAGON_CLAW_WATER_HEAL_PER_STACK = 0.1923

export const DRAGON_BUBBLE_BASE_DAMAGE = 20
export const DRAGON_BUBBLE_DAMAGE_PER_STACK = 2
export const DRAGON_BUBBLE_HOLY_HEAL_BASE = 4
export const DRAGON_BUBBLE_HOLY_HEAL_PER_STACK = 0.4
export const DRAGON_BUBBLE_WATER_HEAL_BASE = 1.538
export const DRAGON_BUBBLE_WATER_HEAL_PER_STACK = 0.1538

export interface PerkDmgCtx {
  perkAmount: number
  finisherHits?: number
  m1FinisherHits?: number
  statuses?: Record<string, number> 
  draconicColor?: string
}
export type SecondaryEffectTone = 'defense' | 'offense' | 'utility'

export interface HpGate {
  hpThreshold: number
  aboveThreshold: boolean
  alwaysActiveAtPerkAmount?: number
}

export function isHpGateActive(gate: HpGate | undefined, hpFillPct: number, perkAmount: number): boolean {
  if (!gate) return true
  if (gate.alwaysActiveAtPerkAmount != null && perkAmount >= gate.alwaysActiveAtPerkAmount) return true
  return gate.aboveThreshold ? hpFillPct > gate.hpThreshold : hpFillPct <= gate.hpThreshold
}

export interface SecondaryEffect {
  label: string
  getValue: (ctx: PerkDmgCtx) => number
  format?: (value: number) => string
  condition?: string
  tone?: SecondaryEffectTone
  hpGate?: HpGate
  showIf?: (ctx: { draconicColor: string }) => boolean
}

export const SECONDARY_TONE_COLORS: Record<SecondaryEffectTone, string> = {
  defense: '#f87171',
  offense: '#fb923c',
  utility: '#8a8d85',
}

export interface PerkDmgDef {
  perkName: string
  label?: string
  condition?: string
  getBaseDamage: (ctx: PerkDmgCtx) => number
  hits?: number
  getHits?: (ctx: PerkDmgCtx) => number 
  dmgTypeMode: 'weapon' | 'fixed' | 'dynamic'
  dmgTypes?: Record<string, number>
  getDmgTypes?: (ctx: { draconicColor: string }) => Record<string, number>
  scalingMode: 'weapon' | 'fixed' | 'none' | 'dynamic'
  scalings?: Record<string, number>
  getScalings?: (ctx: { draconicColor: string }) => Record<string, number>
  isM1?: boolean
  isM2?: boolean
  isFinisher?: boolean
  isWA?: boolean
  isRune?: boolean
  guardbreak?: boolean
  note?: string
  hpGate?: HpGate
  secondaryEffects?: SecondaryEffect[]
  activeIf?: (ctx: { draconicRuneInfusion: string; draconicColor: string }) => boolean
}

export const PERK_DMG_DEFS: PerkDmgDef[] = [
  // ── Springblast ────────────────────────────────────────────────────────────
  {
    perkName: 'Springblast',
    condition: 'On Finisher while Bounce active',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) =>
      Math.round(
        ((6 + 2 * perkAmount) * (1 + 0.1 * perkAmount)) /
          (0.5 + finisherHits / 2) * 1000
      ) / 1000,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0 },
    guardbreak: true,
    note: 'Per proc (÷ by finisher hit count).',
  },
  // ── Basic Spirit ───────────────────────────────────────────────────────────
  {
    perkName: 'Basic Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 9,
    hits: 3,
    dmgTypeMode: 'weapon',
    scalingMode: 'weapon',
    isM2: true,
    isFinisher: true,
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects.',
  },
  // ── Mageling Spirit ────────────────────────────────────────────────────────
  {
    perkName: 'Mageling Spirit',
    condition: 'On WA or Rune use (Monk)',
    getBaseDamage: () => 27.5,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    isRune: true,
    guardbreak: true,
    note: 'Resets cooldown of the activating WA/Rune. Counts as rune damage.',
  },
  // ── Toadzerker Spirit ────────────────────────────────────────────────────────
  {
    perkName: 'Toadzerker Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 30,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical : 1.0},
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects.',
  },
  // ── Bounce Momentum ────────────────────────────────────────────────────────
  {
    perkName: 'Bounce Momentum',
    condition: 'On Finisher (Tongue Shot active after jumping with Bounce)',
    getBaseDamage: ({ perkAmount }) => 5 + 2.5 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { water: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { water: 1.0 },
    guardbreak: true,
    note: 'Stuns and briefly immobilizes the target.',
  },
  {
    perkName: 'Protector Spirit',
    condition: 'While above 50% HP the spirit guardian will fire a tiny beam attack at an enemy struck by your M1/M2',
    getBaseDamage: ({ perkAmount }) => 0.4 + 0.1 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 0.5, magic: 0.5 },
    scalingMode: 'fixed',
    scalings: { earth: 0.5, magic: 0.5 },
    hpGate: { hpThreshold: 50, aboveThreshold: true, alwaysActiveAtPerkAmount: 2 },
    secondaryEffects: [
      {
        label: 'DR below 50% HP',
        getValue: ({ perkAmount }) => 20 * perkAmount,
        format: v => `${v}%`,
        condition: 'Flat, non-diminishing · 3s CD per activation',
        tone: 'defense',
        hpGate: { hpThreshold: 50, aboveThreshold: false, alwaysActiveAtPerkAmount: 2 },
      },
    ],
    note: 'Spirit fires one beam at a time. Beam + DR both active simultaneously at 2+ stacks.',
  },
  // ── Air Pressure ───────────────────────────────────────────────────────────
  {
    perkName: 'Air Pressure',
    condition: 'Upon using a rune release an air burst',
    getBaseDamage: ({ perkAmount }) => 7.5 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { air: 1.0 },
    scalingMode: 'fixed',
    scalings: { air: 1.0 },
    isRune: true,
    secondaryEffects: [
      {
        label: 'Damage Reduction',
        getValue: ({ perkAmount }) => 10 * perkAmount,
        format: v => `${v}%`,
        tone: 'defense',
      }
    ]
  },
  // ── Air Barrier ────────────────────────────────────────────────────────
  {
    perkName: 'Air Barrier',
    condition: 'Blocking an attack',
    getBaseDamage: ({perkAmount}) => 3*perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { air: 1.0 },
    scalingMode: 'fixed',
    scalings: { air : 1.0},
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects.',
  },
  // ── Apollo Boost ───────────────────────────────────────────────────────────
  {
    perkName: 'Apollo Boost',
    condition: 'On Rune use (after cast finishes)',
    getBaseDamage: ({ perkAmount }) => 5 - (0.15 + 0.25 * perkAmount),
    getHits: ({ perkAmount }) => Math.floor(1 + 2 * perkAmount),
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0, physical: 1.0 },
    isRune: true,
    secondaryEffects: [
      {
        label: 'Taunt',
        getValue: () => 15,
        format: v => `~${v}s`,
        condition: 'Enemies hit by the shockwave',
        tone: 'utility',
      },
    ],
    note: 'Overrides Launch Rune boost / Combat Roll Rune roll if used together. Launch height also scales with perk amount (not modeled).',
  },
  // ── Dragon Claw (Draconic Rune Infusion ability) ────────────────────────────
  {
    perkName: 'Draconic Blood',
    label: 'Dragon Claw',
    condition: 'Draconic Rune Infusion · Dragon Claw selected',
    getBaseDamage: ({ perkAmount }) => DRAGON_CLAW_BASE_DAMAGE + DRAGON_CLAW_DAMAGE_PER_STACK * perkAmount,
    dmgTypeMode: 'dynamic',
    getDmgTypes: ({ draconicColor }) => ({ [draconicColor || 'physical']: 1.0 }),
    scalingMode: 'dynamic',
    getScalings: ({ draconicColor }) => ({ [draconicColor || 'physical']: 1.0 }),
    guardbreak: true,
    isRune: true,
    activeIf: ({ draconicRuneInfusion }) => draconicRuneInfusion === 'claw',
    secondaryEffects: [
      { label: 'Poise Damage', getValue: () => 60, tone: 'offense' },
      {
        label: 'Color Damage Multiplier',
        getValue: ({ draconicColor }) => getDraconicColorDmgMultiplier(draconicColor ?? ''),
        format: v => `×${v}`,
        condition: 'Earth ×1.5 · Water ×1.1 · others ×1.0',
        tone: 'offense',
      },
      {
        label: 'Base Heal (Holy)',
        getValue: ({ perkAmount }) => DRAGON_CLAW_HOLY_HEAL_BASE + DRAGON_CLAW_HOLY_HEAL_PER_STACK * perkAmount,
        tone: 'utility',
        showIf: ({ draconicColor }) => draconicColor === 'holy',
      },
      {
        label: 'Base Heal (Water)',
        getValue: ({ perkAmount }) => Math.round((DRAGON_CLAW_WATER_HEAL_BASE + DRAGON_CLAW_WATER_HEAL_PER_STACK * perkAmount) * 1000) / 1000,
        tone: 'utility',
        showIf: ({ draconicColor }) => draconicColor === 'water',
      },
    ],
  },
  // ── Dragon Bubble (Draconic Rune Infusion ability) ───────────────────────────
  {
    perkName: 'Draconic Blood',
    label: 'Dragon Bubble',
    condition: 'Draconic Rune Infusion · Dragon Bubble selected',
    getBaseDamage: ({ perkAmount }) => DRAGON_BUBBLE_BASE_DAMAGE + DRAGON_BUBBLE_DAMAGE_PER_STACK * perkAmount,
    dmgTypeMode: 'dynamic',
    getDmgTypes: ({ draconicColor }) => ({ [draconicColor || 'physical']: 1.0 }),
    scalingMode: 'dynamic',
    getScalings: ({ draconicColor }) => ({ [draconicColor || 'physical']: 1.0 }),
    guardbreak: true,
    isRune: true,
    activeIf: ({ draconicRuneInfusion }) => draconicRuneInfusion === 'bubble',
    secondaryEffects: [
      { label: 'Poise Damage', getValue: () => 45, tone: 'offense' },
      {
        label: 'Color Damage Multiplier',
        getValue: ({ draconicColor }) => getDraconicColorDmgMultiplier(draconicColor ?? ''),
        format: v => `×${v}`,
        condition: 'Earth ×1.5 · Water ×1.1 · others ×1.0',
        tone: 'offense',
      },
      {
        label: 'Base Heal (Holy)',
        getValue: ({ perkAmount }) => DRAGON_BUBBLE_HOLY_HEAL_BASE + DRAGON_BUBBLE_HOLY_HEAL_PER_STACK * perkAmount,
        tone: 'utility',
        showIf: ({ draconicColor }) => draconicColor === 'holy',
      },
      {
        label: 'Base Heal (Water)',
        getValue: ({ perkAmount }) => Math.round((DRAGON_BUBBLE_WATER_HEAL_BASE + DRAGON_BUBBLE_WATER_HEAL_PER_STACK * perkAmount) * 1000) / 1000,
        tone: 'utility',
        showIf: ({ draconicColor }) => draconicColor === 'water',
      },
    ],
  },
  // ── Roaring Heads (Roar) ───────────────────────────
  {
    perkName: 'Roaring Heads',
    label: 'Roaring Heads (Roar)',
    getBaseDamage: ({ perkAmount }) => 5 + 2.5 * perkAmount,
    dmgTypes: { hex: 1.0 },
    dmgTypeMode: 'fixed',
    scalingMode: 'fixed',
    scalings: { hex: 1.0 },
    condition: 'Every 10th self-inflicted debuff · 1s CD between roars',
    note: 'Stuns on roar',
  },
  // ── Barbed Flurry ───────────────────────────────────────────────────────────
  {
    perkName: 'Barbed Flurry',
    condition: 'Reapplying Bleed on already Bleeding enemies',
    getBaseDamage: ({ perkAmount }) => 1.6 + 0.32 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0, dexterity: 1.0 },
    note: 'Cannot proc other effects. No internal cooldown. Proccing Bleed multiple times in the same hit will proc this perk multiple times.',
  },
]