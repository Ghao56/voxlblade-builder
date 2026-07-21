<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import CritIcon from './CritIcon.svelte'
  import MountIcon from './MountIcon.svelte'
  const dispatch = createEventDispatcher()
  import DmgTotalTooltip from './DmgTotalTooltip.svelte'
  import { resolveDamageTypes, applyFireAirConversion } from './lib/damageTypeResolve'
  import type { TypedDmgBoostEntry } from './data/TypedDmgBoost'
  import { BADGE_CONFIG, type ComputedType, type ComputedHit, type PerkOnHitDmg } from './lib/dmgTypes'
  import Badge from './lib/ui/Badge.svelte'
  import type { ProcCoefficient } from './lib/types'
  import { SCALING_TO_BOOST, PERCENT_STATS, canProc } from './lib/types'
import { DOT_DMG_TYPE_MAP } from './data/DoTDamage'
  import {
    DMG_TYPE_META,
    DEF_TRACKED_TYPES,
    DEF_INHERITANCE,
    PHYSICAL_INHERITED_TYPES,
    MAGIC_INHERITED_TYPES,
    FALLBACK_DMG_COLOR,
    STORAGE_KEY_DEFENSES as DEF_STORAGE_KEY,
    ARMOR_PEN_BRANCH_THRESHOLD,
    VENOM_EATER_HEAL_PER_STACK,
    SIPHONING_ROT_HEAL_PER_STACK,
    CURSE_RIP_DIVISOR,
    BASE_CRIT_DMG_PCT,
  } from './lib/constants'

  export let perkDmgTypeBonuses: Record<string, number> = {}
  export let perkDmgTypeBonusesDoT: Record<string, number> = {}
  export let boosts: any
  export let crit: any
  export let stats: any
  export let disabledBoosts: Set<string> = new Set(['Thief Training (would-crit bonus)'])
  export let disableCurseRip: boolean = false
  export let activeFinalMult: number = 1
  export let showCritValues: boolean = false
  export let showCritToggle: boolean = false
  export let draconicRunesBonus: Record<string, number> = {}
  export let selfDebuffDamageMult: number = 1
  export let selfDebuffNames: string[] = []
  export let antiHealSelfMult: number = 1
  export let lightningCloakPct: number = 0
  export let stormRendPct: number = 0
  export let explosiveChargePct: number = 0
  export let blubBlubAmt: number = 0
  export let dragonStateBaseDmg: number = 0
  export let dragonStateScalingMult: number = 1
  export let dragonStateCombatMult: number = 1
  export let dragonStateTotalDmg: number = 0
  export let darkMagicHexBonus: number = 0
  export let perkOnHitDamages: Array<PerkOnHitDmg & { getFinisherHitBaseDmg?: (ctx: { baseDmg: number; hitIndex: number }) => number }> = []
  export let waArmorPenetration: number = 0
  export let globalArmorPenetration: number = 0
  export let crushingPressureAmt: number = 0
  export let echoIncinerationBaseDmg: number = 0
  export let echoIncinerationScalingMult: number = 1
  export let bombardierBaseDmg: number = 0
  export let bombardierScalingMult: number = 1
