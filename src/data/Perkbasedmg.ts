import { getDotPotencyMult } from './DoTDamage'
import { getDraconicColorDmgMultiplier } from '../data/draconicColorEffects'
import type { BuildState, ProcCoefficient } from '../lib/types'
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
  DRAGON_CLAW_POISE_DAMAGE,
  DRAGON_BUBBLE_BASE_DAMAGE,
  DRAGON_BUBBLE_DAMAGE_PER_STACK,
  DRAGON_BUBBLE_HOLY_HEAL_BASE,
  DRAGON_BUBBLE_HOLY_HEAL_PER_STACK,
  DRAGON_BUBBLE_WATER_HEAL_BASE,
  DRAGON_BUBBLE_WATER_HEAL_PER_STACK,
  DRAGON_BUBBLE_POISE_DAMAGE,
  BELLOWING_EMBER_HP_GATE_THRESHOLD,
  BELLOWING_EMBER_HP_GATE_PER_STACK,
  SPORE_BURST_BASE,
  SPORE_BURST_POTENCY_MULT,
  SPORE_BURST_ROUND,
  SPRINGBLAST_BASE_HIT,
  SPRINGBLAST_PER_STACK_HIT,
  SPRINGBLAST_MULT_PER_STACK,
  SPRINGBLAST_DENOM_HALF,
  SPRINGBLAST_ROUND,
  BASIC_SPIRIT_BASE_DMG,
  BASIC_SPIRIT_HITS,
  BUNI_SPIRIT_BASE_DMG,
  BUNI_SPIRIT_HITS,
  MAGELING_SPIRIT_BASE_DMG,
  TOADZERKER_SPIRIT_BASE_DMG,
  DIRE_BUNI_SPIRIT_BASE_DMG,
  VOID_ROOT_SPIRIT_BASE_DMG,
  VOID_ROOT_SPIRIT_HITS,
  BOUNCE_MOMENTUM_BASE_DMG,
  BOUNCE_MOMENTUM_DMG_PER_STACK,
  PROTECTOR_SPIRIT_BASE_DMG,
  PROTECTOR_SPIRIT_DMG_PER_STACK,
  PROTECTOR_SPIRIT_HP_GATE,
  PROTECTOR_SPIRIT_ALWAYS_ACTIVE_AT,
  AIR_PRESSURE_DMG_PER_STACK,
  AIR_BARRIER_DMG_PER_STACK,
  APOLLO_BOOST_BASE,
  APOLLO_BOOST_SUB_BASE,
  APOLLO_BOOST_PER_STACK,
  APOLLO_BOOST_HITS_BASE,
  APOLLO_BOOST_HITS_PER_STACK,
  APOLLO_BOOST_TAUNT_DURATION,
  ROARING_HEADS_BASE_DMG,
  ROARING_HEADS_DMG_PER_STACK,
  BARBED_FLURRY_BASE_DMG,
  BARBED_FLURRY_DMG_PER_STACK,
  HONEY_ARTS_BASE_DMG,
  HONEY_ARTS_DMG_PER_STACK,
  HONEY_ARTS_STICKY_DURATION,
  SICKNESS_BASE_DMG,
  SICKNESS_DMG_PER_STACK,
  MELTING_SLIME_BASE_DMG,
  MELTING_SLIME_FIRE_SCALE_BASE,
  MELTING_SLIME_FIRE_SCALE_PER_STACK,
  MELTING_SLIME_EARTH_SCALE_BASE,
  MELTING_SLIME_EARTH_SCALE_PER_STACK,
  WHIRLWIND_BASE_DMG,
  WHIRLWIND_DMG_PER_STACK,
  VOLATILE_SHELL_BASE_DMG,
  VOLATILE_SHELL_DMG_PER_STACK,
  VOLATILE_SHELL_POISON_DURATION,
  ROYAL_FINISHER_BASE_DMG,
  ROYAL_FINISHER_DMG_PER_STACK,
  GROUNDED_DESPAIR_BASE_DMG,
  GROUNDED_DESPAIR_DMG_PER_STACK,
  ECHO_INCINERATION_BASE_DMG,
  ECHO_INCINERATION_DMG_PER_STACK,
  VENOM_SPITTER_BASE_DMG,
  VENOM_SPITTER_DMG_PER_STACK,
  VENOM_SPITTER_HIT_DIVISOR,
  FIERY_PURSUIT_BASE_DMG,
  FIERY_PURSUIT_DMG_PER_STACK,
  FIERY_PURSUIT_BURN_DURATION,
  BOMBER_CHARGE_BASE,
  BOMBER_CHARGE_PCT_PER_STACK,
  BOMBER_CHARGE_MISSING_HP_MULT,
  BOMBER_CHARGE_MISSING_HP_CAP,
  ROGUENT_SPIRIT_BASE_DMG,
  ROGUENT_SPIRIT_HITS,
  DARK_HARVEST_BASE_DAMAGE,
  DARK_HARVEST_DAMAGE_PER_STACK,
  DARK_HARVEST_HP_GATE_THRESHOLD,
  DARK_HARVEST_HEAL_PER_STACK,
  DARK_HARVEST_COOLDOWN,
  PHANTOM_PAIN_BASE_PCT,
  PHANTOM_PAIN_PERK_MULT,
  PYRE_BLOOM_BASE_DMG,
  PYRE_BLOOM_DMG_PER_STACK,
  PYRE_BLOOM_CD_DMG_DIVISOR,

  PYRE_BLOOM_AMMO_BASE,
  PYRE_BLOOM_AMMO_PER_STACK,
  PYRE_BLOOM_AMMO_CD_DIVISOR,
  PYRE_BLOOM_AMMO_CD_SUBTRACT,
  PYRE_BLOOM_AMMO_MIN,
  PYRE_BLOOM_AMMO_MAX,
  PYRE_BLOOM_FIRERATE_DIVISOR,
  PYRE_BLOOM_MAX_ACTIVE_BASE,
  PYRE_BLOOM_MAX_ACTIVE_PER_STACK,
  PYRE_BLOOM_BURN_DURATION,
  BASTION_BALLISTA_BASE_DMG,
  BASTION_BALLISTA_DMG_PER_STACK,
  BASTION_BALLISTA_MAX_POTENCY_BASE,
  BASTION_BALLISTA_RESTORE_DELAY,
  BASTION_BALLISTA_FIRE_COOLDOWN,
  BASTION_BALLISTA_PROC_COEFF,
  RUNIC_BLADES_BASE_DMG,
  RUNIC_BLADES_DMG_PER_STACK,
  RUNIC_BLADES_DEBUFF_DURATION_PER_STACK,
  RUNIC_BLADES_INNER_COOLDOWN,
  GNAWING_POISON_BASE_DMG,
  GNAWING_POISON_DMG_PER_STACK,
  GNAWING_POISON_COOLDOWN,
  PROPELLING_FUN_BASE_DMG,
  PROPELLING_FUN_DMG_PER_STACK,
  PROPELLING_FUN_COOLDOWN,
  QUAKE_BASE_DMG,
  QUAKE_DMG_PER_STACK,
  QUAKE_CHANCE_BASE,
  QUAKE_CHANCE_PER_STACK,
  RULER_SANDS_BASE_DMG_PER_HIT,
  RULER_SANDS_HITS,
  RULER_SANDS_CHANCE_CD_MULT,
  RULER_SANDS_CHANCE_PERK_MULT,
  ICHOR_SPARK_SWIPE_BASE_A,
  ICHOR_SPARK_SWIPE_BASE_B,
  ICHOR_SPARK_SLASH_BASE_A,
  ICHOR_SPARK_SLASH_BASE_B,
  ICHOR_SPARK_CHARGE_DMG_MULT,
  ICHOR_SPARK_CHARGE_TIME_BASE,
  ICHOR_SPARK_CHARGE_TIME_PER_STACK,
  ICHOR_SPARK_SLASH_HEAL_BASE,
  ICHOR_SPARK_SLASH_CHARGE_THRESHOLD,
  ICHOR_SPARK_BLEED_DURATION,
} from '../lib/constants'

