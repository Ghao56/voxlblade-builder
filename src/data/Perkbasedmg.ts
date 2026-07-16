import { getDotPotencyMult } from './DoTDamage'
import { getDraconicColorDmgMultiplier } from '../data/draconicColorEffects'
import type { ProcCoefficient } from '../lib/types'
import {
  DRAGON_STATE_HP_BASE,
  DRAGON_STATE_HP_PER_STACK,
  DRAGON_STATE_BASE,
  DRAGON_STATE_PER_STACK,
  DRAGON_CLAW_BASE_DAMAGE,
  DRAGON_CLAW_DAMAGE_PER_STACK,
  DRAGON_CLAW_HOLY_HEAL_BASE,
  DRAGON_CLAW_HOLY_HEAL_PER_STACK,
  DRAGON_CLAW_WATER_HEAL_BASE,
  DRAGON_CLAW_WATER_HEAL_PER_STACK,
  DRAGON_BUBBLE_BASE_DAMAGE,
  DRAGON_BUBBLE_DAMAGE_PER_STACK,
  DRAGON_BUBBLE_HOLY_HEAL_BASE,
  DRAGON_BUBBLE_HOLY_HEAL_PER_STACK,
  DRAGON_BUBBLE_WATER_HEAL_BASE,
  DRAGON_BUBBLE_WATER_HEAL_PER_STACK,
  BELLOWING_EMBER_HP_GATE_THRESHOLD,
  BELLOWING_EMBER_HP_GATE_PER_STACK,
  SPORE_BURST_BASE,
  SPORE_BURST_POTENCY_MULT,
} from '../lib/constants'

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
  getThreshold?: (perkAmount: number) => number
  aboveThreshold: boolean
  alwaysActiveAtPerkAmount?: number
}

export function gateThreshold(gate: HpGate | undefined, perkAmount: number): number | undefined {
  if (!gate) return undefined
  if (gate.alwaysActiveAtPerkAmount != null && perkAmount >= gate.alwaysActiveAtPerkAmount) return undefined
  return gate.getThreshold ? gate.getThreshold(perkAmount) : gate.hpThreshold
}

export function isHpGateActive(gate: HpGate | undefined, hpFillPct: number, perkAmount: number): boolean {
  if (!gate) return true
  const threshold = gateThreshold(gate, perkAmount)
  if (threshold == null) return true
  return gate.aboveThreshold ? hpFillPct > threshold : hpFillPct <= threshold
}

export const DRAGON_STATE_HP_GATE: HpGate = {
  hpThreshold: 80,
  aboveThreshold: true,
  getThreshold: (perkAmount) => DRAGON_STATE_HP_BASE - DRAGON_STATE_HP_PER_STACK * perkAmount,
}

export const BELLOWING_EMBER_HP_GATE: HpGate = {
  hpThreshold: BELLOWING_EMBER_HP_GATE_THRESHOLD,
  aboveThreshold: false,
  getThreshold: (perkAmount) => BELLOWING_EMBER_HP_GATE_THRESHOLD + BELLOWING_EMBER_HP_GATE_PER_STACK * (perkAmount - 1),
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
  getFinisherHitBaseDmg?: (ctx: { baseDmg: number; hitIndex: number }) => number
  hits?: number
  getHits?: (ctx: PerkDmgCtx) => number 
  dmgTypeMode: 'weapon' | 'fixed' | 'dynamic'
  dmgTypes?: Record<string, number>
  getDmgTypes?: (ctx: { draconicColor: string }) => Record<string, number>
  scalingMode: 'weapon' | 'fixed' | 'none' | 'dynamic'
  scalings?: Record<string, number>
   getScalings?: (ctx: { draconicColor: string; perkAmount?: number }) => Record<string, number>
  isM1?: boolean
  isM2?: boolean
  isFinisher?: boolean
  isWA?: boolean
  isRune?: boolean
  isProcHit?: boolean
  halfActivations?: boolean
  guardbreak?: boolean
  procCoefficient?: ProcCoefficient
  note?: string
  hpGate?: HpGate
  secondaryEffects?: SecondaryEffect[]
  activeIf?: (ctx: { draconicRuneInfusion: string; draconicColor: string }) => boolean
  requiredBuff?: string
}

export function calcSpringblastBaseDamage(perkAmount: number): number {
  return (6 + 2 * perkAmount) * (1 + 0.1 * perkAmount)
}