export let cauterizeBaseDmg: number = 0
export let cauterizeScalingMult: number = 1
  export let m1Label: string = 'M1'
  export let mountActive: boolean = false
  export let mountLabel: string = ''

  const DOT_COLORS: Record<string, string> = {
    Bleed: '#ff0004',
    Burn: '#fd5d00',
    Poison: '#d900ff',
    'Caustic Slow': '#a855f7',
  }
  const BADGE_COLORS: Record<string, string> = {
    physical: '#9a3412', magic: '#4338ca', fire: '#9a3412',
    water: '#075985',    earth: '#3f6212', air: '#065f46',
    hex: '#6b21a8',      holy: '#713f12',  true: '#f87171',
  }

  function withDarkMagicHex(types: Record<string, number>): Record<string, number> {
    if (darkMagicHexBonus <= 0 || (types.magic ?? 0) <= 0) return types
    const out = { ...types }
    out.hex = Math.round(((out.hex ?? 0) + darkMagicHexBonus) * 10000) / 10000
    return out
  }

  function resolveTypeInfo(k: string, penDecimal: number, procCoeff?: ProcCoefficient) {
    const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: FALLBACK_DMG_COLOR }
    const applicableBoosts = getApplicableBoosts(k, false, undefined, procCoeff)
    const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
    const typeDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
    const defPct = defPctForType(k)
    const defMult = calcArmorMult(defPct, penDecimal).mult
    return { info, applicableBoosts, typedMultUsed, typeDebuffMult, defPct, defMult }
  }

  boosts
  disabledBoosts
  activeFinalMult
  selfDebuffDamageMult
  lightningCloakPct
  stormRendPct

  export let weaponHits: Array<{
    group: string; index: number; count: number
    base: number; scalingMult: number; combatMult: number; isFinisher: boolean
    dmgTypes: Record<string, number>
    baseDmgTypes?: Record<string, number>
    label?: string
    isM1?: boolean
    isM2?: boolean
    weaponBoostMult?: number
    weaponBoostLabel?: string
    isHeal?: boolean
    forceCrit?: boolean
    dmgTypeCombatMults?: Record<string, number>
    dmgTypeIsHeal?: Record<string, boolean>
    dmgTypeIsCritExempt?: Record<string, boolean>
    procCoefficient?: ProcCoefficient
    canApplyBurn?: boolean
    procCount?: number
  }> = []
  export let typedBoostEntries: TypedDmgBoostEntry[] = []
  export let luminescentPct: number = 0
  export let appliedDebuffs: Array<{
    name: string; abbr: string; color: string
    potency?: number; effectLabel?: string | null; descLabel?: string | null
    damageMult?: number; defReduction?: Partial<Record<string, number>>; typeDamageMult?: Record<string, number>
    variants?: Array<{
      sourceName: string; potency: number
      effectLabel: string | null; descLabel: string | null
      damageMult?: number; defReduction?: Partial<Record<string, number>>; typeDamageMult?: Record<string, number>
    }>
  }> = []
  export let curseRipPerkAmount: number = 0
  export let curseRipActiveDebuffCount: number = 0
  export let curseRipHealMult: number = 1
  export let healCritDmgMult: number = 0
  export let venomEaterStacks: number = 0
  export let bloodThirstyStacks: number = 0
  export let lifeDrinkerAmt: number = 0
  export let siphoningRotAmt: number = 0
  export let sunburnUniversalDmgMult: number = 1
  export let enemyHpFill: number = 100
  export let dotTicks: Array<{
    type: string; tickDamage: number; dotPotency?: number; inflictionPotency?: number
    debuffName?: string; slowDuration?: number; baseTick?: number
    dotBase: number; potencyMult: number
    scalingMult: number; combatMult: number
    meltingShredFactor?: number
  }> = []

  let activeVariants = new Map<string, number>()
  let _ttHit: any = null
  let _ttStyleStr: string = ''
  let _ttFormula: {
    t: ComputedType
    style: string
  } | null = null
  let _dotTooltip: {
    type: string
    tickDamage: number
    dotPotency: number
    inflictionPotency: number
    style: string
    slowDuration?: number
    baseTick?: number
    dotBase: number
    potencyMult: number
    dmgType?: string
    scalingMult: number
    combatMult: number
    preMitBase: number
    applicableBoosts: Array<{ perkName: string; label: string; mult: number }>
    typedMult: number
    defPct: number
    defMult: number
    typeDebuffMult: number
    debuffMult: number
    sunburnMult: number
    finalDmg: number
  } | null = null

  let _meltingTooltip: {
    style: string
    preMitBase: number
    meltingShredFactor: number
    typedMult: number
    typeDebuffMult: number
    debuffMult: number
    selfDebuffDamageMult: number
    trueDmg: number
  } | null = null

  let _woundTooltip: {
    style: string
    preMitBase: number
    woundPotency: number
    trueDmg: number
  } | null = null

  $: resolvedDebuffs = appliedDebuffs.map(d => {
    if (!d.variants?.length) return d
    const idx = activeVariants.get(d.name) ?? 0
    const v = d.variants[idx]
    if (!v) return d
    return { ...d, ...v, variants: d.variants }
  })

  function cycleVariant(name: string) {
    const d = appliedDebuffs.find(d => d.name === name)
    if (!d?.variants?.length || d.variants.length < 2) return
    const current = activeVariants.get(name) ?? 0
    const next = (current + 1) % d.variants.length
    activeVariants.set(name, next)
    activeVariants = new Map(activeVariants)
  }


  const DMG_TYPE_MAP = new Map(Object.entries(DMG_TYPE_META).map(([id, meta]) => [id, meta]))

  // Pre-built index: damage type → matching typedBoostEntries (avoids scanning entire array per call)
  let _boostsByType = new Map<string, Array<{ perkName: string; label: string; dmgMult: number; healMult: number; types: string[]; appliesToGroups?: string[]; needsProcCoeff?: boolean }>>()
  $: {
    const map = new Map<string, typeof typedBoostEntries[0][]>()
    for (const e of typedBoostEntries) {
      for (const type of e.types) {
        if (!map.has(type)) map.set(type, [])
        map.get(type)!.push(e)
      }
    }
    _boostsByType = map
  }

  function loadDefenses(): Record<string, number> {
    try {
      const raw = localStorage.getItem(DEF_STORAGE_KEY)
      if (!raw) return Object.fromEntries(DEF_TRACKED_TYPES.map(t => [t, 0]))
      const parsed = JSON.parse(raw)
      return Object.fromEntries(DEF_TRACKED_TYPES.map(t => [t, parsed[t] ?? 0]))
    } catch {
      return Object.fromEntries(DEF_TRACKED_TYPES.map(t => [t, 0]))
    }
  }

  let defenses: Record<string, number> = loadDefenses()

  $: try { localStorage.setItem(DEF_STORAGE_KEY, JSON.stringify(defenses)) } catch {}

  // ── Daily Challenge presets ────────────────────────────────────────────────
  interface Preset {
    id: string
    label: string
    desc: string
    color: string
    values: Partial<Record<string, number>>
  }

  const DAILY_PRESETS: Preset[] = [
    {
      id: 'magic_resistant',
      label: 'Magic Resistant',
      desc: 'Enemies gain +100% Magic Defense',
      color: '#818cf8',
      values: { magic: 100 },
    },
    {
      id: 'physical_resistant',
      label: 'Physical Resistant',
      desc: 'Enemies gain +100% Physical Defense',
      color: '#fb923c',
      values: { physical: 100 },
    },
  ]

  let activePresets: Set<string> = new Set()
  export let disabledDebuffs: Set<string> = new Set()
  export let waDebuffWarning: boolean = false

  function applyPreset(p: Preset) {
    if (activePresets.has(p.id)) {
      activePresets.delete(p.id)
      activePresets = new Set(activePresets)
    } else {
      activePresets = new Set([...activePresets, p.id])
    }
    rebuildDefensesFromPresets()
  }

  function rebuildDefensesFromPresets() {
    const out = Object.fromEntries(DEF_TRACKED_TYPES.map(t => [t, 0]))
    for (const pid of activePresets) {
      const preset = DAILY_PRESETS.find(p => p.id === pid)
      if (!preset) continue
      for (const [k, v] of Object.entries(preset.values)) {
        out[k] = (out[k] ?? 0) + (v ?? 0)
      }
    }
    defenses = out
  }

  function resetDefenses() {
    defenses = Object.fromEntries(DEF_TRACKED_TYPES.map(t => [t, 0]))
    activePresets = new Set()
  }

  // ── Armor pen ─────────────────────────────────────────────────────────────
  $: armorPen   = (stats as any)?.armorPenetration ?? 0
  $: penDecimal = armorPen / 100

  // ── Active debuff combat effects ───────────────────────────────────────────
  // Product of all active damageMult debuffs (Weakness on enemy doesn't affect damage you deal)
  function calcActiveDebuffDamageMult(resolved: Array<any>, disabled: Set<string>): number {
    return resolved
      .filter(d => !disabled.has(d.name) && (d.damageMult ?? 1) !== 1 && d.name !== 'Weakness')
      .reduce((acc, d) => acc * (d.damageMult ?? 1), 1)
  }
  $: _activeDebuffDamageMult = calcActiveDebuffDamageMult(resolvedDebuffs, disabledDebuffs)

  function calcDebuffTypeDamageMult(resolved: Array<any>, disabled: Set<string>): Record<string, number> {
    const mults: Record<string, number> = {}
    for (const d of resolved) {
      if (disabled.has(d.name) || !d.typeDamageMult) continue
      for (const [type, mult] of Object.entries(d.typeDamageMult as Record<string, number>)) {
        mults[type] = (mults[type] ?? 1) * mult
      }
    }
    return mults
  }
  $: _activeDebuffTypeDamageMult = calcDebuffTypeDamageMult(resolvedDebuffs, disabledDebuffs)

  function calcDebuffTypeLabels(resolved: Array<any>, disabled: Set<string>): Record<string, string[]> {
    const labels: Record<string, string[]> = {}
    for (const d of resolved) {
      if (disabled.has(d.name) || !d.typeDamageMult) continue
      for (const type of Object.keys(d.typeDamageMult)) {
        (labels[type] ??= []).push(d.name)
      }
    }
    return labels
  }
  $: _debuffTypeLabels = calcDebuffTypeLabels(resolvedDebuffs, disabledDebuffs)

  // Effective enemy defenses after applying debuff reductions (e.g. Shatter strips armor)
  function calcEffectiveDefenses(resolved: Array<any>, disabled: Set<string>, defs: Record<string, number>): Record<string, number> {
    const reductions: Record<string, number> = {}
    for (const d of resolved) {
      if (disabled.has(d.name) || !d.defReduction) continue
      for (const [k, v] of Object.entries(d.defReduction as Record<string, number>)) {
        // Map defense stat keys to damage type keys
        const typeKey = k.replace('Defense', '')
        reductions[typeKey] = (reductions[typeKey] ?? 0) + v
      }
    }
    if (Object.keys(reductions).length === 0) return { ...defs }
    const out = { ...defs }
    for (const [k, v] of Object.entries(reductions)) {
      out[k] = (out[k] ?? 0) - v
    }
    return out
  }
  $: effectiveDefenses = calcEffectiveDefenses(resolvedDebuffs, disabledDebuffs, defenses)

  function calcArmorMult(defPct: number, pen: number): { mult: number; branch: 'low'|'high' } {
    if (defPct === 0 && pen <= 0) return { mult: 1, branch: 'low' }
    const def = defPct / 100
    if (def <= pen + ARMOR_PEN_BRANCH_THRESHOLD) {
      const am = def - pen
      return { mult: am > 0 ? 1 / (1 + am) : 1 - am, branch: 'low' }
    } else {
      const am = def / (1 + 5 * pen)
      return { mult: 1 / (1 + am), branch: 'high' }
    }
  }

  function fmt(n: number) {
    const r = Math.round(n * 10000) / 10000
    return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '')
  }
  function fmt1(n: number) {
    const r = Math.round(n * 10) / 10
    return Number.isInteger(r) ? String(r) : r.toFixed(1)
  }

  function fmtMult(n: number) {
    return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, '')
  }

  $: critChance  = crit?.effectiveCritChance ?? 0
  $: critDmgMult = crit?.critDamageMultiplier ?? BASE_CRIT_DMG_PCT
  $: _venomEaterActive = venomEaterStacks > 0 && showCritValues && !disabledBoosts.has('Venom Eater') && resolvedDebuffs.some(d => d.name === 'Poison')
  $: _bloodThirstyActive = bloodThirstyStacks > 0 && !disabledBoosts.has('Blood Thirsty') && resolvedDebuffs.some(d => d.name === 'Bleed')

  $: _activeDotTicks = dotTicks.filter(d => {
    const debuffToCheck = d.debuffName ?? d.type
    const isOnDummy = resolvedDebuffs.some(r => r.name === debuffToCheck) && !disabledDebuffs.has(debuffToCheck)
    return isOnDummy && d.tickDamage > 0
  }).map(d => {
    const dmgType = DOT_DMG_TYPE_MAP[d.type] ?? 'hex'
    const scalingMult = d.scalingMult
    const combatMult = d.combatMult
    const sunburnMult = sunburnUniversalDmgMult
    const preMitBase = d.tickDamage * scalingMult * combatMult

    const resolvedTypes = resolveDamageTypes({ [dmgType]: 1.0 }, perkDmgTypeBonusesDoT)

    const applicableBoosts = getApplicableBoosts(dmgType, false, undefined, { type: 'noProc' as const })
    const typedMult = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)

    const defPct = defPctForType(dmgType)
    const totalPen = armorPen + globalArmorPenetration
    const crushPen = crushingPenForType(dmgType)
    const { mult: defMult } = calcArmorMult(defPct, (totalPen + crushPen) / 100)

    const typeDebuffMult = _activeDebuffTypeDamageMult[dmgType] ?? 1
    const debuffMult = _activeDebuffDamageMult

    const primaryMult = resolvedTypes[dmgType] ?? 1
    const finalDmgPrimary = preMitBase * sunburnMult * primaryMult * typedMult * defMult * typeDebuffMult * debuffMult * selfDebuffDamageMult

    const bonusTypes = Object.entries(resolvedTypes)
      .filter(([k]) => k !== dmgType)
      .map(([k, mult]) => {
        const bApplicable = getApplicableBoosts(k, false, undefined, { type: 'noProc' as const })
        const bTypedMult = bApplicable.reduce((acc, b) => acc * b.mult, 1)
        const bDefPct = defPctForType(k)
        const bCrushPen = crushingPenForType(k)
        const { mult: bDefMult } = calcArmorMult(bDefPct, (totalPen + bCrushPen) / 100)
        const bTypeDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
        const raw = preMitBase * sunburnMult * mult * bTypedMult * bDefMult * bTypeDebuffMult * debuffMult * selfDebuffDamageMult
        const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
        return { key: k, label: info.label, color: info.color, raw }
      })

    const finalDmg = finalDmgPrimary + bonusTypes.reduce((s, b) => s + b.raw, 0)

    const trueDmg = d.meltingShredFactor != null
      ? preMitBase * sunburnMult * d.meltingShredFactor
      : 0

    const woundPotency = d.type === 'Bleed'
      ? (resolvedDebuffs.find(r => r.name === 'Wound' && !disabledDebuffs.has(r.name))?.potency ?? 0)
      : 0
    const woundTrueDmg = woundPotency > 0 ? preMitBase * sunburnMult * woundPotency : 0
    const woundAmt = woundPotency > 0 ? Math.round(woundPotency * 10) : 0

    const lifeDrinkerHeal = lifeDrinkerAmt > 0
      ? 0.01 * preMitBase  * lifeDrinkerAmt + 0.1
      : 0

    const siphoningRotHeal = (siphoningRotAmt > 0 && d.type === 'Poison')
      ? SIPHONING_ROT_HEAL_PER_STACK * siphoningRotAmt
      : 0

    return { ...d, dmgType, scalingMult, combatMult, preMitBase, applicableBoosts, typedMult, defPct, defMult, typeDebuffMult, debuffMult, finalDmg, finalDmgPrimary, bonusTypes, trueDmg, woundTrueDmg, woundPotency, woundAmt, lifeDrinkerHeal, siphoningRotHeal, weaponBoostMult: sunburnMult, weaponBoostLabel: sunburnMult !== 1 ? 'Sunburn' : undefined }
  })

  function defPctForType(k: string): number {
    if (k === 'true' || k === 'summon') return 0
    let pct = effectiveDefenses[k] ?? 0
    const parentKey = DEF_INHERITANCE[k]
    if (parentKey) pct += defPctForType(parentKey)
    return pct
  }

  function crushingPenForType(dmgType: string): number {
    if (crushingPressureAmt <= 0) return 0
    const defPct = defPctForType(dmgType)
    return crushingPressureAmt * 10 + (defPct > 0 ? crushingPressureAmt * defPct * 0.15 : 0)
  }

  function computePreMitigationBase(hit: {
    base: number
    scalingMult?: number
    combatMult?: number
    weaponBoostMult?: number
    dmgTypes: Record<string, number>
    baseDmgTypes?: Record<string, number>
  }): number {
    const baseTypes = hit.baseDmgTypes ?? hit.dmgTypes
    const baseSum = Object.values(baseTypes).reduce((s, m) => s + hit.base * m, 0)
    return baseSum * (hit.scalingMult ?? 1) * (hit.combatMult ?? 1) * (hit.weaponBoostMult ?? 1)
  }

  function getApplicableBoosts(k: string, isHeal: boolean, group?: string, procCoeff?: ProcCoefficient): Array<{ perkName: string; label: string; mult: number }> {
    const candidates = _boostsByType.get(k)
    if (!candidates) return []
    const results: Array<{ perkName: string; label: string; mult: number }> = []
    for (const e of candidates) {
      const mult = isHeal ? e.healMult : e.dmgMult
      if (mult === 1) continue
      if (e.appliesToGroups && (!group || !e.appliesToGroups.includes(group))) continue
      if (e.needsProcCoeff && !canProc(procCoeff)) continue
      results.push({ perkName: e.perkName, label: e.label, mult })
    }
    return results
  }
 
  $: computedHits = typedBoostEntries && effectiveDefenses && weaponHits.map((hit): ComputedHit => {
    const isHeal = hit.isHeal ?? false
    const basePenDecimal = (armorPen + globalArmorPenetration) / 100
    const hitPenDecimal = hit.group === 'WA' || hit.group === 'Rune' ? (armorPen + globalArmorPenetration + waArmorPenetration) / 100 : basePenDecimal

    const addProcEffect = (baseAmount: number, pct: number, dmgTypes: Record<string, number>, tag: string, scalingMult = 1, combatMult = 1) => {
      const amount = baseAmount * pct
      if (amount <= 0) return
      let resolvedTypes = withDarkMagicHex(resolveDamageTypes(dmgTypes, perkDmgTypeBonuses))
      if (echoIncinerationBaseDmg > 0) resolvedTypes = applyFireAirConversion(resolvedTypes)
      for (const [k, mult] of Object.entries(resolvedTypes)) {
        const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
        const applicableBoosts = getApplicableBoosts(k, false, undefined, hit?.procCoefficient)
        const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
        const debuffMult = _activeDebuffTypeDamageMult[k] ?? 1
        const defPct   = defPctForType(k)
        const crushPen = crushingPenForType(k)
        const defMult  = calcArmorMult(defPct, basePenDecimal + crushPen / 100).mult
        const typeBase = amount * mult
        const raw = typeBase * scalingMult * typedMultUsed * combatMult * defMult * debuffMult
        types.push({
          key: k, label: info.label, color: info.color,
          typeBase, scalingMult, combatMult,
          applicableBoosts, weaponBoostMult: 1, typeDebuffMult: debuffMult,
          defMult, enemyDefPct: defPct,
          raw, critVal: Math.round(raw * critDmgMult / 100 * 10000) / 10000,
          isHeal: false, tag, forceCrit: false, procCoefficient: { type: 'noProc' },
        })
      }
    }

    // Cache pre-mitigation base for this hit (used by all proc effects below)
    const _hitPreMitBase = computePreMitigationBase(hit)
    const _hitDebuffedPreMitBase = _hitPreMitBase * _activeDebuffDamageMult * selfDebuffDamageMult

    const types: ComputedType[] = Object.entries(hit.dmgTypes ?? {}).map(([k, mult]) => {
      const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
      const typeIsHeal   = hit.dmgTypeIsHeal?.[k] ?? isHeal
      const typeCombat   = hit.dmgTypeCombatMults?.[k] ?? hit.combatMult
      const typeNoCrit   = healCritDmgMult > 0 && typeIsHeal ? false : (hit.dmgTypeIsCritExempt?.[k] ?? typeIsHeal)
      const applicableBoosts = getApplicableBoosts(k, typeIsHeal, hit.group, hit.procCoefficient)
      const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)

      const enemyDefPct = typeIsHeal ? 0 : defPctForType(k)
      const crushPen = typeIsHeal ? 0 : crushingPenForType(k)

      const weaponBoostMult = hit.weaponBoostMult ?? 1
      const defMult = typeIsHeal ? 1 : calcArmorMult(enemyDefPct, hitPenDecimal + crushPen / 100).mult
      const typeBase = hit.base * mult

      const typeDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
      const raw = typeBase * hit.scalingMult * typedMultUsed *
        typeCombat * weaponBoostMult * defMult *
        (typeIsHeal ? 1 : _activeDebuffDamageMult * typeDebuffMult) * (typeIsHeal ? 1 : selfDebuffDamageMult) *
        (typeIsHeal ? antiHealSelfMult : 1)

      const effectiveCrit = healCritDmgMult > 0 && typeIsHeal ? healCritDmgMult : critDmgMult
      const critVal = typeNoCrit ? raw : raw * effectiveCrit / 100

      return {
        key: k, label: info.label, color: info.color,
        typeBase, scalingMult: hit.scalingMult, combatMult: typeCombat,
        applicableBoosts, weaponBoostMult, weaponBoostLabel: hit.weaponBoostLabel,
        typeDebuffMult,
        defMult, enemyDefPct,
        raw, critVal, isHeal: typeIsHeal, isCritExempt: typeNoCrit, forceCrit: hit.forceCrit ?? false,
      }
    })

    if (!isHeal && cauterizeBaseDmg > 0 && hit.canApplyBurn && canProc(hit.procCoefficient)) {
      addProcEffect(cauterizeBaseDmg, 1, { fire: 1.0 }, 'Cauterize', cauterizeScalingMult, hit.combatMult)
    }

    if (!isHeal && echoIncinerationBaseDmg > 0 && canProc(hit.procCoefficient)) {
      addProcEffect(echoIncinerationBaseDmg, 1, { fire: 0.5, air: 0.5 }, 'Echo Incineration', echoIncinerationScalingMult, hit.combatMult)
      if (cauterizeBaseDmg > 0 && hit.canApplyBurn) {
        addProcEffect(cauterizeBaseDmg, 1, { fire: 1.0 }, 'Cauterize', cauterizeScalingMult, hit.combatMult)
      }
    }

    if (!isHeal && bombardierBaseDmg > 0 && canProc(hit.procCoefficient)) {
      addProcEffect(bombardierBaseDmg, 1, { magic: 0.5, holy: 0.5 }, 'Bombardier', bombardierScalingMult, hit.combatMult)
    }

    if (!isHeal && luminescentPct > 0 && canProc(hit.procCoefficient)) {
      if (_hitDebuffedPreMitBase > 0) addProcEffect(_hitDebuffedPreMitBase, luminescentPct, { holy: 1.0 }, 'Luminescent')
    }
    
    if (!isHeal && lightningCloakPct > 0 && canProc(hit.procCoefficient)) {
      if (_hitDebuffedPreMitBase > 0) addProcEffect(_hitDebuffedPreMitBase, lightningCloakPct, { air: 0.5, magic: 0.5 }, 'Chain')
    }

    if (!isHeal && stormRendPct > 0 && canProc(hit.procCoefficient)) {
      if (_hitDebuffedPreMitBase > 0) addProcEffect(_hitDebuffedPreMitBase, stormRendPct, { air: 0.5, magic: 0.5 }, 'Chain')
    }

    if (!isHeal && explosiveChargePct > 0 && hit.group === 'WA' && canProc(hit.procCoefficient)) {
      if (_hitDebuffedPreMitBase > 0) addProcEffect(_hitDebuffedPreMitBase, explosiveChargePct, { physical: 0.5, fire: 0.5 }, 'Explosive')
    }

    if (!isHeal && blubBlubAmt > 0 && canProc(hit.procCoefficient)) {
      const preMitSum = Object.values(hit.baseDmgTypes ?? hit.dmgTypes)
        .reduce((s, m) => s + hit.base * m, 0)
      const preMitBase = preMitSum * (hit.scalingMult ?? 1) * (hit.weaponBoostMult ?? 1) * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const blubPerHit = preMitBase * 0.15 * blubBlubAmt
        const blubResolvedTypes = resolveDamageTypes({ water: 1.0 }, perkDmgTypeBonuses)

        for (const [k, mult] of Object.entries(blubResolvedTypes)) {
          const blubCrushPen = crushingPenForType(k)
          const { info, applicableBoosts, typedMultUsed, typeDebuffMult: blubDebuffMult, defPct: blubDefPct, defMult: blubDefMult } = resolveTypeInfo(k, basePenDecimal + blubCrushPen / 100)
          const blubTypeBase = blubPerHit * mult
          const blubRawPerHit = blubTypeBase * typedMultUsed * (hit.combatMult ?? 1) * blubDefMult * blubDebuffMult * 2
          
          types.push({
            key: k, label: info.label, color: info.color,
            typeBase: blubTypeBase, scalingMult: 1, combatMult: hit.combatMult ?? 1,
            applicableBoosts, weaponBoostMult: 1, typeDebuffMult: blubDebuffMult,
            defMult: blubDefMult, enemyDefPct: blubDefPct,
            raw: blubRawPerHit, critVal: Math.round(blubRawPerHit * critDmgMult / 100 * 10000) / 10000,
            isHeal: false, tag: 'Blub', forceCrit: false, procCoefficient: { type: 'noProc' }, hitCount: 2,
          })
        }
      }
    }

    if (!isHeal && dragonStateTotalDmg > 0 && (hit.group === 'M1' || hit.group === 'M2' || hit.isM1 || hit.isM2 || hit.isFinisher)) {
      const dsDebuffMult = _activeDebuffDamageMult * selfDebuffDamageMult
      const dsSunburnMult = sunburnUniversalDmgMult
      // Cache Dragon State pre-mit base for proc effects below
      const _dsPreMitBase = dragonStateBaseDmg * dragonStateScalingMult * dragonStateCombatMult * dsSunburnMult * dsDebuffMult
      if (dsDebuffMult > 0) {
        const dsResolvedTypes = withDarkMagicHex(resolveDamageTypes({ magic: 1.0 }, perkDmgTypeBonuses))
        for (const [k, mult] of Object.entries(dsResolvedTypes)) {
          const dsCrushPen = crushingPenForType(k)
          const { info, applicableBoosts, typedMultUsed, typeDebuffMult: dsTypeDebuffMult, defPct: dsDefPct, defMult: dsDefMult } = resolveTypeInfo(k, basePenDecimal + dsCrushPen / 100)
          const dsTypeBase = dragonStateBaseDmg * mult
          const dsRaw = dsTypeBase * dragonStateScalingMult * dragonStateCombatMult * dsSunburnMult * dsDebuffMult * typedMultUsed * dsDefMult * dsTypeDebuffMult

          types.push({
            key: k, label: info.label, color: info.color,
            typeBase: dsTypeBase, scalingMult: dragonStateScalingMult, combatMult: dragonStateCombatMult,
            applicableBoosts, weaponBoostMult: dsSunburnMult, weaponBoostLabel: dsSunburnMult !== 1 ? 'Sunburn' : undefined, typeDebuffMult: dsTypeDebuffMult,
            defMult: dsDefMult, enemyDefPct: dsDefPct,
            raw: dsRaw, critVal: Math.round(dsRaw * critDmgMult / 100 * 10000) / 10000,
            isHeal: false, tag: 'Dragon State', forceCrit: false, oncePerGroup: true,
          })
          if (luminescentPct > 0) {
            if (_dsPreMitBase > 0) addProcEffect(_dsPreMitBase, luminescentPct, { holy: 1.0 }, 'Luminescent')
          }
          if (lightningCloakPct > 0) {
            if (_dsPreMitBase > 0) addProcEffect(_dsPreMitBase, lightningCloakPct, { air: 0.5, magic: 0.5 }, 'Chain')
          }
          if (stormRendPct > 0) {
            if (_dsPreMitBase > 0) addProcEffect(_dsPreMitBase, stormRendPct, { air: 0.5, magic: 0.5 }, 'Chain')
          }
        }
        if (echoIncinerationBaseDmg > 0) {
          addProcEffect(echoIncinerationBaseDmg, 1, { fire: 0.5, air: 0.5 }, 'Echo Incineration', echoIncinerationScalingMult, dragonStateCombatMult)
        }
        if (bombardierBaseDmg > 0) {
          addProcEffect(bombardierBaseDmg, 1, { magic: 0.5, holy: 0.5 }, 'Bombardier', bombardierScalingMult, dragonStateCombatMult)
        }
        if (_bloodThirstyActive) {
          const btHeal = 0.3 * bloodThirstyStacks
          if (btHeal > 0) {
            types.push({
              key: 'heal', label: 'Heal', color: '#4ade80',
              typeBase: btHeal, scalingMult: 1, combatMult: 1,
              applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
              defMult: 1, enemyDefPct: 0,
              raw: btHeal, critVal: btHeal,
              isHeal: true, isCritExempt: true, forceCrit: false,
              tag: 'Blood Thirsty',
            })
          }
        }
      }
    }

    for (const ph of perkOnHitDamages) {
      if (!isHeal && ph.totalDmg > 0 && (ph.alwaysOnHit || hit.isFinisher) && ph.tag !== 'Dragon State') {
        const debuffMult = _activeDebuffDamageMult * selfDebuffDamageMult
        if (debuffMult > 0) {
          let resolvedTypes = withDarkMagicHex(resolveDamageTypes(ph.dmgTypes, perkDmgTypeBonuses))
          if (echoIncinerationBaseDmg > 0) resolvedTypes = applyFireAirConversion(resolvedTypes)
          for (const [k, mult] of Object.entries(resolvedTypes)) {
            const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
            const applicableBoosts = getApplicableBoosts(k, false, undefined, hit.procCoefficient)
            const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
            const typeDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
            const defPct  = defPctForType(k)
            const crushPen = crushingPenForType(k)
            const defMult = calcArmorMult(defPct, basePenDecimal + crushPen / 100).mult
            let baseForType: number
            if (ph.getFinisherHitBaseDmg) {
              baseForType = ph.getFinisherHitBaseDmg({ baseDmg: ph.baseDmg, hitIndex: hit.index })
            } else if (ph.rawFinisherNumerator != null) {
              const fh = hit.count
              baseForType = Math.round(ph.rawFinisherNumerator / (0.5 + fh / 2) * 1000) / 1000
            } else {
              baseForType = ph.baseDmg
            }
            const typeBase = baseForType * mult
            const phWbMult = ph.weaponBoostMult ?? 1
            const raw = typeBase * ph.scalingMult * ph.combatMult * phWbMult * debuffMult * typedMultUsed * defMult * typeDebuffMult

            types.push({
              key: k, label: info.label, color: info.color,
              typeBase, scalingMult: ph.scalingMult, combatMult: ph.combatMult,
              applicableBoosts, weaponBoostMult: phWbMult, typeDebuffMult,
              defMult, enemyDefPct: defPct,
              raw, critVal: Math.round(raw * critDmgMult / 100 * 10000) / 10000,
              isHeal: false, tag: ph.tag, oncePerGroup: ph.oncePerFinisher ?? true, forceCrit: false,
              ...(ph.halfActivations ? { activationDivisor: 2 } : {}),
            })
          }

          if (canProc(ph.procCoefficient)) {
            const preMitBase = ph.totalDmg * (ph.weaponBoostMult ?? 1) * debuffMult
            if (echoIncinerationBaseDmg > 0) {
              addProcEffect(echoIncinerationBaseDmg, 1, { fire: 0.5, air: 0.5 }, 'Echo Incineration', echoIncinerationScalingMult, ph.combatMult)
              if (cauterizeBaseDmg > 0 && ph.canApplyBurn) addProcEffect(cauterizeBaseDmg, 1, { fire: 1.0 }, 'Cauterize', cauterizeScalingMult, ph.combatMult)
            }
            if (bombardierBaseDmg > 0) {
              addProcEffect(bombardierBaseDmg, 1, { magic: 0.5, holy: 0.5 }, 'Bombardier', bombardierScalingMult, ph.combatMult)
            }
            if (luminescentPct > 0) addProcEffect(preMitBase, luminescentPct, { holy: 1.0 }, 'Luminescent')
            if (lightningCloakPct > 0) addProcEffect(preMitBase, lightningCloakPct, { air: 0.5, magic: 0.5 }, 'Chain')
            if (stormRendPct > 0) addProcEffect(preMitBase, stormRendPct, { air: 0.5, magic: 0.5 }, 'Chain')
            if (explosiveChargePct > 0 && hit.group === 'WA') addProcEffect(preMitBase, explosiveChargePct, { physical: 0.5, fire: 0.5 }, 'Explosive')
            if (blubBlubAmt > 0) {
              const blubDmgSum = Object.values(ph.dmgTypes).reduce((s, m) => s + m, 0)
              const blubPreMitBase = ph.baseDmg * blubDmgSum * ph.scalingMult * (ph.weaponBoostMult ?? 1) * debuffMult
              const blubPerHit = blubPreMitBase * 0.15 * blubBlubAmt
              const blubResolvedTypes = resolveDamageTypes({ water: 1.0 }, perkDmgTypeBonuses)
              for (const [k, mult] of Object.entries(blubResolvedTypes)) {
          const blubCrushPen = crushingPenForType(k)
          const { info, applicableBoosts, typedMultUsed, typeDebuffMult: blubDebuffMult, defPct: blubDefPct, defMult: blubDefMult } = resolveTypeInfo(k, basePenDecimal + blubCrushPen / 100)
                const blubTypeBase = blubPerHit * mult
                const blubRaw = blubTypeBase * typedMultUsed * blubDefMult * blubDebuffMult * 2
                types.push({
                  key: k, label: info.label, color: info.color,
                  typeBase: blubTypeBase, scalingMult: 1, combatMult: 1,
                  applicableBoosts, weaponBoostMult: 1, typeDebuffMult: blubDebuffMult,
                  defMult: blubDefMult, enemyDefPct: blubDefPct,
                  raw: blubRaw, critVal: Math.round(blubRaw * critDmgMult / 100 * 10000) / 10000,
                  isHeal: false, tag: 'Blub', forceCrit: false, procCoefficient: { type: 'noProc' }, hitCount: 2,
                })
              }
            }
            if (_venomEaterActive) {
              const veHeal = VENOM_EATER_HEAL_PER_STACK * venomEaterStacks
              if (veHeal > 0) {
                types.push({
                  key: 'heal', label: 'Heal', color: '#4ade80',
                  typeBase: veHeal, scalingMult: 1, combatMult: 1,
                  applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
                  defMult: 1, enemyDefPct: 0,
                  raw: veHeal, critVal: veHeal,
                  isHeal: true, isCritExempt: true, forceCrit: false,
                  tag: 'Venom Eater',
                })
              }
            }
            if (_bloodThirstyActive) {
              const btHeal = 0.3 * bloodThirstyStacks
              if (btHeal > 0) {
                types.push({
                  key: 'heal', label: 'Heal', color: '#4ade80',
                  typeBase: btHeal, scalingMult: 1, combatMult: 1,
                  applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
                  defMult: 1, enemyDefPct: 0,
                  raw: btHeal, critVal: btHeal,
                  isHeal: true, isCritExempt: true, forceCrit: false,
                  tag: 'Blood Thirsty',
                })
              }
            }
          }
          if (cauterizeBaseDmg > 0 && ph.canApplyBurn && canProc(ph.procCoefficient)) {
            addProcEffect(cauterizeBaseDmg, 1, { fire: 1.0 }, 'Cauterize', cauterizeScalingMult, ph.combatMult)
          }
        }
      }
    }

    if (!isHeal && curseRipPerkAmount > 0 && curseRipActiveDebuffCount > 0 && !disableCurseRip && canProc(hit.procCoefficient)) {
      const preMitSum  = computePreMitigationBase(hit)
      const preMitBase = preMitSum * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const healAmount = preMitBase / CURSE_RIP_DIVISOR
        if (healAmount > 0) {
          const healRaw = healAmount * curseRipHealMult * antiHealSelfMult
          
          types.push({
            key: 'heal', label: 'Heal', color: '#4ade80',
            typeBase: healAmount, scalingMult: 1, combatMult: 1,
            applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
            defMult: 1, enemyDefPct: 0,
            raw: healRaw, critVal: healRaw,
            isHeal: true, isCurseRip: true, tag: 'Curse Rip', isCritExempt: true, forceCrit: false,
            healBoostMult: curseRipHealMult !== 1 ? curseRipHealMult : undefined,
          })
        }
      }
    }

    if (!isHeal && _venomEaterActive && canProc(hit.procCoefficient)) {
      const veHeal = VENOM_EATER_HEAL_PER_STACK * venomEaterStacks
      if (veHeal > 0) {
        types.push({
          key: 'heal', label: 'Heal', color: '#4ade80',
          typeBase: veHeal, scalingMult: 1, combatMult: 1,
          applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
          defMult: 1, enemyDefPct: 0,
          raw: veHeal, critVal: veHeal,
          isHeal: true, isCritExempt: true, forceCrit: false,
          tag: 'Venom Eater',
        })
      }
    }

    if (!isHeal && _bloodThirstyActive && canProc(hit.procCoefficient)) {
      const btHeal = 0.3 * bloodThirstyStacks
      if (btHeal > 0) {
        types.push({
          key: 'heal', label: 'Heal', color: '#4ade80',
          typeBase: btHeal, scalingMult: 1, combatMult: 1,
          applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
          defMult: 1, enemyDefPct: 0,
          raw: btHeal, critVal: btHeal,
          isHeal: true, isCritExempt: true, forceCrit: false,
          tag: 'Blood Thirsty',
        })
      }
    }

    return { group: hit.group, index: hit.index, count: hit.count, isFinisher: hit.isFinisher, label: hit.label, isHeal, types, procCount: hit.procCount }
  })

  $: m1Hits   = computedHits.filter(h => h.group === 'M1')
  $: m2Hits   = computedHits.filter(h => h.group === 'M2')
  $: waHits   = computedHits.filter(h => h.group === 'WA')
  $: runeHits = computedHits.filter(h => h.group === 'Rune')
  $: perkHits = computedHits.filter(h => h.group !== 'M1' && h.group !== 'M2' && h.group !== 'WA' && h.group !== 'Rune' && h.label !== 'Springblast')

  $: _groupedPerks = (() => {
    const map = new Map<string, typeof perkHits>()
    for (const h of perkHits) {
      const key = h.label ?? 'Perk'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(h)
    }
    return [...map.entries()].map(([label, list]) => ({ label, list }))
  })()
  $: hitGroups = [
    { label: m1Label, list: m1Hits },
    { label: 'M2', list: m2Hits },
    { label: 'WA', list: waHits },
    ...(runeHits.length > 0 ? [{ label: 'Rune', list: runeHits }] : []),
    ..._groupedPerks,
  ]

  // ── Totals ──────────────────────────────────────────────────
  function hitTypeSum(hit: ComputedHit, useCrit: boolean, includeCount: boolean = false): number {
    const perHitSum = hit.types.filter(t => !t.isHeal && !t.isCurseRip && !t.oncePerGroup).reduce((s, t) => s + ((useCrit || t.forceCrit) ? t.critVal : t.raw) / (t.activationDivisor ?? 1), 0)
    const onceSum = hit.types.filter(t => t.oncePerGroup).reduce((s, t) => s + ((useCrit || t.forceCrit) ? t.critVal : t.raw) / (t.activationDivisor ?? 1), 0)
    const eventCount = hit.procCount ?? hit.count
    const dsCount = (hit.group === 'M1' || hit.group === 'M2') ? 1 : eventCount
    return perHitSum * (includeCount ? hit.count : 1) + (includeCount ? onceSum * dsCount : onceSum)
  }
  function hitHealSum(hit: ComputedHit, useCrit: boolean, includeCount: boolean = false): number {
    const sum = hit.types.filter(t => t.isHeal).reduce((s, t) => s + ((useCrit || t.forceCrit) ? t.critVal : t.raw), 0)
    return sum * (includeCount ? hit.count : 1)
  }
  function groupTotalSum(list: ComputedHit[], useCrit: boolean): number {
    let total = 0
    for (const h of list) {
      if (!h.isHeal) {
        total += h.types.filter(t => !t.isHeal && !t.isCurseRip && !t.oncePerGroup).reduce((ts, t) => ts + ((useCrit || t.forceCrit) ? t.critVal : t.raw) / (t.activationDivisor ?? 1), 0) * h.count
        const eventCount = h.procCount ?? h.count
        const dsCount = (h.group === 'M1' || h.group === 'M2') ? 1 : eventCount
        total += h.types.filter(t => t.oncePerGroup).reduce((ts, t) => ts + ((useCrit || t.forceCrit) ? t.critVal : t.raw) / (t.activationDivisor ?? 1), 0) * dsCount
      }
    }
    return total
  }
  function groupHealTotalSum(list: ComputedHit[], useCrit: boolean): number {return list.reduce((s, h) =>s +h.types.filter(t => t.isHeal).reduce((ts, t) => ts + ((useCrit || t.forceCrit) ? t.critVal : t.raw),0) * h.count, 0)}

  import { onMount } from 'svelte'
  onMount(() => {
    function onOutside(e: TouchEvent | MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest('.bdc-hit-type-chunk')) {
        document.querySelectorAll('.bdc-hit-type-chunk--hovered').forEach(el => {
          el.classList.remove('bdc-hit-type-chunk--hovered', 'bdc-hit-type-chunk--flip')
        })
      }
    }
    document.addEventListener('touchstart', onOutside, { passive: true })
    document.addEventListener('mouseup', onOutside)
    return () => {
      document.removeEventListener('touchstart', onOutside)
      document.removeEventListener('mouseup', onOutside)
    }
  })

  let enemyHpDragging = false
  let enemyHpBarEl: HTMLDivElement
  function calcEnemyHpFromMouse(e: MouseEvent): number {
    if (!enemyHpBarEl) return enemyHpFill
    const rect = enemyHpBarEl.getBoundingClientRect()
    const clampedX = Math.max(rect.left, Math.min(e.clientX, rect.right))
    const frac = (clampedX - rect.left) / rect.width
    return Math.round(Math.max(0, Math.min(1, frac)) * 100)
  }
  function onEnemyHpMouseDown(e: MouseEvent) {
    enemyHpDragging = true
    dispatch('enemyHpChange', calcEnemyHpFromMouse(e))
  }
  function onEnemyHpMouseMove(e: MouseEvent) {
    if (enemyHpDragging) dispatch('enemyHpChange', calcEnemyHpFromMouse(e))
  }
  function onEnemyHpMouseUp() {
    enemyHpDragging = false
  }