export interface PerkSliderDef {
  buildKey: keyof BuildState
  label: string
  min: number
  max: number
  step?: number
  getMax?: (ctx: { perks: Record<string, number> }) => number
}

export interface PerkDmgCtx {
  perkAmount: number
  finisherHits?: number
  m1FinisherHits?: number
  statuses?: Record<string, number>
  draconicColor?: string
  missingHpPct?: number
  propellingFunElement?: 'air' | 'fire'
  sliderVal?: number
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

export interface TriggerChainEntry {
  perk: string
  trigger: 'always' | 'chance'
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
  getDmgTypes?: (ctx: { draconicColor: string; propellingFunElement?: 'air' | 'fire' }) => Record<string, number>
  scalingMode: 'weapon' | 'fixed' | 'none' | 'dynamic'
  scalings?: Record<string, number>
   getScalings?: (ctx: { draconicColor: string; perkAmount?: number; propellingFunElement?: 'air' | 'fire' }) => Record<string, number>
  isM1?: boolean
  isM2?: boolean
  isFinisher?: boolean
  isWA?: boolean
  isRune?: boolean
  isProcHit?: boolean
  finisherOnly?: boolean
  halfActivations?: boolean
  forceCrit?: boolean
  guardbreak?: boolean
  procCoefficient?: ProcCoefficient
  note?: string
  hpGate?: HpGate
  enemyHpGate?: HpGate
  secondaryEffects?: SecondaryEffect[]
  triggerChain?: TriggerChainEntry[]
  activeIf?: (ctx: { draconicRuneInfusion: string; draconicColor: string; selectedWeaponArt?: string }) => boolean
  requiredBuff?: string
  requiredEnemyDebuff?: string
  slider?: PerkSliderDef
}

export function calcSpringblastBaseDamage(perkAmount: number): number {
  return (SPRINGBLAST_BASE_HIT + SPRINGBLAST_PER_STACK_HIT * perkAmount) * (1 + SPRINGBLAST_MULT_PER_STACK * perkAmount)
}

export function calcBomberChargeBaseDamage(perkAmount: number, missingHpPct: number): number {
  const missingPct = Math.min(BOMBER_CHARGE_MISSING_HP_CAP, missingHpPct / 100)
  const base = BOMBER_CHARGE_BASE * (1 + BOMBER_CHARGE_PCT_PER_STACK * perkAmount) * (1 + BOMBER_CHARGE_MISSING_HP_MULT * missingPct)
  return Math.round(base * 1000) / 1000
}

function calcIchorSparkChargeMult(chargePct: number): number {
  return 1 + ICHOR_SPARK_CHARGE_DMG_MULT * chargePct / 100
}

function calcIchorSparkSwipeBase(perkAmount: number, chargePct: number): number {
  const base = ICHOR_SPARK_SWIPE_BASE_A + ICHOR_SPARK_SWIPE_BASE_B * perkAmount
  return base * calcIchorSparkChargeMult(chargePct)
}

function calcIchorSparkSlashBase(perkAmount: number, chargePct: number): number {
  const base = ICHOR_SPARK_SLASH_BASE_A + ICHOR_SPARK_SLASH_BASE_B * perkAmount
  return base * calcIchorSparkChargeMult(chargePct)
}

function calcIchorSparkChargeTime(perkAmount: number): number {
  return ICHOR_SPARK_CHARGE_TIME_BASE - ICHOR_SPARK_CHARGE_TIME_PER_STACK * perkAmount
}

export const PERK_DMG_DEFS: PerkDmgDef[] = [
  // ── Springblast ────────────────────────────────────────────────────────────
  {
    perkName: 'Springblast',
    condition: 'On Finisher while Bounce active',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) =>
      Math.round(
          calcSpringblastBaseDamage(perkAmount) /
          (SPRINGBLAST_DENOM_HALF + finisherHits / 2) * SPRINGBLAST_ROUND
      ) / SPRINGBLAST_ROUND,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0 },
    guardbreak: true,
    note: 'Activates on every finisher hit. Reduced chance to proc other effects. Deals high knockback. Half activations with Dual Guns or Storm Caster.',
  },
  // ── Bastion Ballista ─────────────────────────────────────────────────────
  {
    perkName: 'Bastion Ballista',
    label: 'Bastion Ballista',
    condition: 'On hit at range (Arrows resource)',
    getBaseDamage: ({ perkAmount }) => BASTION_BALLISTA_BASE_DMG + BASTION_BALLISTA_DMG_PER_STACK * perkAmount,
    getHits: ({ sliderVal }) => sliderVal ?? 0,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 1.0 },
    scalingMode: 'fixed',
    scalings: { dexterity: 1.0, earth: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: BASTION_BALLISTA_PROC_COEFF },
    secondaryEffects: [
      { label: 'Max Arrows', getValue: ({ perkAmount }) => BASTION_BALLISTA_MAX_POTENCY_BASE * perkAmount, condition: 'Potency of Arrows resource', tone: 'utility' },
      { label: 'Fire Cooldown', getValue: () => BASTION_BALLISTA_FIRE_COOLDOWN, condition: 'Between arrow activations (per enemy)', tone: 'utility' },
      { label: 'Restore Delay', getValue: () => BASTION_BALLISTA_RESTORE_DELAY, format: (v) => `${v}s`, condition: 'Without firing to restore arrows', tone: 'utility' },
    ],
    slider: {
      buildKey: 'bastionBallistaArrows',
      label: 'Arrows',
      min: 0,
      max: BASTION_BALLISTA_MAX_POTENCY_BASE,
      step: 1,
      getMax: ({ perks }) => {
        const amt = perks['Bastion Ballista'] ?? 0
        return BASTION_BALLISTA_MAX_POTENCY_BASE * amt
      },
    },
    note: 'Fires additional arrows the further from the target. Reduced proc chance (0.2). Arrows restore after 12s without firing.',
  },
  // ── Basic Spirit ───────────────────────────────────────────────────────────
  {
    perkName: 'Basic Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => BASIC_SPIRIT_BASE_DMG,
    hits: BASIC_SPIRIT_HITS,
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
    getBaseDamage: () => BUNI_SPIRIT_BASE_DMG,
    hits: BUNI_SPIRIT_HITS,
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
    getBaseDamage: () => MAGELING_SPIRIT_BASE_DMG,
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
    getBaseDamage: () => TOADZERKER_SPIRIT_BASE_DMG,
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
    getBaseDamage: () => DIRE_BUNI_SPIRIT_BASE_DMG,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'weapon',
    isM2: true,
    isFinisher: true,
    guardbreak: true,
    note: 'Counts as an M1/M2 and will proc related effects.',
  },
  // ── Void Root Spirit ───────────────────────────────────────────────────────
  {
    perkName: 'Void Root Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => VOID_ROOT_SPIRIT_BASE_DMG,
    hits: VOID_ROOT_SPIRIT_HITS,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, physical: 1.0 },
    isM2: true,
    note: 'Each hit has a chance to inflict random debuffs.',
  },
  // ── Bomber Spirit ──────────────────────────────────────────────────────────
  {
    perkName: 'Bomber Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => BASIC_SPIRIT_BASE_DMG,
    hits: 4,
    dmgTypeMode: 'fixed',
    dmgTypes: { holy: 0.5, magic: 0.5 },
    scalingMode: 'fixed',
    scalings: { holy: 1.0, magic: 1.0 },
    isM2: true,
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects. Grants Bursting for 10s on activation (Bombardier proc rate 40% → 80% while active — proc-rate logic itself not modeled, see P2).',
  },
  // ── Roguent Spirit ───────────────────────────────────────────────────────
  {
    perkName: 'Roguent Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => ROGUENT_SPIRIT_BASE_DMG,
    hits: ROGUENT_SPIRIT_HITS,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { dexterity: 1.0 },
    isM2: true,
    isFinisher: true,
    forceCrit: true,
    note: 'All hits are guaranteed crits. Throws 4 individual projectiles. Only requires 50% Spiritual Energy to activate.',
  },
  // ── Bounce Momentum ────────────────────────────────────────────────────────
  {
    perkName: 'Bounce Momentum',
    condition: 'On Finisher (Tongue Shot active after jumping with Bounce)',
    getBaseDamage: ({ perkAmount }) => BOUNCE_MOMENTUM_BASE_DMG + BOUNCE_MOMENTUM_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { water: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { water: 1.0 },
    guardbreak: true,
    note: 'Stuns and briefly immobilizes the target.',
  },
  // ── Bomber Charge ────────────────────────────────────────────────────────
  {
    perkName: 'Bomber Charge',
    condition: 'Retaliate Weapon Art selected',
    getBaseDamage: ({ perkAmount, statuses }) => {
      return calcBomberChargeBaseDamage(perkAmount, statuses?.missingHpPct ?? 0)
    },
    dmgTypeMode: 'fixed',
    dmgTypes: { holy: 0.5, true: 0.5 },
    scalingMode: 'fixed',
    scalings: { holy: 0.4, magic: 0.4 },
    isWA: true,
    guardbreak: true,
    activeIf: (ctx) => ctx.selectedWeaponArt === 'Retaliate',
    note: 'Replaces base Retaliate formula & Physical→Holy dmg type while equipped. Windup dmg-taken halving not modeled.',
  },
  {
    perkName: 'Protector Spirit',
    condition: 'While above 50% HP the spirit guardian will fire a tiny beam attack at an enemy struck by your M1/M2',
    getBaseDamage: ({ perkAmount }) => PROTECTOR_SPIRIT_BASE_DMG + PROTECTOR_SPIRIT_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 0.5, magic: 0.5 },
    scalingMode: 'fixed',
    scalings: { earth: 0.5, magic: 0.5 },
    hpGate: { hpThreshold: PROTECTOR_SPIRIT_HP_GATE, aboveThreshold: true, alwaysActiveAtPerkAmount: PROTECTOR_SPIRIT_ALWAYS_ACTIVE_AT },
    secondaryEffects: [
      {
        label: 'DR below 50% HP',
        getValue: ({ perkAmount }) => 20 * perkAmount,
        format: v => `${v}%`,
        condition: 'Flat, non-diminishing · 3s CD per activation',
        tone: 'defense',
        hpGate: { hpThreshold: PROTECTOR_SPIRIT_HP_GATE, aboveThreshold: false, alwaysActiveAtPerkAmount: PROTECTOR_SPIRIT_ALWAYS_ACTIVE_AT },
      },
    ],
    note: 'Spirit fires one beam at a time. Beam + DR both active simultaneously at 2+ stacks.',
  },
  // ── Air Pressure ───────────────────────────────────────────────────────────
  {
    perkName: 'Air Pressure',
    condition: 'Upon using a rune release an air burst',
    getBaseDamage: ({ perkAmount }) => AIR_PRESSURE_DMG_PER_STACK * perkAmount,
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
    getBaseDamage: ({perkAmount}) => AIR_BARRIER_DMG_PER_STACK * perkAmount,
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
    getBaseDamage: ({ perkAmount }) => APOLLO_BOOST_BASE - (APOLLO_BOOST_SUB_BASE + APOLLO_BOOST_PER_STACK * perkAmount),
    getHits: ({ perkAmount }) => Math.floor(APOLLO_BOOST_HITS_BASE + APOLLO_BOOST_HITS_PER_STACK * perkAmount),
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0, physical: 1.0 },
    isRune: true,
    secondaryEffects: [
      {
        label: 'Taunt',
        getValue: () => APOLLO_BOOST_TAUNT_DURATION,
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
      { label: 'Poise Damage', getValue: () => DRAGON_CLAW_POISE_DAMAGE, tone: 'offense' },
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
      { label: 'Poise Damage', getValue: () => DRAGON_BUBBLE_POISE_DAMAGE, tone: 'offense' },
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
    getBaseDamage: ({ perkAmount }) => ROARING_HEADS_BASE_DMG + ROARING_HEADS_DMG_PER_STACK * perkAmount,
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
    getBaseDamage: ({ perkAmount }) => BARBED_FLURRY_BASE_DMG + BARBED_FLURRY_DMG_PER_STACK * perkAmount,
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
    getBaseDamage: ({ perkAmount }) => HONEY_ARTS_BASE_DMG + HONEY_ARTS_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    procCoefficient: { type: 'noProc' },
    secondaryEffects: [
      {
        label: 'Sticky',
        getValue: () => HONEY_ARTS_STICKY_DURATION,
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
    getBaseDamage: ({ perkAmount }) => SICKNESS_BASE_DMG + SICKNESS_DMG_PER_STACK * perkAmount,
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
    getBaseDamage: () => MELTING_SLIME_BASE_DMG,
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 0.5, earth: 0.5 },
    scalingMode: 'dynamic',
    getScalings: ({ perkAmount }) => ({
      fire: MELTING_SLIME_FIRE_SCALE_BASE + MELTING_SLIME_FIRE_SCALE_PER_STACK * (perkAmount ?? 1),
      earth: MELTING_SLIME_EARTH_SCALE_BASE + MELTING_SLIME_EARTH_SCALE_PER_STACK * (perkAmount ?? 1),
    }),
    note: 'Fire/Earth DoT · Multi-hit over duration · Poise Damage',
  },
  // ── Whirlwind ───────────────────────────────────────────────────────────────
  {
    perkName: 'Whirlwind',
    condition: 'On Weapon Art or Rune use',
    getBaseDamage: ({ perkAmount }) => WHIRLWIND_BASE_DMG + WHIRLWIND_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { air: 1.0 },
    scalingMode: 'fixed',
    scalings: { air: 1.0 },
    note: 'AoE wind slash triggered by WA/Rune use. Applies Bleed for 5s. Can proc other effects.',
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
    triggerChain: [
      { perk: 'Dark Magic', trigger: 'always' },
      { perk: 'Bombardier', trigger: 'chance' },
    ],
  },
  // ── Volatile Shell ──────────────────────────────────────────────────────────
  {
    perkName: 'Volatile Shell',
    condition: 'When your Shield is depleted completely',
    getBaseDamage: ({ perkAmount }) => VOLATILE_SHELL_BASE_DMG + VOLATILE_SHELL_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, protection: 0.1 },
    secondaryEffects: [
      {
        label: 'Poison',
        getValue: () => VOLATILE_SHELL_POISON_DURATION,
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
      return Math.round(base * mult * SPORE_BURST_ROUND) / SPORE_BURST_ROUND
    },
    hits: 1,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { dexterity: 1.0, hex: 1.0, earth: 1.0 },
    isProcHit: true,
    finisherOnly: true,
    procCoefficient: { type: 'noProc' },
    note: 'Only activates once per finisher. Inflicts Poison on self and enemies.',
  },
  // ── Royal Finisher ────────────────────────────────────────────────────
  {
    perkName: 'Royal Finisher',
    condition: 'On Finisher',
    getBaseDamage: ({ perkAmount }) => ROYAL_FINISHER_BASE_DMG + ROYAL_FINISHER_DMG_PER_STACK * perkAmount,
    hits: 1,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    isProcHit: true,
    finisherOnly: true,
    note: 'Only activates once per finisher.',
  },
  // ── Grounded Despair ─────────────────────────────────────────────────
  {
    perkName: 'Grounded Despair',
    condition: 'On jump and land',
    getBaseDamage: ({ perkAmount }) => GROUNDED_DESPAIR_BASE_DMG + GROUNDED_DESPAIR_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 0.5, hex: 0.5 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0, magic: 1.0 },
  },
  // ── Echo Incineration ─────────────────────────────────────────────
  {
    perkName: 'Echo Incineration',
    condition: 'On hit · (10 + 2.5 × perkAmount)% chance',
    getBaseDamage: ({ perkAmount }) => ECHO_INCINERATION_BASE_DMG + ECHO_INCINERATION_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 0.5, air: 0.5 },
    scalingMode: 'fixed',
    scalings: { fire: 1.0, air: 1.0 },
    guardbreak: true,
    isProcHit: true,
    procCoefficient: { type: 'noProc' },
  },
  // ── Bombardier ───────────────────────────────────────────────────
  {
    perkName: 'Bombardier',
    condition: 'On any hit · RNG chance (40% at 2 stacks per wiki — see TODO in note)',
    getBaseDamage: ({ perkAmount }) => 10 + 1 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 0.5, holy: 0.5 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0, holy: 1.0 },
    guardbreak: true,
    isProcHit: true,
    procCoefficient: { type: 'noProc' },
    note: 'Cannot proc other effects. Deals 0.5s Stun (not modeled — no stun-duration system in codebase). Self-damage (~6.66% of pre-modifier explosion damage) implemented — applies to M1/M2/WA/Rune/Perk hit groups (no multi-target falloff). Proc-chance display not added (non-linear scaling undocumented).',
  },
  // ── Venom Spitter ────────────────────────────────────────────────
  {
    perkName: 'Venom Spitter',
    label: 'Venom Spitter',
    condition: 'On Finisher hit',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) => {
      const base = VENOM_SPITTER_BASE_DMG + VENOM_SPITTER_DMG_PER_STACK * perkAmount
      let total = 0
      for (let i = 0; i < finisherHits; i++) {
        total += base / (1 + i / VENOM_SPITTER_HIT_DIVISOR)
      }
      return Math.round(total * 1000) / 1000
    },
    getFinisherHitBaseDmg: ({ baseDmg, hitIndex }) =>
      Math.round(baseDmg * 1000 / (1 + hitIndex / VENOM_SPITTER_HIT_DIVISOR)) / 1000,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, earth: 1.0 },
    isProcHit: true,
    finisherOnly: true,
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
      return Math.round(base * 10000) / 10000
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
  // ── Quarry ─────────────────────────────────────────────────────────
  {
    perkName: 'Quarry',
    condition: 'After building 4 Hidden Treasure stacks on an opponent',
    getBaseDamage: ({ perkAmount }) => 20 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 0.5, holy: 0.5 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0, holy: 1.0 },
    procCoefficient: { type: 'noProc' },
    note: '2.5 second cooldown, cooldown is per enemy',
  },
  // ── Wind Drill ─────────────────────────────────────────────────────────
  {
    perkName: 'Wind Drill',
    condition: 'Replaces your roll',
    getBaseDamage: ({ perkAmount }) => 3 + 1.5 * perkAmount,
    hits: 10,
    dmgTypeMode: 'fixed',
    dmgTypes: { air: 1.0 },
    scalingMode: 'fixed',
    scalings: { air: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    note: 'Can be held for up to 2 seconds, dealing damage every 0.2 seconds',
  },
  // ── Fiery Pursuit ──────────────────────────────────────────────────────
  {
    perkName: 'Fiery Pursuit',
    condition: 'On Weapon Art activation',
    getBaseDamage: ({ perkAmount }) => FIERY_PURSUIT_BASE_DMG + FIERY_PURSUIT_DMG_PER_STACK * perkAmount,
    getHits: ({ perkAmount }) => Math.floor(perkAmount),
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 1.0 },
    scalingMode: 'fixed',
    scalings: { fire: 1.0 },
    isWA: true,
    guardbreak: true,
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    secondaryEffects: [
      {
        label: 'Burn',
        getValue: () => FIERY_PURSUIT_BURN_DURATION,
        format: v => `${v}s`,
        condition: 'Applied on dash',
        tone: 'offense',
      },
    ],
    note: 'Dash forward. Counts as Weapon Art damage. Grants Iframes during dash. AoE scales on perk amount.',
  },
  // ── Bulfrogg Spirit ──────────────────────────────────────────────────────
  {
    perkName: 'Bulfrogg Spirit',
    condition: 'on RMB (Monk)',
    getBaseDamage: () => 23,
    dmgTypeMode: 'fixed',
    dmgTypes: { water: 1.0 },
    scalingMode: 'fixed',
    scalings: { water: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    guardbreak: true,
    note: 'Stuns targets for 4.5 seconds'
  },
  // ── Gremlin Spirit ──────────────────────────────────────────────────────
  {
    perkName: 'Gremlin Spirit',
    condition: 'on Bleed (Monk)',
    getBaseDamage: () => 2.5,
    hits: 10,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0, dexterity: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    guardbreak: true,
  },
  // ── Queen Bumblz Spirit ──────────────────────────────────────────────────────
  {
    perkName: 'Queen Bumblz Spirit',
    condition: 'on summon (Monk)',
    getBaseDamage: () => 8,
    hits: 9,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 0.5, holy: 0.5 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0, holy: 1.0, summon: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    note: 'Targets the closest enemy. Fires 9 times over 15 second. Cannot gain spiritual energy while this spirit is active. Does not count as a summon'
  },
  // ── Pyre Bloom ──────────────────────────────────────────────────────────
  {
    perkName: 'Pyre Bloom',
    condition: 'On Weapon Art activation — summon a stationary Pyrebloom that shoots fireballs',
    getBaseDamage: ({ perkAmount, statuses }) => {
      const cd = statuses?.waCooldown ?? 10
      const amt = Math.floor(perkAmount)
      return (PYRE_BLOOM_BASE_DMG + PYRE_BLOOM_DMG_PER_STACK * amt) * (1 + cd / PYRE_BLOOM_CD_DMG_DIVISOR)
    },
    getHits: ({ perkAmount, statuses }) => {
      const cd = statuses?.waCooldown ?? 10
      const amt = Math.floor(perkAmount)
      return Math.floor((PYRE_BLOOM_AMMO_BASE + PYRE_BLOOM_AMMO_PER_STACK * amt) * Math.min((cd / PYRE_BLOOM_AMMO_CD_DIVISOR) - PYRE_BLOOM_AMMO_CD_SUBTRACT, PYRE_BLOOM_AMMO_MAX))
    },
    dmgTypeMode: 'fixed',
    dmgTypes: { fire: 1.0 },
    scalingMode: 'fixed',
    scalings: { fire: 1.0, summon: 1.0 },
    isWA: true,
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    secondaryEffects: [
      {
        label: 'Ammo per plant',
        getValue: ({ perkAmount, statuses }) => {
          const cd = statuses?.waCooldown ?? 10
          const amt = Math.floor(perkAmount)
          return Math.floor((PYRE_BLOOM_AMMO_BASE + PYRE_BLOOM_AMMO_PER_STACK * amt) * Math.min((cd / PYRE_BLOOM_AMMO_CD_DIVISOR) - PYRE_BLOOM_AMMO_CD_SUBTRACT, PYRE_BLOOM_AMMO_MAX))
        },
        format: v => `${v}`,
        condition: 'Min 1 · Max 10',
        tone: 'offense',
      },
      {
        label: 'Firerate',
        getValue: ({ statuses }) => {
          const cd = statuses?.waCooldown ?? 10
          return 1 + cd / PYRE_BLOOM_FIRERATE_DIVISOR
        },
        format: v => `${Math.round(v * 100) / 100}`,
        condition: 'Shots per second',
        tone: 'offense',
      },
      {
        label: 'Lifetime',
        getValue: ({ perkAmount, statuses }) => {
          const cd = statuses?.waCooldown ?? 10
          const amt = Math.floor(perkAmount)
          const firerate = 1 + cd / PYRE_BLOOM_FIRERATE_DIVISOR
          const hits = Math.floor((PYRE_BLOOM_AMMO_BASE + PYRE_BLOOM_AMMO_PER_STACK * amt) * Math.min((cd / PYRE_BLOOM_AMMO_CD_DIVISOR) - PYRE_BLOOM_AMMO_CD_SUBTRACT, PYRE_BLOOM_AMMO_MAX))
          return firerate * hits
        },
        format: v => `${Math.round(v * 100) / 100}s`,
        tone: 'offense',
      },
      {
        label: 'Max active',
        getValue: ({ perkAmount }) => PYRE_BLOOM_MAX_ACTIVE_BASE + PYRE_BLOOM_MAX_ACTIVE_PER_STACK * Math.floor(perkAmount),
        format: v => `${v}`,
        condition: 'Oldest despawns when limit exceeded',
        tone: 'utility',
      },
      {
        label: 'Burn duration',
        getValue: () => PYRE_BLOOM_BURN_DURATION,
        format: v => `${v}s`,
        tone: 'offense',
      },
    ],
    note: 'Damage counts as Weapon Art damage and will proc related effects. Uses base Weapon Art cooldown in all calculations. Does not count as a summon — unaffected by summon-based perks or effects. Fireballs go through walls. Prioritizes closest target to player. Disappears on armor change.',
  },
  // ── Dark Harvest ──────────────────────────────────────────────────────
  {
    perkName: 'Dark Harvest',
    condition: 'On hit vs enemy ≤50% HP',
    getBaseDamage: ({ perkAmount }) => DARK_HARVEST_BASE_DAMAGE + DARK_HARVEST_DAMAGE_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0 },
    guardbreak: true,
    enemyHpGate: { hpThreshold: DARK_HARVEST_HP_GATE_THRESHOLD, aboveThreshold: false },
    secondaryEffects: [
      {
        label: 'Heal',
        getValue: ({ perkAmount }) => DARK_HARVEST_HEAL_PER_STACK * perkAmount,
        format: v => `${v} HP`,
        tone: 'utility',
      },
    ],
    note: `Activates on the hit that brings the enemy below 50% HP. ${DARK_HARVEST_COOLDOWN}s cooldown per enemy. Cannot be procced by attacks without a proc coefficient. Healing counts as lifesteal.`,
  },
  // ── Blastshield ──────────────────────────────────────────────────────
  {
    perkName: 'Blastshield',
    condition: 'When Hit',
    getBaseDamage: ({ perkAmount }) => 15 + 15 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 1.0 },
    scalingMode: 'fixed',
    scalings: { earth: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    secondaryEffects: [
      {
        label: 'Poise Damage',
        getValue: ({ perkAmount }) => 25 + 25 * perkAmount,
        format: v => `${v}`,
        tone: 'offense',
      },
    ],
    note: 'Has a cooldown of 5 seconds. Shockwave does not activate from Self Damage or Debuffs',
  },
  // ── Frozen Waste ──────────────────────────────────────────────────────
  {
    perkName: 'Frozen Waste',
    condition: 'When Blocking an attack',
    getBaseDamage: ({ perkAmount }) => 15 + 15 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { water: 1.0 },
    scalingMode: 'fixed',
    scalings: { water: 1.0, physical: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    guardbreak: true,
    note: 'Roughly 8 second cooldown at 1 of this perk, and 7 seconds at 2 of this perk. Activates even when guardbroken. Size scales with perk amount.',
  },
  // ── Gravity Well ──────────────────────────────────────────────────────
  {
    perkName: 'Gravity Well',
    condition: 'on Weapon Art or Rune use',
    getBaseDamage: ({ perkAmount }) => 20 + 2 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 0.5, magic: 0.5 },
    scalingMode: 'fixed',
    scalings: { earth: 0.5, magic: 0.5 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
  },
// ── Heavy Slate ──────────────────────────────────────────────────────
  {
    perkName: 'Heavy Slate',
    condition: 'When hit by an attack that doesn\'t Stun you',
    getBaseDamage: ({ perkAmount }) => 5 + 2 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 1.0 },
    scalingMode: 'fixed',
    scalings: { earth: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    note: 'Has a cooldown of 0.5 seconds.',
  },
  // ── Runic Blades ──────────────────────────────────────────────────────
  {
    perkName: 'Runic Blades',
    condition: 'On Weapon Art or Rune hit — launches a magical blade at target marked with Runic Blades debuff',
    getBaseDamage: ({ perkAmount }) => RUNIC_BLADES_BASE_DMG + RUNIC_BLADES_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    isProcHit: true,
    procCoefficient: { type: 'hasCoeff', value: 0 },
    secondaryEffects: [
      {
        label: 'Debuff Duration',
        getValue: ({ perkAmount }) => RUNIC_BLADES_DEBUFF_DURATION_PER_STACK * perkAmount,
        format: v => `${Math.round(v * 10) / 10}s`,
        condition: 'Runic Blades debuff on target',
        tone: 'offense',
      },
    ],
    note: 'Applies Runic Blades debuff on WA/Rune hit. Hits against marked targets launch blades. Very short internal cooldown (~0.05-0.1s). Cannot proc other effects.',
    requiredEnemyDebuff: 'Runic Blades',
  },
  // ── Gnawing Poison ─────────────────────────────────────────────────────
  {
    perkName: 'Gnawing Poison',
    condition: 'On Finisher',
    getBaseDamage: ({ perkAmount }) => GNAWING_POISON_BASE_DMG + GNAWING_POISON_DMG_PER_STACK * perkAmount,
    hits: 1,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 0.5, physical: 0.5 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0, physical: 1.0 },
    finisherOnly: true,
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    requiredEnemyDebuff: 'Poison',
    note: `Bites all enemies you have Poisoned, dealing burst damage. ${GNAWING_POISON_COOLDOWN}s cooldown. Can proc other effects. You don't have to hit an opponent — just using your finisher after having inflicted a target with Poison activates it. Grants Poison Potency. Damage may increase depending on how many enemies you have Poisoned (unknown scaling).`,
  },
  // ── Propelling Fun ────────────────────────────────────────────────────────
  {
    perkName: 'Propelling Fun',
    condition: 'On jump',
    getBaseDamage: ({ perkAmount }) => PROPELLING_FUN_BASE_DMG + PROPELLING_FUN_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'dynamic',
    getDmgTypes: ({ propellingFunElement }) => ({ [propellingFunElement ?? 'air']: 1.0 }),
    scalingMode: 'dynamic',
    getScalings: ({ propellingFunElement }) => {
      const s: Record<string, number> = { air: 1.0 }
      if (propellingFunElement === 'fire') s.fire = 1.0
      return s
    },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    note: `${PROPELLING_FUN_COOLDOWN}s cooldown. Jumping creates an air current. If burning, activates Cinderpull instead (Fire Damage Type). Cloudpush/Cinderpull grant bonus damage type to allies.`,
  },
  // ── Quake ─────────────────────────────────────────────────────────
  {
    perkName: 'Quake',
    condition: `On hit · (${QUAKE_CHANCE_BASE} + ${QUAKE_CHANCE_PER_STACK} × perkAmount)% chance`,
    getBaseDamage: ({ perkAmount }) => QUAKE_BASE_DMG + QUAKE_DMG_PER_STACK * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 1.0 },
    scalingMode: 'fixed',
    scalings: { earth: 1.0 },
    guardbreak: true,
    isProcHit: true,
    procCoefficient: { type: 'noProc' },
    note: 'Cannot proc other effects. Deals Stun and Knockback (not modeled).',
  },

  // ── Ruler Of The Sands ─────────────────────────────────────────────────────
  {
    perkName: 'Ruler Of The Sands',
    condition: 'On Weapon Art or Rune use — summon a sandnado',
    getBaseDamage: ({ perkAmount }) => RULER_SANDS_BASE_DMG_PER_HIT * perkAmount,
    hits: RULER_SANDS_HITS,
    dmgTypeMode: 'fixed',
    dmgTypes: { earth: 0.5, air: 0.5 },
    scalingMode: 'fixed',
    scalings: { earth: 1.0, air: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 0.2 },
    secondaryEffects: [
      {
        label: 'WA Chance',
        getValue: ({ perkAmount, statuses }) =>
          (statuses?.waCooldown ?? 10) * (RULER_SANDS_CHANCE_CD_MULT + RULER_SANDS_CHANCE_PERK_MULT * perkAmount),
        format: v => `${v.toFixed(1)}%`,
        condition: 'cd × (1 + 0.5 × perkAmount)',
        tone: 'offense',
      },
      {
        label: 'Rune Chance',
        getValue: ({ perkAmount, statuses }) =>
          (statuses?.runeCooldown ?? 10) * (RULER_SANDS_CHANCE_CD_MULT + RULER_SANDS_CHANCE_PERK_MULT * perkAmount),
        format: v => `${v.toFixed(1)}%`,
        condition: 'cd × (1 + 0.5 × perkAmount)',
        tone: 'offense',
      },
      {
        label: 'Total Damage',
        getValue: ({ perkAmount }) => RULER_SANDS_BASE_DMG_PER_HIT * perkAmount * RULER_SANDS_HITS,
        format: v => v.toFixed(2),
        condition: `${RULER_SANDS_HITS} hits`,
        tone: 'offense',
      },
    ],
    note: 'Chance scales on base cooldown. Reduced proc coefficient. Lasts ~5s.',
  },
  // ── Vile Presence ─────────────────────────────────────────────────────
  {
    perkName: 'Vile Presence',
    condition: 'Passively deals damage in an AoE',
    getBaseDamage: ({ perkAmount }) => 1.2 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { hex: 1.0 },
    scalingMode: 'fixed',
    scalings: { hex: 1.0 },
    procCoefficient: { type: 'noProc' },
    note: 'Size increases with perk amount',
  },
  // ── Magic Guard ─────────────────────────────────────────────────────
  {
    perkName: 'Magic Guard',
    condition: 'When Blocking an attack',
    getBaseDamage: ({ perkAmount }) => 15 * perkAmount,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    note: '8 second cooldown',
  },
  // ── Icestorm ─────────────────────────────────────────────────────
  {
    perkName: 'Icestorm',
    condition: 'Land 10 hits in a short timeframe',
    getBaseDamage: ({ perkAmount }) => 3 + perkAmount,
    hits: 10,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 0.5, water: 0.5 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0, water: 1.0 },
    procCoefficient: { type: 'noProc' },
    note: 'Duration extends if the user keeps hitting enemies',
  },
  // ── Ichor Spark: Charged RMB ────────────────────────────────────────────────
  {
    perkName: 'Ichor Spark',
    label: 'Charged RMB',
    condition: 'On RMB charge release',
    getBaseDamage: ({ perkAmount, sliderVal = 100 }) =>
      calcIchorSparkSwipeBase(perkAmount, sliderVal),
    dmgTypeMode: 'weapon',
    scalingMode: 'fixed',
    scalings: { physical: 1.0, air: 1.0 },
    isFinisher: true,
    guardbreak: true,
    procCoefficient: { type: 'hasCoeff', value: 1.0 },
    secondaryEffects: [
      {
        label: 'Charge Time',
        getValue: ({ perkAmount }) => calcIchorSparkChargeTime(perkAmount),
        format: v => `${v.toFixed(1)}s`,
        condition: 'Time to reach max charge',
        tone: 'utility',
      },
      {
        label: 'Charge Damage Bonus',
        getValue: ({ sliderVal = 100 }) => calcIchorSparkChargeMult(sliderVal),
        format: v => `${((v - 1) * 100).toFixed(0)}%`,
        condition: 'Damage multiplier from charging',
        tone: 'offense',
      },
    ],
    slider: {
      buildKey: 'ichorSparkCharge',
      label: 'Charge',
      min: 0,
      max: 100,
      step: 1,
    },
    note: 'Finisher, guardbreak, high knockback. Not affected by Cleave effects. Charge rate affected by attack speed.',
  },
  // ── Ichor Spark: Ranged Slash ────────────────────────────────────────────────
  {
    perkName: 'Ichor Spark',
    label: 'Ranged Slash',
    condition: `On RMB charge release at ≥${Math.round(ICHOR_SPARK_SLASH_CHARGE_THRESHOLD * 100)}% charge (shares charge slider with Charged RMB)`,
    getBaseDamage: ({ perkAmount, sliderVal = 100 }) =>
      calcIchorSparkSlashBase(perkAmount, sliderVal),
    dmgTypeMode: 'weapon',
    scalingMode: 'fixed',
    scalings: { physical: 1.0, air: 1.0 },
    guardbreak: true,
    secondaryEffects: [
      {
        label: 'Slash Heal',
        getValue: ({ perkAmount, sliderVal = 100 }) =>
          ICHOR_SPARK_SLASH_HEAL_BASE * calcIchorSparkChargeMult(sliderVal) * perkAmount,
        format: v => `${v.toFixed(3)} HP`,
        condition: 'Lifesteals, scales with charge',
        tone: 'defense',
      },
      {
        label: 'Bleed Duration',
        getValue: () => ICHOR_SPARK_BLEED_DURATION,
        format: v => `${v}s`,
        condition: 'Ranged slash applies Bleed at 1+ perk',
        tone: 'offense',
      },
    ],
    note: 'Guardbreak, no knockback. Applies Bleed 5s, lifesteals. Only activates at ≥30% charge bonus.',
  },
]

const _perkDmgDefMap = new Map<string, PerkDmgDef[]>()
for (const def of PERK_DMG_DEFS) {
  const arr = _perkDmgDefMap.get(def.perkName) ?? []
  arr.push(def)
  _perkDmgDefMap.set(def.perkName, arr)
}

export function findPerkDmgDef(perkName: string, label?: string): PerkDmgDef | undefined {
  const defs = _perkDmgDefMap.get(perkName)
  if (!defs) return undefined
  if (label !== undefined) return defs.find(d => d.label === label)
  return defs[0]
}