export const PERK_DMG_DEFS: PerkDmgDef[] = [
  // ── Springblast ────────────────────────────────────────────────────────────
  {
    perkName: 'Springblast',
    condition: 'On Finisher while Bounce active',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) =>
      Math.round(
        calcSpringblastBaseDamage(perkAmount) /
          (0.5 + finisherHits / 2) * 1000
      ) / 1000,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0 },
    guardbreak: true,
    note: 'Activates on every finisher hit. Reduced chance to proc other effects. Deals high knockback. Half activations with Dual Guns or Storm Caster.',
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
  // ── Buni Spirit ────────────────────────────────────────────────────────────
  {
    perkName: 'Buni Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 2,
    hits: 20,
    dmgTypeMode: 'weapon',
    scalingMode: 'weapon',
    isM2: true,
    isFinisher: true,
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
  // ── Dire Buni Spirit ───────────────────────────────────────────────────────
  {
    perkName: 'Dire Buni Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 25,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'weapon',
    guardbreak: true,
    note: 'Counts as an M1/M2 and will proc related effects.',
  },
  // ── Void Root Spirit ───────────────────────────────────────────────────────
  {
    perkName: 'Void Root Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 1,
    hits: 23,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, physical: 1.0 },
    isM2: true,
    note: 'Each hit has a chance to inflict random debuffs.',
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
    procCoefficient: { type: 'noProc' },
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
    procCoefficient: { type: 'noProc' },
    note: 'Cannot proc other effects. No internal cooldown. Proccing Bleed multiple times in the same hit will proc this perk multiple times.',
  },
  // ── Honey Arts ────────────────────────────────────────────────────────────
  {
    perkName: 'Honey Arts',
    condition: 'On Weapon Art use',
    getBaseDamage: ({ perkAmount }) => 0.625 + 0.6725 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    procCoefficient: { type: 'noProc' },
    secondaryEffects: [
      {
        label: 'Sticky',
        getValue: () => 5,
        format: v => `${v}s`,
        condition: 'Applied on hit',
        tone: 'utility',
      },
    ],
    note: 'Maximum globs depend on WA cooldown. Each glob has small AoE. Cannot proc other effects.',
  },
  // ── Sickness ──────────────────────────────────────────────────────────────
  {
    perkName: 'Sickness',
    condition: 'On sneeze',
    getBaseDamage: ({ perkAmount }) => 2 + 0.5 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 0.5, hex: 0.5 },
    scalingMode: 'fixed',
    scalings: { earth: 1.0, hex: 1.0 },
    note: '10% chance to sneeze per second per 1 of this perk. Applies Sticky (Sickness).',
  },
  // ── Melting Slime ──────────────────────────────────────────────────────────
  {
    perkName: 'Melting Slime',
    condition: 'On Sticky DoT tick',
    getBaseDamage: () => 2.5,
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 0.5, earth: 0.5 },
    scalingMode: 'dynamic',
    getScalings: ({ perkAmount }) => ({
      fire: 0.75 + 0.25 * (perkAmount ?? 1),
      earth: 1.5 + 0.25 * (perkAmount ?? 1),
    }),
    note: 'Fire/Earth DoT · Multi-hit over duration · Poise Damage',
  },
  // ── Whirlwind ───────────────────────────────────────────────────────────────
  {
    perkName: 'Whirlwind',
    condition: 'On Weapon Art or Rune use',
    getBaseDamage: ({ perkAmount }) => 3 + 0.3 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { air: 1.0 },
    scalingMode: 'fixed',
    scalings: { air: 1.0 },
    isWA: true,
    isRune: true,
    note: 'AoE wind slash. Applies Bleed for 5s. Can proc other effects.',
  },
  // ── Dragon State ──────────────────────────────────────────────────────────
  {
    perkName: 'Dragon State',
    condition: 'On M1/M2 while above HP threshold · Once per M1/M2',
    getBaseDamage: ({ perkAmount }) => DRAGON_STATE_BASE + DRAGON_STATE_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 0.75, dexterity: 0.75, holy: 0.75 },
    isProcHit: true,
    hpGate: DRAGON_STATE_HP_GATE,
  },
  // ── Volatile Shell ──────────────────────────────────────────────────────────
  {
    perkName: 'Volatile Shell',
    condition: 'When your Shield is depleted completely',
    getBaseDamage: ({ perkAmount }) => 25 + 20 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, protection: 0.1 },
    secondaryEffects: [
      {
        label: 'Poison',
        getValue: () => 5,
        format: v => `${v}s`,
        condition: 'Applies Poison for 5s',
        tone: 'offense',
      },
    ],
    note: 'Explosion size scales with perk amount · Protection is not a % like other Stat Boosts, making it 100x more effective in scaling',
  },
  // ── Spore Burst ─────────────────────────────────────────────────────────
  {
    perkName: 'Spore Burst',
    condition: 'On Finisher',
    getBaseDamage: ({ perkAmount, statuses }) => {
      const perkPotency = perkAmount * SPORE_BURST_POTENCY_MULT
      const poisonPotency = (statuses?.poisonPotency ?? 0) * SPORE_BURST_POTENCY_MULT
      const base = SPORE_BURST_BASE * (1 + perkPotency)
      const mult = Math.pow(1 + poisonPotency, 1 + Math.min(1, poisonPotency))
      return Math.round(base * mult * 1000) / 1000
    },
    hits: 1,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { dexterity: 1.0, hex: 1.0, earth: 1.0 },
    isProcHit: true,
    procCoefficient: { type: 'noProc' },
    note: 'Only activates once per finisher. Inflicts Poison on self and enemies.',
  },
  // ── Royal Finisher ────────────────────────────────────────────────────
  {
    perkName: 'Royal Finisher',
    condition: 'On Finisher',
    getBaseDamage: ({ perkAmount }) => 3 + perkAmount * 1,
    hits: 1,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    isProcHit: true,
    note: 'Only activates once per finisher.',
  },
  // ── Grounded Despair ─────────────────────────────────────────────────
  {
    perkName: 'Grounded Despair',
    condition: 'On jump and land',
    getBaseDamage: ({ perkAmount }) => 0.45 + 0.45 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 0.5, hex: 0.5 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0, magic: 1.0 },
  },
  // ── Echo Incineration ─────────────────────────────────────────────
  {
    perkName: 'Echo Incineration',
    condition: 'On hit · (10 + 2.5 × perkAmount)% chance',
    getBaseDamage: ({ perkAmount }) => 7 + 1.25 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 0.5, air: 0.5 },
    scalingMode: 'fixed',
    scalings: { fire: 1.0, air: 1.0 },
    guardbreak: true,
    isProcHit: true,
    procCoefficient: { type: 'noProc' },
  },
  // ── Venom Spitter ────────────────────────────────────────────────
  {
    perkName: 'Venom Spitter',
    label: 'Venom Spitter',
    condition: 'On Finisher hit',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) => {
      const base = 2 + 0.6 * perkAmount
      let total = 0
      for (let i = 0; i < finisherHits; i++) {
        total += base / (1 + i / 3)
      }
      return Math.round(total * 1000) / 1000
    },
    getFinisherHitBaseDmg: ({ baseDmg, hitIndex }) =>
      Math.round(baseDmg * 1000 / (1 + hitIndex / 3)) / 1000,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, earth: 1.0 },
    isProcHit: true,
    isFinisher: true,
    procCoefficient: { type: 'noProc' },
    halfActivations: true,
    note: 'Cannot proc other effects. Half activations on Dual Guns or Storm Caster. Grants +10% damage vs Poisoned per 1 of this perk.',
  },
  // ── Cauterize ──────────────────────────────────────────────────────────────
  {
    perkName: 'Cauterize',
    condition: 'On Burn proc — replaces Burn DoT with a single Fire burst (Singed)',
    getBaseDamage: ({ perkAmount, statuses }) => {
      const burnPotency = (statuses?.burnPotency ?? 0) * 0.1
      const mult = getDotPotencyMult(burnPotency)
      const base = (2 + 0.2 * perkAmount) * mult
      return Math.round(base * 1000) / 1000
    },
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 1.0 },
    scalingMode: 'fixed',
    scalings: { fire: 1.5 },
    procCoefficient: { type: 'noProc' },
    note: 'Singed counts as Burn for other perks but deals no DoT damage — only this initial burst. Not a separate debuff. Incompatible with Cursed Flames. Cannot proc other effects. Proccing Burn multiple times in one hit procs this multiple times.',
  },
  // ── Steam Charge ─────────────────────────────────────────────────────────
  {
    perkName: 'Steam Charge',
    condition: 'On RMB (replaced by Steam Blast at max Steam Buildup)',
    getBaseDamage: () => 6,
    hits: 10,
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 0.5, air: 0.5 },
    scalingMode: 'fixed',
    scalings: { fire: 1.0, air: 1.0 },
    isM2: true,
    isFinisher: true,
    guardbreak: true,
    procCoefficient: { type: 'hasCoeff', value: 0.5 },
    requiredBuff: 'Steam Buildup',
    note: 'Replaces RMB with a 10-hit Steam Blast at max Steam Buildup. Guardsbreak. Reduced chance to proc other effects.',
  },
]