</script>

<svelte:window on:mousemove={onEnemyHpMouseMove} on:mouseup={onEnemyHpMouseUp} />

<div class="bdc-root da-section">
  <div class="da-section-title">Damage Calculator</div>

  <div class="bdc-layout">

    <div class="bdc-dummy-col">
      <div class="bdc-dummy-wrap">
        <svg viewBox="0 0 54 67" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" class="bdc-svg">
  <defs>
    <linearGradient id="bdc-khaki" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d4b35e"/>
      <stop offset="100%" stop-color="#b3924a"/>
    </linearGradient>
    <linearGradient id="bdc-armGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#8a6f56"/>
      <stop offset="50%" stop-color="#f0935f"/>
      <stop offset="100%" stop-color="#8a6f56"/>
    </linearGradient>
    <linearGradient id="bdc-torsoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#c7a657"/>
      <stop offset="100%" stop-color="#a98c4c"/>
    </linearGradient>
    <linearGradient id="bdc-cloakGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5a3c3c"/>
      <stop offset="100%" stop-color="#3d2828"/>
    </linearGradient>
  </defs>
  <rect class="bdc-cloak-collar" x="12" y="15" width="30" height="4" fill="#8a6f56" stroke="#1a1208" stroke-width="1"/>
  <g class="bdc-cloak-sway">
    <rect x="12" y="22" width="30" height="34" fill="#8a6f56" stroke="#1a1208" stroke-width="1.2"/>
  </g>
  <rect x="11" y="57" width="32" height="10" fill="url(#bdc-khaki)" stroke="#1a1208" stroke-width="1.2"/>
  <rect x="21" y="47" width="12" height="11" fill="#7a5f47" stroke="#1a1208" stroke-width="1.2"/>
  <rect x="0"  y="19" width="54" height="9"  fill="url(#bdc-armGrad)" stroke="#1a1208" stroke-width="1.2"/>
  <rect x="17" y="17" width="20" height="31" fill="url(#bdc-torsoGrad)" stroke="#1a1208" stroke-width="1.2"/>
  <rect x="17" y="13" width="20" height="4"  fill="#6b6256" stroke="#1a1208" stroke-width="1"/>
  <rect x="19" y="0"  width="16" height="14" fill="url(#bdc-khaki)" stroke="#1a1208" stroke-width="1.2"/>
  <rect x="19" y="24" width="16" height="16" fill="#c81d10" stroke="#1a1208" stroke-width="0.8"/>
  <rect x="22.5" y="27.5" width="9" height="9" fill="#ffe3da"/>
  <rect x="25"   y="30"   width="4" height="4" fill="#8e2418"/>
</svg>

        <div class="bdc-dummy-label">Training Dummy</div>
        <div class="bdc-enemy-hp-wrap" bind:this={enemyHpBarEl}
          role="slider" aria-valuenow={enemyHpFill} aria-valuemin="0" aria-valuemax="100"
          tabindex="0"
          on:mousedown={onEnemyHpMouseDown}
          title="Enemy HP: {enemyHpFill}% — drag to set">
          <div class="bdc-enemy-hp-fill {enemyHpFill > 50 ? 'hp-high' : enemyHpFill > 25 ? 'hp-medium' : 'hp-low'}" style="width:{enemyHpFill}%"></div>
          <span class="bdc-enemy-hp-label">{enemyHpFill}% HP</span>
        </div>
        {#if armorPen + globalArmorPenetration > 0}
          <Badge color="#e5e5e5" size="xs">🗡 {fmt(armorPen + globalArmorPenetration)} Pen</Badge>
        {/if}
        {#if resolvedDebuffs.length > 0}
          <div class="bdc-debuff-row">
            {#each resolvedDebuffs as d (d.name)}
              {@const isOff = disabledDebuffs.has(d.name)}
              {@const hasVariants = d.variants && d.variants.length > 1}
              <div class="bdc-debuff-group">
                <button
                  class="bdc-debuff-pill"
                  class:bdc-debuff-pill--off={isOff}
                  style="--dc:{d.color}"
                  title="{(d.variants ?? [])[activeVariants.get(d.name) ?? 0]?.sourceName ?? d.name}{d.effectLabel ? ` · ${d.effectLabel}` : ''} — click to toggle"
                  on:click={() => {
                    if (disabledDebuffs.has(d.name)) disabledDebuffs.delete(d.name)
                    else disabledDebuffs.add(d.name)
                    disabledDebuffs = new Set(disabledDebuffs)
                  }}
                >
                  <span class="bdc-dp-abbr">{d.abbr}</span>
                  {#if d.effectLabel}
                    <span class="bdc-dp-val">{isOff ? '—' : d.effectLabel}</span>
                  {/if}
                </button>
                {#if hasVariants}
                  <button
                    class="bdc-variant-btn"
                    style="--dc:{d.color}"
                    title="{(d.variants ?? [])[activeVariants.get(d.name) ?? 0]?.sourceName ?? d.name}"
                    on:click|stopPropagation={() => cycleVariant(d.name)}
                  >▾</button>
                {/if}
              </div>
            {/each}
          </div>
        {@const activeDescs = resolvedDebuffs.filter(d => !disabledDebuffs.has(d.name) && d.descLabel)}
          {#if activeDescs.length > 0}
            <div class="bdc-debuff-descs">
              {#each activeDescs as d}
                <span class="bdc-debuff-desc" style="--dc:{d.color}">{d.descLabel}</span>
              {/each}
            </div>
          {/if}
        {/if}
      </div>

      <div class="bdc-presets">
        <span class="bdc-presets-label">Daily</span>
        <div class="bdc-preset-chips">
          {#each DAILY_PRESETS as p}
            <button
              class="bdc-preset-chip"
              class:bdc-preset-chip--active={activePresets.has(p.id)}
              style="--pc:{p.color}"
              title={p.desc}
              on:click={() => applyPreset(p)}
            >{p.label}</button>
          {/each}
          <button class="bdc-preset-chip bdc-preset-chip--reset" on:click={resetDefenses}>Reset</button>
        </div>
      </div>

      <div class="bdc-def-grid">
        {#each DEF_TRACKED_TYPES as id}
          {@const meta = DMG_TYPE_META[id]}
          <div class="bdc-def-row" style="--tc:{meta.color}">
            <span class="bdc-def-type">{meta.label}</span>
            <input
              class="bdc-def-input"
              type="number"
              min="-200"
              max="1000"
              step="1"
              value={defenses[id]}
              on:input={e => { defenses = { ...defenses, [id]: parseFloat((e.target as HTMLInputElement).value) || 0 }; activePresets = new Set() }}
            />
            <span class="bdc-def-pct">%</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="bdc-calc-col">
      {#if showCritToggle || mountLabel}
        <div class="bdc-toggle-row">
          {#if showCritToggle}
            <button
              class="bdc-crit-toggle"
              class:bdc-crit-toggle--on={showCritValues}
              on:click={() => showCritValues = !showCritValues}
            >
              <CritIcon size={12}/> {showCritValues ? 'Crit ON' : 'Crit OFF'}
            </button>
          {/if}
          {#if mountLabel}
            <button
              class="bdc-mount-toggle"
              class:bdc-mount-toggle--on={mountActive}
              on:click={() => dispatch('mountToggle')}
            >
              <MountIcon size={12}/> {mountActive ? 'Mounted' : 'On Foot'}
            </button>
          {/if}
        </div>
      {/if}

      {#if hitGroups.every(g => g.list.length === 0)}
        <p class="bdc-empty">No weapon hits available.</p>
      {:else}
        <div class="bdc-hit-list">
          {#each hitGroups as grp}
            {#if grp.list.length > 0}
              {@const gTotal = groupTotalSum(grp.list, showCritValues)}
              {@const gHealTotal = groupHealTotalSum(grp.list, showCritValues)}
              <div class="bdc-hit-list-grp">
                <div class="bdc-grp-head">
                  <span class="bdc-hit-grp-label">{grp.label}</span>
                    {#if gTotal > 0}
                    <span class="bdc-grp-total" class:bdc-grp-total--crit={showCritValues}>
                      {#if showCritValues}<CritIcon size={10}/>{/if}
                      {fmt1(gTotal)}
                    </span>
                    {/if}
                    {#if gHealTotal > 0}
                      <span class="bdc-grp-heal-total">{fmt1(gHealTotal)} Heal</span>
                    {/if}
                </div>
                <div class="bdc-hit-list-rows">
                  {#each grp.list as hit}
                    {@const hSum = hitTypeSum(hit, showCritValues)}
                    {@const hSumWithCount = hitTypeSum(hit, showCritValues, true)}
                    {@const hHealSum = hitHealSum(hit, showCritValues)}
                    {@const hHealSumWithCount = hitHealSum(hit, showCritValues, true)}
                    {@const multiType = hit.types.length > 1}
                    {@const hitForceCrit = hit.types.some(t => t.forceCrit)}  
                    <div class="bdc-hit-row" class:bdc-hit-row--finisher={hit.isFinisher}>
                      {#if hit.label != null}
                        <span class="bdc-hit-row-label">{hit.label}</span>
                      {/if}
                      <div class="bdc-hit-row-types">
                        {#each hit.types as t, ti}
                          {#if ti > 0}<span class="bdc-hit-plus">+</span>{/if}
                          <div class="bdc-hit-type-chunk" style="--tc:{t.color}"
                            class:bdc-hit-type-chunk--rage={t.applicableBoosts?.some(b => b.perkName === 'Rage')}
                            class:bdc-hit-type-chunk--heal={t.isHeal}
                            class:bdc-hit-type-chunk--weaponboost={t.weaponBoostMult !== 1}
                            class:bdc-hit-type-chunk--luminescent={t.tag === 'Luminescent'}
                            class:bdc-hit-type-chunk--crit={(showCritValues && !t.isCritExempt) || t.forceCrit}
                            role="group"
                            on:mouseenter={(e) => {
                              const el = e.currentTarget as HTMLElement
                              const r = el.getBoundingClientRect()
                              const spaceBelow = window.innerHeight - r.bottom
                              const estH = 220
                              const left = Math.max(8, Math.min(r.left, window.innerWidth - 260))
                              let style: string
                              if (spaceBelow > estH) {
                                style = `left:${left}px;top:${r.bottom + 4}px;`
                              } else {
                                style = `left:${left}px;bottom:${window.innerHeight - r.top + 4}px;`
                              }
                              _ttFormula = { t, style }
                            }}
                            on:mouseleave={() => { _ttFormula = null }}>
                            <div class="bdc-hit-type-top">
                              <div class="bdc-hit-type-val-row">
                                {#if (showCritValues && !t.isCritExempt) || t.forceCrit}
                                  <span class="bdc-crit-inline-icon"><CritIcon size={12} /></span>
                                {/if}
                                <span class="bdc-hit-type-val">{fmt(((showCritValues && !t.isCritExempt) || t.forceCrit) ? (t.hitCount ? t.critVal / t.hitCount : t.critVal) : (t.hitCount ? t.raw / t.hitCount : t.raw))}</span>
                                {#if t.hitCount && t.tag !== 'Blub'}
                                  <span class="bdc-hit-cnt">×{t.hitCount}</span>
                                {/if}
                              </div>
                              <div class="bdc-hit-type-label-row">
                                <span class="bdc-hit-type-label">{t.label}{t.isHeal && t.label.toLowerCase() !== 'heal' ? ' Heal' : ''}</span>
                                {#if t.tag && BADGE_CONFIG[t.tag]}
                                  <Badge color={BADGE_CONFIG[t.tag].color} size="xs" square mono title={BADGE_CONFIG[t.tag].title}>{BADGE_CONFIG[t.tag].label}</Badge>
                                  {#if t.tag === 'Dragon State'}
                                    <span class="bdc-dragon-count">×{hit.procCount ?? (hit.group === 'M1' || hit.group === 'M2' ? 1 : hit.count)}</span>
                                  {/if}
                                  {#if t.tag === 'Blub'}
                                    <span class="bdc-dragon-count">×{t.hitCount ?? hit.count}</span>
                                  {/if}
                                  {#if t.tag === 'Springblast'}
                                    <span class="bdc-dragon-count">×{t.activationDivisor ? Math.round(hit.count / t.activationDivisor) : hit.count}</span>
                                  {/if}
                                {/if}
                                {#if hit.group === 'Rune' && !t.procCoefficient && draconicRunesBonus[t.label.toLowerCase()]}
                                  <Badge color="#c084fc" size="xs" square mono title="Draconic Bonus: +{fmt((draconicRunesBonus[t.label.toLowerCase()] || 0))} {t.label} damage type">
                                    ✦ +{fmt((draconicRunesBonus[t.label.toLowerCase()] || 0))}
                                  </Badge>
                                {/if}
                              </div>
                            </div>
                            <div class="bdc-hit-type-formula">
                              <div class="bdc-fr">
                                <span class="bdc-fr-label">{t.isHeal ? 'Base Heal' : 'Base Damage'}</span>
                                <span class="bdc-fr-val">{fmt(t.typeBase)}</span>
                              </div>
                              {#if t.scalingMult !== 1}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Scaling</span>
                                  <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(t.scalingMult)}</span>
                                </div>
                              {/if}
                              {#if t.applicableBoosts && t.applicableBoosts.filter(b => b.label !== 'Converted Energy').length > 0}
                                {#each t.applicableBoosts.filter(b => b.label !== 'Converted Energy') as boost}
                                  <div class="bdc-fr">
                                    <span class="bdc-fr-label">{boost.label}</span>
                                    <span class="bdc-fr-val" 
                                      class:bdc-fr-val--rage={boost.perkName === 'Rage'} 
                                      class:bdc-fr-val--glyph={boost.perkName === 'Glyph Conduit'}>× {fmtMult(boost.mult)}</span>
                                  </div>
                                {/each}
                              {/if}
                              {#if t.combatMult !== 1}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Combat Multipliers</span>
                                  <span class="bdc-fr-val bdc-fr-val--combat">× {fmtMult(t.combatMult)}</span>
                                </div>
                              {/if}
                              {#if t.typeDebuffMult !== 1 && !t.isHeal}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Debuffs ({(_debuffTypeLabels[t.key] ?? ['?']).join(', ')})</span>
                                  <span class="bdc-fr-val bdc-fr-val--debuff">× {fmtMult(t.typeDebuffMult)}</span>
                                </div>
                              {/if}
                              {#if selfDebuffDamageMult !== 1 && !t.isHeal}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Self-Debuff ({selfDebuffNames.join(', ')})</span>
                                  <span class="bdc-fr-val bdc-fr-val--selfdebuff">× {fmtMult(selfDebuffDamageMult)}</span>
                                </div>
                              {/if}
                              {#if antiHealSelfMult !== 1 && t.isHeal}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Anti Heal (Self)</span>
                                  <span class="bdc-fr-val bdc-fr-val--selfdebuff">× {fmtMult(antiHealSelfMult)}</span>
                                </div>
                              {/if}
                              {#if t.healBoostMult !== undefined}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Heal Boost</span>
                                  <span class="bdc-fr-val bdc-fr-val--healboost">× {fmtMult(t.healBoostMult)}</span>
                                </div>
                              {/if}
                              {#if t.weaponBoostMult !== 1}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">{t.weaponBoostLabel ?? 'Weapon Boost'}</span>
                                  <span class="bdc-fr-val bdc-fr-val--weaponboost">× {fmtMult(t.weaponBoostMult)}</span>
                                </div>
                              {/if}
                              {#if t.defMult !== 1}
                                {@const totalPen = armorPen + globalArmorPenetration + crushingPenForType(t.key)}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Defense ({fmt(t.enemyDefPct)}% / Pen {fmt(Math.round(totalPen * 100) / 100)})</span>
                                  <span class="bdc-fr-val bdc-fr-val--def" class:bdc-fr-val--amplify={t.defMult > 1}>× {fmtMult(t.defMult)}</span>
                                </div>
                              {/if}
                              {#if t.hitCount}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Hits</span>
                                  <span class="bdc-fr-val bdc-fr-val--hits">× {t.hitCount}</span>
                                </div>
                              {/if}
                              <div class="bdc-fr-divider"></div>
                              <div class="bdc-fr bdc-fr--result">
                                <span class="bdc-fr-label">{t.isHeal ? 'Final Heal' : 'Final Damage'}</span>
                                <span class="bdc-fr-val bdc-fr-val--result" style="--tc:{t.color}">{fmt(t.raw)}</span>
                              </div>
                              {#if (showCritValues && !t.isCritExempt) || t.forceCrit}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">{t.forceCrit ? 'Guaranteed Crit' : 'Crit Multiplier'}</span>
                                  <span class="bdc-fr-val bdc-fr-val--crit">× {fmtMult(critDmgMult / 100)}</span>
                                </div>
                                <div class="bdc-fr bdc-fr--result">
                                  <span class="bdc-fr-label">Crit Damage</span>
                                  <span class="bdc-fr-val bdc-fr-val--result bdc-fr-val--crit" style="--tc:{t.color}">{fmt(t.critVal)}</span>
                                </div>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                      <div class="bdc-hit-row-end">
                        {#if hit.count > 1}<span class="bdc-hit-cnt">×{hit.count}</span>{/if}
                        
                        {#if hSumWithCount > 0}
                        <span class="bdc-hit-type-sum-sep">=</span>
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <span class="bdc-hit-type-sum-holder"
                            on:mouseenter={e => {
                              _ttHit = hit
                              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              const spaceBelow = window.innerHeight - r.bottom
                              const estH = 260
                              const left = Math.max(8, Math.min(r.left, window.innerWidth - 280))
                              if (spaceBelow > estH) {
                                _ttStyleStr = `left:${left}px;top:${r.bottom + 6}px;`
                              } else {
                                _ttStyleStr = `left:${left}px;bottom:${window.innerHeight - r.top + 6}px;`
                              }
                            }} on:mouseleave={() => { _ttHit = null; _ttStyleStr = ''; }}>
                          <span class="bdc-hit-type-sum" class:bdc-hit-type-sum--crit={showCritValues || hitForceCrit}>
                          {#if showCritValues || hitForceCrit}<CritIcon size={11}/>{/if}
                          {fmt(hSumWithCount)}
                        </span>
                        </span>
                        {/if}
                        {#if hHealSumWithCount > 0}
                          {#if hSumWithCount === 0}<span class="bdc-hit-type-sum-sep">=</span>{/if}
                          <span class="bdc-hit-type-heal-sum">{fmt(hHealSumWithCount)}</span>
                        {/if}
                        
                        {#if hit.isFinisher}<span class="bdc-hit-fin">✦</span>{/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
          {#if waDebuffWarning && waHits.length === 0}
            <div class="bdc-hit-list-grp">
              <div class="bdc-grp-head">
                <span class="bdc-hit-grp-label">WA</span>
              </div>
              <div class="bdc-wa-debuff-warn">
                <span class="bdc-wa-debuff-warn-icon">⚠</span>
                <span>No active debuffs — this WA requires debuffs to deal damage.</span>
              </div>
            </div>
          {/if}
        </div>
        {#if _activeDotTicks.length > 0}
          <div class="bdc-hit-list-grp">
            <div class="bdc-grp-head">
              <span class="bdc-hit-grp-label">DoT Dmg</span>
            </div>
            <div class="bdc-hit-list-rows">
              {#each _activeDotTicks as dot}
                {@const _dc = DOT_COLORS[dot.type] ?? '#e8e4da'}
                <div class="bdc-hit-row">
                  <div class="bdc-hit-row-types">
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div class="bdc-hit-type-chunk" style="--tc:{_dc}"
                      on:mouseenter={(e) => {
                        const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        const spaceBelow = window.innerHeight - r.bottom
                        const left = Math.max(8, Math.min(r.left, window.innerWidth - 260))
                        _dotTooltip = {
                          type: dot.type,
                          tickDamage: dot.tickDamage,
                          dotPotency: dot.dotPotency ?? 0,
                          inflictionPotency: dot.inflictionPotency ?? 0,
                          slowDuration: dot.slowDuration,
                          baseTick: dot.baseTick,
                          dotBase: dot.dotBase,
                          potencyMult: dot.potencyMult,
                          dmgType: dot.dmgType,
                          scalingMult: dot.scalingMult,
                          combatMult: dot.combatMult,
                          preMitBase: dot.preMitBase,
                          applicableBoosts: dot.applicableBoosts ?? [],
                          typedMult: dot.typedMult,
                          defPct: dot.defPct,
                          defMult: dot.defMult,
                          typeDebuffMult: dot.typeDebuffMult,
                          debuffMult: dot.debuffMult,
                          sunburnMult: dot.weaponBoostMult ?? 1,
                          finalDmg: dot.finalDmg,
                          style: spaceBelow > 180
                            ? `left:${left}px;top:${r.bottom + 4}px;`
                            : `left:${left}px;bottom:${window.innerHeight - r.top + 4}px;`,
                        }
                      }}
                      on:mouseleave={() => { _dotTooltip = null }}>
                      <div class="bdc-hit-type-top">
                        <div class="bdc-hit-type-val-row">
                          <span class="bdc-hit-type-val">{fmt(dot.finalDmgPrimary ?? dot.finalDmg ?? dot.tickDamage)}</span>
                        </div>
                        <div class="bdc-hit-type-label-row">
                          <span class="bdc-hit-type-label">{dot.type}</span>
                          {#if dot.dmgType}
                            <span class="bdc-dot-dmg-badge" style="background:{BADGE_COLORS[dot.dmgType] ?? '#6b7280'}">{dot.dmgType}</span>
                          {/if}
                        </div>
                        {#if dot.defMult != null && dot.defMult < 1}
                          <div class="bdc-dot-raw-line">raw {fmt(dot.tickDamage)}</div>
                        {/if}
                      </div>
                    </div>
                    {#each dot.bonusTypes ?? [] as bt}
                      <span class="bdc-hit-plus">+</span>
                      <div class="bdc-hit-type-chunk" style="--tc:{bt.color}">
                        <div class="bdc-hit-type-top">
                          <div class="bdc-hit-type-val-row">
                            <span class="bdc-hit-type-val">{fmt(bt.raw)}</span>
                          </div>
                          <div class="bdc-hit-type-label-row">
                            <span class="bdc-hit-type-label">{bt.label}</span>
                          </div>
                        </div>
                      </div>
                    {/each}
                    {#if dot.trueDmg}
                      <span class="bdc-hit-plus">+</span>
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div class="bdc-hit-type-chunk" style="--tc:{BADGE_COLORS['true'] ?? '#52525b'}"
                        on:mouseenter={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const spaceBelow = window.innerHeight - r.bottom
                          const left = Math.max(8, Math.min(r.left, window.innerWidth - 260))
                          _meltingTooltip = {
                            preMitBase: dot.preMitBase,
                            meltingShredFactor: dot.meltingShredFactor ?? 0.15,
                            typedMult: dot.typedMult,
                            typeDebuffMult: dot.typeDebuffMult,
                            debuffMult: dot.debuffMult,
                            selfDebuffDamageMult: selfDebuffDamageMult,
                            trueDmg: dot.trueDmg!,
                            style: spaceBelow > 180
                              ? `left:${left}px;top:${r.bottom + 4}px;`
                              : `left:${left}px;bottom:${window.innerHeight - r.top + 4}px;`,
                          }
                        }}
                        on:mouseleave={() => { _meltingTooltip = null }}>
                        <div class="bdc-hit-type-top">
                          <div class="bdc-hit-type-val-row">
                            <span class="bdc-hit-type-val">{fmt(dot.trueDmg)}</span>
                          </div>
                          <div class="bdc-hit-type-label-row">
                            <span class="bdc-hit-type-label">True</span>
                            <span class="bdc-dot-dmg-badge" style="background:{BADGE_COLORS['true'] ?? '#52525b'}">true</span>
                          </div>
                        </div>
                      </div>
                    {/if}
                    {#if dot.woundTrueDmg}
                      <span class="bdc-hit-plus">+</span>
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div class="bdc-hit-type-chunk" style="--tc:{BADGE_COLORS['true'] ?? '#52525b'}"
                        on:mouseenter={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const spaceBelow = window.innerHeight - r.bottom
                          const left = Math.max(8, Math.min(r.left, window.innerWidth - 260))
                          _woundTooltip = {
                            preMitBase: dot.preMitBase,
                            woundPotency: dot.woundPotency ?? 0,
                            trueDmg: dot.woundTrueDmg!,
                            style: spaceBelow > 180
                              ? `left:${left}px;top:${r.bottom + 4}px;`
                              : `left:${left}px;bottom:${window.innerHeight - r.top + 4}px;`,
                          }
                        }}
                        on:mouseleave={() => { _woundTooltip = null }}>
                        <div class="bdc-hit-type-top">
                          <div class="bdc-hit-type-val-row">
                            <span class="bdc-hit-type-val">{fmt(dot.woundTrueDmg)}</span>
                          </div>
                          <div class="bdc-hit-type-label-row">
                            <span class="bdc-hit-type-label">Wound</span>
                            <span class="bdc-dot-dmg-badge" style="background:{BADGE_COLORS['true'] ?? '#52525b'}">true</span>
                          </div>
                        </div>
                      </div>
                    {/if}
                    {#if dot.siphoningRotHeal}
                      <span class="bdc-hit-plus">+</span>
                      <!-- svelte-ignore a11y_no_static_element_interactions -->
                      <div class="bdc-hit-type-chunk bdc-hit-type-chunk--heal" style="--tc:#4ade80">
                        <div class="bdc-hit-type-top">
                          <div class="bdc-hit-type-val-row">
                            <span class="bdc-hit-type-val">{fmt(dot.siphoningRotHeal)}</span>
                          </div>
                          <div class="bdc-hit-type-label-row">
                            <span class="bdc-hit-type-label">Heal</span>
                            <Badge color="#4ade80" size="xs" square mono title="Siphoning Rot: Heals for 1 HP per Poison tick per perk stack">✦ Siphoning Rot</Badge>
                          </div>
                        </div>
                        <div class="bdc-hit-type-formula">
                          <div class="bdc-fr">
                            <span class="bdc-fr-label">Base Heal</span>
                            <span class="bdc-fr-val">{fmt(dot.siphoningRotHeal)}</span>
                          </div>
                          <div class="bdc-fr-divider"></div>
                          <div class="bdc-fr bdc-fr--result">
                            <span class="bdc-fr-label">Final Heal</span>
                            <span class="bdc-fr-val bdc-fr-val--result" style="--tc:#4ade80;">{fmt(dot.siphoningRotHeal)}</span>
                          </div>
                        </div>
                      </div>
                    {/if}
                  </div>
                  <div class="bdc-hit-row-end">
                    <span class="bdc-hit-type-sum-sep">=</span>
                    <span class="bdc-hit-type-sum-holder"><span class="bdc-hit-type-sum">{fmt((dot.finalDmg ?? dot.tickDamage) + (dot.trueDmg ?? 0) + (dot.woundTrueDmg ?? 0))}</span></span>
                    {#if dot.lifeDrinkerHeal}
                      <span class="bdc-hit-type-heal-sum">{fmt(dot.lifeDrinkerHeal)}</span>
                    {/if}
                    {#if dot.siphoningRotHeal}
                      <span class="bdc-hit-type-heal-sum">{fmt(dot.siphoningRotHeal)}</span>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
            <div class="bdc-dot-footnote">Per tick</div>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

{#if _ttHit && _ttStyleStr}
  <div class="bdc-tt-fixed" style={_ttStyleStr}>
    <DmgTotalTooltip hit={_ttHit} useCrit={showCritValues}/>
  </div>
{/if}

{#if _dotTooltip}
  {@const _dtc = DOT_COLORS[_dotTooltip.type] ?? '#e8e4da'}
  {@const _hasBoosts = _dotTooltip.applicableBoosts.filter(b => b.label !== 'Converted Energy').length > 0 && _dotTooltip.typedMult !== 1}
  {@const _hasTypeDebuff = _dotTooltip.typeDebuffMult !== 1}
  {@const _hasDebuffMult = _dotTooltip.debuffMult !== 1}
  {@const _hasSelfDebuff = selfDebuffDamageMult !== 1}
  <div class="bdc-tt-formula-fixed" style={_dotTooltip.style}>
      <div class="bdc-fr">
        {#if _dotTooltip.type === 'Caustic Slow'}
          <span class="bdc-fr-label">Caustic Base <span class="bdc-tt-muted">((1.5 + perk×0.5) × (1 + slowPot/2))</span></span>
        {:else}
          <span class="bdc-fr-label">DoT Base <span class="bdc-tt-muted">(1.75 × (1 + {fmt(_dotTooltip.inflictionPotency)}/1.1))</span></span>
        {/if}
        <span class="bdc-fr-val">{fmt(_dotTooltip.dotBase)}</span>
      </div>
      {#if _dotTooltip.potencyMult !== 1}
        <div class="bdc-fr">
          <span class="bdc-fr-label">Potency Mult</span>
          <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(_dotTooltip.potencyMult)}</span>
        </div>
      {/if}
    {#if _dotTooltip.scalingMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Scaling</span>
        <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(_dotTooltip.scalingMult)}</span>
      </div>
    {/if}
    {#if _dotTooltip.combatMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Combat Multipliers</span>
        <span class="bdc-fr-val bdc-fr-val--combat">× {fmtMult(_dotTooltip.combatMult)}</span>
      </div>
    {/if}
    {#if _dotTooltip.sunburnMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Sunburn</span>
        <span class="bdc-fr-val bdc-fr-val--weaponboost">× {fmtMult(_dotTooltip.sunburnMult)}</span>
      </div>
    {/if}
    {#if _hasBoosts}
      {#each _dotTooltip.applicableBoosts.filter(b => b.label !== 'Converted Energy') as boost}
        <div class="bdc-fr">
          <span class="bdc-fr-label">{boost.label}</span>
          <span class="bdc-fr-val bdc-fr-val--typedboost">× {fmtMult(boost.mult)}</span>
        </div>
      {/each}
    {/if}
    {#if _dotTooltip.defMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">{_dotTooltip.dmgType} Defense <span class="bdc-tt-muted">({fmt(_dotTooltip.defPct)}% / Pen {fmt(armorPen + globalArmorPenetration)})</span></span>
        <span class="bdc-fr-val bdc-fr-val--def" class:bdc-fr-val--amplify={_dotTooltip.defMult > 1}>× {fmtMult(_dotTooltip.defMult)}</span>
      </div>
    {/if}
    {#if _hasTypeDebuff}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Type Debuff Mult</span>
        <span class="bdc-fr-val bdc-fr-val--debuff">× {fmtMult(_dotTooltip.typeDebuffMult)}</span>
      </div>
    {/if}
    {#if _hasDebuffMult}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Debuff Damage Mult</span>
        <span class="bdc-fr-val bdc-fr-val--debuff">× {fmtMult(_dotTooltip.debuffMult)}</span>
      </div>
    {/if}
    {#if _hasSelfDebuff}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Self Debuff Mult</span>
        <span class="bdc-fr-val bdc-fr-val--debuff">× {fmtMult(selfDebuffDamageMult)}</span>
      </div>
    {/if}

    <div class="bdc-fr-divider"></div>
    <div class="bdc-fr bdc-fr--result">
      <span class="bdc-fr-label">Final DoT Tick</span>
      <span class="bdc-fr-val bdc-fr-val--result" style="--tc:{_dtc}">{fmt(_dotTooltip.finalDmg)}</span>
    </div>
  </div>
{/if}

{#if _meltingTooltip}
  {@const mt = _meltingTooltip}
  {@const _hasMtTypeDebuff = mt.typeDebuffMult !== 1}
  {@const _hasMtDebuffMult = mt.debuffMult !== 1}
  {@const _hasMtSelfDebuff = mt.selfDebuffDamageMult !== 1}
  <div class="bdc-tt-formula-fixed" style={mt.style}>
    <div class="bdc-fr">
      <span class="bdc-fr-label">Pre-Mit Base <span class="bdc-tt-muted">(tick × scaling × combat)</span></span>
      <span class="bdc-fr-val">{fmt(mt.preMitBase)}</span>
    </div>
    <div class="bdc-fr">
      <span class="bdc-fr-label">Melting Shred Factor <span class="bdc-tt-muted">(15% × perk)</span></span>
      <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(mt.meltingShredFactor)}</span>
    </div>
    <div class="bdc-fr-divider"></div>
    <div class="bdc-fr bdc-fr--result">
      <span class="bdc-fr-label">Melting Shred True</span>
      <span class="bdc-fr-val bdc-fr-val--result" style="--tc:#f87171">+ {fmt(mt.trueDmg)}</span>
    </div>
  </div>
{/if}

{#if _woundTooltip}
  {@const wt = _woundTooltip}
  <div class="bdc-tt-formula-fixed" style={wt.style}>
    <div class="bdc-fr">
      <span class="bdc-fr-label">Pre-Mitigation Bleed Dmg</span>
      <span class="bdc-fr-val">{fmt(wt.preMitBase)}</span>
    </div>
    <div class="bdc-fr">
      <span class="bdc-fr-label">Wound Potency <span class="bdc-tt-muted">(10% per stack)</span></span>
      <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(wt.woundPotency)}</span>
    </div>
    <div class="bdc-fr-divider"></div>
    <div class="bdc-fr bdc-fr--result">
      <span class="bdc-fr-label">Wound True Damage</span>
      <span class="bdc-fr-val bdc-fr-val--result" style="--tc:#f87171">+ {fmt(wt.trueDmg)}</span>
    </div>
  </div>
{/if}

{#if _ttFormula}
  {@const t = _ttFormula.t}
  <div class="bdc-tt-formula-fixed" style={_ttFormula.style}>
    <div class="bdc-fr">
      <span class="bdc-fr-label">{t.isHeal ? 'Base Heal' : 'Base Damage'}</span>
      <span class="bdc-fr-val">{fmt(t.typeBase)}</span>
    </div>
    {#if t.scalingMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Scaling</span>
        <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(t.scalingMult)}</span>
      </div>
    {/if}
    {#if t.applicableBoosts && t.applicableBoosts.filter(b => b.label !== 'Converted Energy').length > 0}
      {#each t.applicableBoosts.filter(b => b.label !== 'Converted Energy') as boost}
        <div class="bdc-fr">
          <span class="bdc-fr-label">{boost.label}</span>
          <span class="bdc-fr-val" 
            class:bdc-fr-val--rage={boost.perkName === 'Rage'} 
            class:bdc-fr-val--glyph={boost.perkName === 'Glyph Conduit'}>× {fmtMult(boost.mult)}</span>
        </div>
      {/each}
    {/if}
    {#if t.combatMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Combat Multipliers</span>
        <span class="bdc-fr-val bdc-fr-val--combat">× {fmtMult(t.combatMult)}</span>
      </div>
    {/if}
    {#if t.typeDebuffMult !== 1 && !t.isHeal}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Debuffs ({(_debuffTypeLabels[t.key] ?? ['?']).join(', ')})</span>
        <span class="bdc-fr-val bdc-fr-val--debuff">× {fmtMult(t.typeDebuffMult)}</span>
      </div>
    {/if}
    {#if selfDebuffDamageMult !== 1 && !t.isHeal}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Self-Debuff ({selfDebuffNames.join(', ')})</span>
        <span class="bdc-fr-val bdc-fr-val--selfdebuff">× {fmtMult(selfDebuffDamageMult)}</span>
      </div>
    {/if}
    {#if antiHealSelfMult !== 1 && t.isHeal}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Anti Heal (Self)</span>
        <span class="bdc-fr-val bdc-fr-val--selfdebuff">× {fmtMult(antiHealSelfMult)}</span>
      </div>
    {/if}
    {#if t.healBoostMult !== undefined}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Heal Boost</span>
        <span class="bdc-fr-val bdc-fr-val--healboost">× {fmtMult(t.healBoostMult)}</span>
      </div>
    {/if}
    {#if t.weaponBoostMult !== 1}
      <div class="bdc-fr">
        <span class="bdc-fr-label">{t.weaponBoostLabel ?? 'Weapon Boost'}</span>
        <span class="bdc-fr-val bdc-fr-val--weaponboost">× {fmtMult(t.weaponBoostMult)}</span>
      </div>
    {/if}
    {#if t.defMult !== 1}
      {@const totalPen = armorPen + globalArmorPenetration + crushingPenForType(t.key)}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Defense ({fmt(t.enemyDefPct)}% / Pen {fmt(Math.round(totalPen * 100) / 100)})</span>
        <span class="bdc-fr-val bdc-fr-val--def" class:bdc-fr-val--amplify={t.defMult > 1}>× {fmtMult(t.defMult)}</span>
      </div>
    {/if}
    {#if t.hitCount}
      <div class="bdc-fr">
        <span class="bdc-fr-label">Hits</span>
        <span class="bdc-fr-val bdc-fr-val--hits">× {t.hitCount}</span>
      </div>
    {/if}
    <div class="bdc-fr-divider"></div>
    <div class="bdc-fr bdc-fr--result">
      <span class="bdc-fr-label">{t.isHeal ? 'Final Heal' : 'Final Damage'}</span>
      <span class="bdc-fr-val bdc-fr-val--result" style="--tc:{t.color}">{fmt(t.raw)}</span>
    </div>
    {#if (showCritValues && !t.isCritExempt) || t.forceCrit}
      <div class="bdc-fr">
        <span class="bdc-fr-label">{t.forceCrit ? 'Guaranteed Crit' : 'Crit Multiplier'}</span>
        <span class="bdc-fr-val bdc-fr-val--crit">× {fmtMult(critDmgMult / 100)}</span>
      </div>
      <div class="bdc-fr bdc-fr--result">
        <span class="bdc-fr-label">Crit Damage</span>
        <span class="bdc-fr-val bdc-fr-val--result bdc-fr-val--crit" style="--tc:{t.color}">{fmt(t.critVal)}</span>
      </div>
    {/if}
  </div>
{/if}

<style>
.bdc-root {
  border-color: rgba(204,153,88,.22) !important;
  background: linear-gradient(160deg, var(--surface, #141715) 55%, rgba(204,153,88,.05) 100%) !important;
  border: 1px solid var(--border, rgba(255, 255, 255, .06));
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Override section title inside bdc-root */
.bdc-root :global(.da-section-title) {
  text-transform: uppercase;
  font-weight: 800;
  font-size: .7rem;
  letter-spacing: .2em;
  color: #b3924a;
  border-bottom-color: rgba(204,153,88,.15);
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, .06));
  padding-bottom: 8px;
}

.bdc-layout {
  display: flex;
  gap: 0;
  align-items: flex-start;
}

/* ── Dummy column ── */
.bdc-dummy-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  width: 148px;
  padding: 14px 12px 14px 0;
  border-right: 1px solid rgba(255,255,255,.06);
  margin-right: 16px;
  min-width: 200px;
}

.bdc-dummy-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 12px 12px;
  border-radius: 12px;
  background: linear-gradient(160deg, rgba(201,29,16,.08) 0%, rgba(0,0,0,.18) 100%);
  border: 1px solid rgba(201,29,16,.15);
  width: 100%;
  position: relative;
  overflow: hidden;
}
.bdc-dummy-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(201,29,16,.1) 0%, transparent 65%);
  pointer-events: none;
}

.bdc-svg {
  width: 80px;
  height: auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 12px rgba(201,29,16,.4)) drop-shadow(0 4px 8px rgba(0,0,0,.5));
  position: relative;
  z-index: 1;
}

.bdc-dummy-label {
  font-size: .58rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: #b3924a;
  opacity: .9;
}

.bdc-enemy-hp-wrap {
  position: relative;
  height: 16px;
  width: 100%;
  max-width: 130px;
  border-radius: 3px;
  background: #1b1b1d;
  border: 1px solid #303036;
  cursor: ew-resize;
  overflow: hidden;
  box-shadow: inset 0 1px 0 rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.06);
  z-index: 1;
}
.bdc-enemy-hp-fill {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  border-radius: 2px 0 0 2px;
  min-width: 0;
  overflow: hidden;
  transition: background 0.2s;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22);
}
.bdc-enemy-hp-fill.hp-high {
  background: linear-gradient(180deg, #52c96b 0%, #43b35b 100%);
}
.bdc-enemy-hp-fill.hp-medium {
  background: linear-gradient(180deg, #e2b93d 0%, #d4a72c 100%);
}
.bdc-enemy-hp-fill.hp-low {
  background: linear-gradient(180deg, #e06b80 0%, #dc4c64 100%);
}
.bdc-enemy-hp-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: .55rem;
  font-weight: 800;
  color: rgba(255,255,255,0.9);
  text-shadow: 0 1px 2px rgba(0,0,0,0.7);
  letter-spacing: .06em;
  pointer-events: none;
  z-index: 1;
}

.bdc-debuff-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 3px;
  max-width: 150px;
}
.bdc-debuff-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-size: .58rem;
  font-weight: 800;
  letter-spacing: .03em;
  text-transform: uppercase;
  padding: 3px 6px 4px;
  min-height: 1.7rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dc) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--dc) 45%, transparent);
  color: var(--dc);
  white-space: nowrap;
  cursor: pointer;
  font-family: inherit;
  transition: opacity .15s, filter .15s, box-shadow .15s;
  line-height: 1;
}
.bdc-debuff-pill:hover {
  box-shadow: 0 0 8px color-mix(in srgb, var(--dc) 40%, transparent);
  border-color: color-mix(in srgb, var(--dc) 70%, transparent);
}
.bdc-debuff-pill--off {
  opacity: 0.28;
  filter: grayscale(0.75);
  border-style: dashed;
}
.bdc-debuff-pill--off:hover {
  opacity: 0.5;
  box-shadow: none;
}
.bdc-dp-abbr {
  line-height: 1;
}
.bdc-dp-val {
  font-size: .48rem;
  font-weight: 900;
  color: var(--dc);
  opacity: 0.8;
  line-height: 1;
  letter-spacing: 0;
}
.bdc-debuff-group {
  display: flex;
  align-items: center;
  gap: 1px;
}
.bdc-variant-btn {
  display: flex;
  align-items: center;
  font-size: .45rem;
  font-weight: 700;
  padding: 3px 3px;
  align-self: stretch;
  background: none;
  border: 1px solid color-mix(in srgb, var(--dc) 30%, transparent);
  color: var(--dc);
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  opacity: 0.55;
  transition: opacity .15s;
}
.bdc-variant-btn:hover {
  opacity: 1;
  border-color: color-mix(in srgb, var(--dc) 60%, transparent);
}

/* Daily presets */
.bdc-presets {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,.06);
}
.bdc-presets-label {
  font-size: .5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .2em;
  color: var(--ink-muted, #8a8d85);
  opacity: .5;
}
.bdc-preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.bdc-preset-chip {
  font-size: .65rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--pc, #8a8d85) 35%, transparent);
  background: color-mix(in srgb, var(--pc, #8a8d85) 10%, transparent);
  color: var(--pc, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .15s;
  white-space: nowrap;
}
.bdc-preset-chip:hover {
  background: color-mix(in srgb, var(--pc, #8a8d85) 22%, transparent);
  border-color: color-mix(in srgb, var(--pc, #8a8d85) 60%, transparent);
}
.bdc-preset-chip--active {
  background: color-mix(in srgb, var(--pc, #8a8d85) 28%, transparent);
  border-color: var(--pc, #8a8d85);
  box-shadow: 0 0 8px color-mix(in srgb, var(--pc, #8a8d85) 30%, transparent);
}
.bdc-preset-chip--reset {
  --pc: #8a8d85;
  opacity: .45;
}
.bdc-preset-chip--reset:hover { opacity: .8; }

/* Defense grid */
.bdc-def-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  padding-top: 8px;
  border-top: 1px dashed rgba(255,255,255,.06);
}

.bdc-def-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--tc) 6%, var(--surface2, #1a1d1b));
  border: 1px solid color-mix(in srgb, var(--tc) 18%, transparent);
  cursor: pointer;
  font-family: inherit;
  transition: background .12s, border-color .12s;
  width: 100%;
  min-width: 140px;
}
.bdc-def-row:hover {
  background: color-mix(in srgb, var(--tc) 11%, var(--surface2, #1a1d1b));
  border-color: color-mix(in srgb, var(--tc) 32%, transparent);
}

.bdc-def-type {
  font-size: .64rem;
  font-weight: 800;
  color: var(--tc, #e8e4da);
  width: 50px;
  text-align: left;
  flex-shrink: 0;
}

.bdc-def-input {
  font-family: 'Courier New', monospace;
  font-size: .88rem;
  font-weight: 800;
  color: var(--tc, #e8e4da);
  background: rgba(0,0,0,.25);
  border: 1px solid color-mix(in srgb, var(--tc) 25%, transparent);
  border-radius: 5px;
  width: 52px;
  text-align: right;
  padding: 2px 5px;
  -moz-appearance: textfield;
  appearance: textfield;
  flex-shrink: 0;
}
.bdc-def-input::-webkit-inner-spin-button,
.bdc-def-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.bdc-def-input:focus { outline: none; border-color: var(--tc, rgba(255,255,255,.5)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--tc) 20%, transparent); }

.bdc-def-pct {
  font-size: .65rem;
  color: var(--tc, #8a8d85);
  opacity: .55;
}

/* ── Calc column ── */
.bdc-calc-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 2px;
}

/* Crit Toggle Row */
.bdc-toggle-row {
  display: flex;
  justify-content: flex-end;
}
.bdc-crit-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .62rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(226,178,3,.25);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.bdc-crit-toggle--on {
  border-color: rgba(226,178,3,.6);
  background: rgba(226,178,3,.12);
  color: #e2b203;
  box-shadow: 0 0 8px rgba(226,178,3,.2);
}
.bdc-mount-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .62rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(56,189,248,.25);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.bdc-mount-toggle--on {
  border-color: rgba(56,189,248,.6);
  background: rgba(56,189,248,.12);
  color: #38bdf8;
  box-shadow: 0 0 8px rgba(56,189,248,.2);
}

@media (max-width: 600px) {
  .bdc-layout { flex-direction: column; gap: 0; }
  .bdc-dummy-col {
    align-items: flex-start; width: 100%;
    border-right: none; border-bottom: 1px solid rgba(255,255,255,.06);
    padding: 0 0 14px 0; margin-right: 0; margin-bottom: 14px;
  }
  .bdc-dummy-wrap { flex-shrink: 0; }
  .bdc-def-grid { flex: 1; }
}

.bdc-hit-grp-label {
  font-size: .55rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .18em;
  color: var(--ink-muted, #8a8d85);
  padding: 2px 9px;
  background: rgba(255,255,255,.04);
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,.07);
}

.bdc-hit-cnt {
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  font-weight: 900;
  color: #fbbf24;
  background: rgba(251,191,36,.14);
  border: 1px solid rgba(251,191,36,.35);
  border-radius: 999px;
  padding: 3px 12px;
  letter-spacing: -.01em;
  flex-shrink: 0;
  box-shadow: 0 0 8px rgba(251,191,36,.15);
}

/* ── Group header with total ── */
.bdc-grp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 6px;
  border-bottom: 1px solid rgba(255,255,255,.06);
  margin-bottom: 2px;
}

.bdc-grp-total {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--ink, #e8e4da);
  opacity: .7;
  letter-spacing: -.01em;
}

.bdc-grp-total--crit {
  color: #e2b203;
  opacity: 1;
  text-shadow: 0 0 10px rgba(226,178,3,.4);
}

.bdc-grp-heal-total {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: 900;
  color: #4ade80;
  opacity: .8;
  letter-spacing: -.01em;
  margin-left: 8px;
}

/* ── Per-hit type sum (multi-type only) ── */
.bdc-hit-type-sum-sep {
  font-size: .7rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .35;
  font-weight: 700;
  margin: 0 2px;
  flex-shrink: 0;
}

.bdc-hit-type-sum {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: 1.22rem;
  font-weight: 800;
  color: #f0ece4;
  padding: 4px 14px;
  border-radius: 6px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  letter-spacing: -.01em;
  min-width: 70px;
  text-shadow: 0 1px 3px rgba(0,0,0,.3);
}

.bdc-hit-type-sum--crit {
  color: #e2b203;
  background: rgba(226,178,3,.12);
  border-color: rgba(226,178,3,.3);
  text-shadow: 0 0 10px rgba(226,178,3,.35);
}

.bdc-hit-type-heal-sum {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: 1.18rem;
  font-weight: 900;
  color: #4ade80;
  padding: 5px 13px;
  border-radius: 8px;
  background: rgba(74,222,128,.1);
  border: 1px solid rgba(74,222,128,.2);
  letter-spacing: -.01em;
  margin-left: 4px;
}

/* ── Full hit list (no selection needed) ── */
.bdc-wa-debuff-warn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.25);
  color: #fbbf24;
  font-size: .75rem;
  font-weight: 500;
}
.bdc-wa-debuff-warn-icon {
  font-size: .9rem;
  flex-shrink: 0;
}
.bdc-empty {
  font-size: .78rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .5;
  font-style: italic;
}
.bdc-hit-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.bdc-hit-list-grp {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bdc-hit-list-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bdc-hit-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(255,255,255,.08);
  transition: border-color .15s, background .15s;
}
.bdc-hit-row:hover {
  border-color: rgba(255,255,255,.16);
  background: var(--surface3, #212420);
}
.bdc-hit-row--finisher {
  border-color: rgba(250,204,21,.4);
  background: linear-gradient(135deg, rgba(20,20,20,.6), rgba(250,204,21,.07));
}
.bdc-hit-row-label {
  font-size: .72rem;
  font-weight: 700;
  color: var(--ink-muted, #8a8d85);
  flex-shrink: 0;
}
.bdc-hit-row-types {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.bdc-hit-row-end {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  padding-left: 8px;
}
.bdc-hit-type-chunk {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 10px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--tc) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 30%, transparent);
  transition: box-shadow .2s, border-color .2s;
  position: relative;
}
.bdc-hit-type-chunk:hover {
  box-shadow: 0 0 18px color-mix(in srgb, var(--tc) 35%, transparent);
  border-color: color-mix(in srgb, var(--tc) 50%, transparent);
}
.bdc-hit-type-chunk--rage {
  box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 50%, #f70201);
}
.bdc-hit-type-val {
  font-family: 'Courier New', monospace;
  font-size: 1.15rem;
  font-weight: 900;
  color: var(--tc, #e8e4da);
  text-shadow:
    0 0 14px color-mix(in srgb, var(--tc) 65%, transparent),
    0 0 6px  color-mix(in srgb, var(--tc) 35%, transparent);
  letter-spacing: -.02em;
  line-height: 1;
}
.bdc-hit-type-label {
  font-size: .52rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--tc, #e8e4da);
  opacity: .75;
}
.bdc-hit-plus {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .35;
}

.bdc-hit-type-top {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
}
.bdc-hit-type-val-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
}
.bdc-hit-type-label-row {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-wrap: wrap;
}
.bdc-dragon-count {
  font-size: .45rem;
  font-weight: 700;
  color: rgba(167,139,250,.6);
  margin-left: 2px;
}
.bdc-hit-type-formula {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface, #141715);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 8px 24px rgba(0,0,0,.6);
  min-width: 180px;
  width: max-content;

  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: var(--z-dropdown);

  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition: opacity .18s ease, transform .18s ease;
}
:global(.bdc-hit-type-chunk--hovered) .bdc-hit-type-formula {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.bdc-hit-type-formula::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 14px;
  width: 8px;
  height: 8px;
  background: var(--surface, #141715);
  border-left: 1px solid rgba(255,255,255,.1);
  border-top: 1px solid rgba(255,255,255,.1);
  transform: rotate(45deg);
}
.bdc-fr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.bdc-fr-label {
  font-size: .6rem;
  font-weight: 600;
  color: var(--ink-muted, #8a8d85);
  white-space: nowrap;
}
.bdc-fr-val {
  font-family: 'Courier New', monospace;
  font-size: .68rem;
  font-weight: 800;
  color: var(--ink, #e8e4da);
  text-align: right;
  flex-shrink: 0;
}
.bdc-fr--result {
  font-weight: 900;
}
.bdc-fr--result .bdc-fr-label {
  color: var(--tc, #e8e4da);
  font-weight: 700;
}
.bdc-fr-divider {
  height: 1px;
  background: rgba(255,255,255,.08);
  margin: 2px 0;
}
.bdc-fr-val--scaling    { color: #34d399; }
.bdc-fr-val--rage       { color: #f70201; }
.bdc-fr-val--glyph      { color: #35e0c3; }
.bdc-fr-val--combat     { color: #34d399; }
.bdc-fr-val--debuff     { color: #ff9349; }
.bdc-fr-val--selfdebuff { color: #a855f7; }
.bdc-fr-val--healboost  { color: #4ade80; }
.bdc-fr-val--weaponboost { color: #fbbf24; }
.bdc-fr-val--def        { color: #f87171; }
.bdc-fr-val--amplify    { color: #fbbf24; }
.bdc-fr-val--crit       { color: #e2b203; }
.bdc-fr-val--result     { font-weight: 900; }
.bdc-hit-fin { font-size: .65rem; color: #facc15; }
.bdc-crit-inline-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 2px;
  animation: bdc-pop 0.2s ease-out;
}

.bdc-hit-type-chunk--crit .bdc-hit-type-val {
  font-weight: 900;
  text-shadow: 0 0 4px rgba(216, 75, 85, 0.4);
  filter: hue-rotate(-15deg) saturate(1.8) brightness(1.2);
}

.bdc-hit-type-chunk--crit {
  border-color: color-mix(in srgb, var(--tc) 50%, #d84b55) !important;
  box-shadow: inset 0 0 4px color-mix(in srgb, var(--tc) 20%, #ff9a42);
}

@keyframes bdc-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.bdc-hit-type-chunk--weaponboost {
  box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 50%, #fbbf24);
}
:global(.bdc-hit-type-chunk--flip) .bdc-hit-type-formula {
  top: auto;
  bottom: calc(100% + 8px);
}
:global(.bdc-hit-type-chunk--flip) .bdc-hit-type-formula::before {
  top: auto;
  bottom: -5px;
  transform: rotate(-135deg);
}
.bdc-hit-type-chunk--heal {
  border-color: rgba(74,222,128,.35) !important;
  box-shadow: inset 0 0 6px rgba(74,222,128,.15);
}
.bdc-cloak-sway {
  transform-box: fill-box;
  transform-origin: top center;
  animation: bdc-cloak-sway 1.8s ease-in-out infinite;
}
@keyframes bdc-cloak-sway {
  0%   { transform: rotate(10deg); }
  50%  { transform: rotate(12deg); }
  100% { transform: rotate(10deg); }
}
.bdc-debuff-descs {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}
.bdc-debuff-desc {
  font-size: .55rem;
  font-weight: 700;
  color: var(--dc);
  opacity: .75;
  text-align: center;
  letter-spacing: .03em;
}
.bdc-hit-type-sum-holder {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.bdc-tt-fixed {
  position: fixed;
  z-index: var(--z-dropdown);
}
.bdc-tt-formula-fixed {
  position: fixed;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface, #141715);
  border: 1px solid rgba(255,255,255,.1);
  box-shadow: 0 8px 24px rgba(0,0,0,.6);
  min-width: 200px;
  width: max-content;
}
.bdc-tt-muted {
  color: var(--ink-muted, #8a8d85);
  font-size: .65rem;
}
.bdc-dot-footnote {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
  padding: 2px 12px 0;
}
.bdc-dot-dmg-badge {
  font-size: .55rem;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  text-shadow: 0 0 2px rgba(0,0,0,.5);
  margin-left: 4px;
  line-height: 1.4;
  vertical-align: middle;
}
.bdc-dot-raw-line {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
  line-height: 1;
  margin-top: 1px;
}

</style>