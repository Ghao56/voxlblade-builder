<script lang="ts">
  import CritIcon from './CritIcon.svelte'
  import { resolveDamageTypes } from './lib/damageTypeResolve'
  import type { TypedDmgBoostEntry } from './data/TypedDmgBoost'

  export let perkDmgTypeBonuses: Record<string, number> = {}
  export let boosts: any
  export let crit: any
  export let stats: any
  export let disabledBoosts: Set<string> = new Set(['Thief Training (would-crit bonus)'])
  export let activeFinalMult: number = 1
  export let showCritValues: boolean = false
  export let showCritToggle: boolean = false
  export let draconicRunesBonus: Record<string, number> = {}
  export let selfDebuffDamageMult: number = 1
  export let antiHealSelfMult: number = 1
  export let lightningCloakPct: number = 0
  export let explosiveChargePct: number = 0
  export let m1Label: string = 'M1'

  boosts
  disabledBoosts
  activeFinalMult
  selfDebuffDamageMult
  lightningCloakPct

  export let weaponHits: Array<{
    group: string; index: number; count: number
    base: number; scalingMult: number; combatMult: number; isFinisher: boolean
    dmgTypes: Record<string, number>
    baseDmgTypes?: Record<string, number>
    label?: string
    weaponBoostMult?: number
    weaponBoostLabel?: string
    isHeal?: boolean
    forceCrit?: boolean
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

  let activeVariants = new Map<string, number>()

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


  const DMG_TYPES = [
    { id: 'physical', label: 'Physical', color: '#fb923c' },
    { id: 'magic',    label: 'Magic',    color: '#818cf8' },
    { id: 'fire',     label: 'Fire',     color: '#f97316' },
    { id: 'water',    label: 'Water',    color: '#38bdf8' },
    { id: 'earth',    label: 'Earth',    color: '#a3e635' },
    { id: 'air',      label: 'Air',      color: '#AAFFDB' },
    { id: 'hex',      label: 'Hex',      color: '#e879f9' },
    { id: 'holy',     label: 'Holy',     color: '#facc15' },
    { id: 'true',     label: 'True',     color: '#f87171' },
    { id: 'summon',   label: 'Summon',   color: '#c084fc' },
    { id: 'heal',     label: 'Heal',     color: '#4ade80' },
  ]
  const DMG_TYPE_MAP = new Map(DMG_TYPES.map(t => [t.id, t]))

  const DEF_TYPE_IDS = ['physical','magic','fire','water','earth','air','hex','holy']
  const DEF_STORAGE_KEY = 'voxlbuilder_defenses_v1'

  function loadDefenses(): Record<string, number> {
    try {
      const raw = localStorage.getItem(DEF_STORAGE_KEY)
      if (!raw) return Object.fromEntries(DEF_TYPE_IDS.map(t => [t, 0]))
      const parsed = JSON.parse(raw)
      return Object.fromEntries(DEF_TYPE_IDS.map(t => [t, parsed[t] ?? 0]))
    } catch {
      return Object.fromEntries(DEF_TYPE_IDS.map(t => [t, 0]))
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

  let activePreset: string | null = null
  export let disabledDebuffs: Set<string> = new Set()

  function applyPreset(p: Preset) {
    if (activePreset === p.id) {
      resetDefenses()
      return
    }
    defenses = Object.fromEntries(DEF_TYPE_IDS.map(t => [t, p.values[t] ?? 0]))
    activePreset = p.id
  }

  function resetDefenses() {
    defenses = Object.fromEntries(DEF_TYPE_IDS.map(t => [t, 0]))
    activePreset = null
  }

  // ── Armor pen ─────────────────────────────────────────────────────────────
  $: armorPen   = (stats as any)?.armorPenetration ?? 0
  $: penDecimal = armorPen / 100

  // ── Active debuff combat effects ───────────────────────────────────────────
  // Product of all active damageMult debuffs (Weakness on enemy doesn't affect damage you deal)
  $: _activeDebuffDamageMult = resolvedDebuffs
    .filter(d => !disabledDebuffs.has(d.name) && (d.damageMult ?? 1) !== 1 && d.name !== 'Weakness')
    .reduce((acc, d) => acc * (d.damageMult ?? 1), 1)

  $: _activeDebuffTypeDamageMult = (() => {
    const mults: Record<string, number> = {}
    for (const d of resolvedDebuffs) {
      if (disabledDebuffs.has(d.name) || !d.typeDamageMult) continue
      for (const [type, mult] of Object.entries(d.typeDamageMult)) {
        mults[type] = (mults[type] ?? 1) * mult
      }
    }
    return mults
  })()

  $: _debuffTypeLabels = (() => {
    const labels: Record<string, string[]> = {}
    for (const d of resolvedDebuffs) {
      if (disabledDebuffs.has(d.name) || !d.typeDamageMult) continue
      for (const type of Object.keys(d.typeDamageMult)) {
        (labels[type] ??= []).push(d.name)
      }
    }
    return labels
  })()

  // Effective enemy defenses after applying debuff reductions (e.g. Shatter strips armor)
  $: effectiveDefenses = (() => {
    const reductions: Record<string, number> = {}
    for (const d of resolvedDebuffs) {
      if (disabledDebuffs.has(d.name) || !d.defReduction) continue
      for (const [k, v] of Object.entries(d.defReduction)) {
        // Map defense stat keys to damage type keys
        const typeKey = k.replace('Defense', '')
        reductions[typeKey] = (reductions[typeKey] ?? 0) + (v ?? 0)
      }
    }
    if (Object.keys(reductions).length === 0) return defenses
    const out = { ...defenses }
    for (const [k, v] of Object.entries(reductions)) {
      out[k] = (out[k] ?? 0) - v
    }
    return out
  })()

  function calcArmorMult(defPct: number, pen: number): { mult: number; branch: 'low'|'high' } {
    const def = defPct / 100
    if (def <= pen + 0.2) {
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
  function fmt4(n: number) {
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

  interface ComputedType {
    key: string; label: string; color: string
    typeBase: number; scalingMult: number; combatMult: number
    applicableBoosts: Array<{ perkName: string; label: string; mult: number }>
    weaponBoostMult: number; weaponBoostLabel?: string
    typeDebuffMult: number
    defMult: number; enemyDefPct: number
    raw: number; critVal: number
    isHeal: boolean
    isLuminescent?: boolean
    isChainLightning?: boolean
    isExplosiveCharge?: boolean
    isCurseRip?: boolean
    forceCrit: boolean
    isCritExempt?: boolean
    healBoostMult?: number
  }
  interface ComputedHit {
      group: string; index: number; count: number; isFinisher: boolean; label?: string
      isHeal: boolean
      types: ComputedType[]
  }

  $: critChance  = crit?.effectiveCritChance ?? 0
  $: critDmgMult = crit?.critDamageMultiplier ?? 100

  function defPctForType(k: string): number {
    if (k === 'true' || k === 'summon') return 0
    let pct = effectiveDefenses[k] ?? 0
    if (k === 'air' || k === 'earth') pct += effectiveDefenses['physical'] ?? 0
    else if (k === 'fire' || k === 'water' || k === 'hex' || k === 'holy') pct += effectiveDefenses['magic'] ?? 0
    return pct
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

  function getApplicableBoosts(k: string, isHeal: boolean): Array<{ perkName: string; label: string; mult: number }> {
    return typedBoostEntries
      .filter(e => e.types.includes(k) && (isHeal ? e.healMult !== 1 : e.dmgMult !== 1))
      .map(e => ({ perkName: e.perkName, label: e.label, mult: isHeal ? e.healMult : e.dmgMult }))
  }

  $: computedHits = typedBoostEntries && weaponHits.map((hit): ComputedHit => {
    const isHeal = hit.isHeal ?? false
    const types: ComputedType[] = Object.entries(hit.dmgTypes ?? {}).map(([k, mult]) => {
      const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
      const applicableBoosts = getApplicableBoosts(k, isHeal)
      const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)

      let enemyDefPct = 0
      if (!isHeal && k !== 'true' && k !== 'summon') {
        enemyDefPct = effectiveDefenses[k] ?? 0
        if (k === 'air' || k === 'earth') {
          enemyDefPct += effectiveDefenses['physical'] ?? 0
        } else if (k === 'fire' || k === 'water' || k === 'hex' || k === 'holy') {
          enemyDefPct += effectiveDefenses['magic'] ?? 0
        }
      }

      const weaponBoostMult = hit.weaponBoostMult ?? 1
      const defMult = isHeal ? 1 : calcArmorMult(enemyDefPct, penDecimal).mult
      const typeBase = hit.base * mult

      const typeDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
      const raw = typeBase * hit.scalingMult * typedMultUsed *
        hit.combatMult * weaponBoostMult * defMult *
        (isHeal ? 1 : _activeDebuffDamageMult * typeDebuffMult) * (isHeal ? 1 : selfDebuffDamageMult) *
        (isHeal ? antiHealSelfMult : 1)

      const critVal = raw * critDmgMult / 100

      return {
        key: k, label: info.label, color: info.color,
        typeBase, scalingMult: hit.scalingMult, combatMult: hit.combatMult,
        applicableBoosts, weaponBoostMult, weaponBoostLabel: hit.weaponBoostLabel,
        typeDebuffMult,
        defMult, enemyDefPct,
        raw, critVal, isHeal, forceCrit: hit.forceCrit ?? false,
      }
    })
    if (!isHeal && luminescentPct > 0) {
      const preMitSum  = computePreMitigationBase(hit)
      const preMitBase = preMitSum * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const lumAmount = preMitBase * luminescentPct
        const lumResolvedTypes = resolveDamageTypes({ holy: 1.0 }, perkDmgTypeBonuses)

        for (const [k, mult] of Object.entries(lumResolvedTypes)) {
          const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
          const applicableBoosts = getApplicableBoosts(k, false)
          const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
          const lumDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
          const lumDefPct  = defPctForType(k)
          const lumDefMult = calcArmorMult(lumDefPct, penDecimal).mult
          const lumTypeBase = lumAmount * mult
          const lumRaw       = lumTypeBase * typedMultUsed * lumDefMult
          
          types.push({
            key: k, label: info.label, color: info.color,
            typeBase: lumTypeBase, scalingMult: 1, combatMult: 1,
            applicableBoosts, weaponBoostMult: 1, typeDebuffMult: lumDebuffMult,
            defMult: lumDefMult, enemyDefPct: lumDefPct,
            raw: lumRaw, critVal: Math.round(lumRaw * critDmgMult / 100 * 10000) / 10000,
            isHeal: false, isLuminescent: true, forceCrit: false,
          })
        }
      }
    }
    
    if (!isHeal && lightningCloakPct > 0) {
      const preMitSum  = computePreMitigationBase(hit)
      const preMitBase = preMitSum * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const cloakTotal = preMitBase * lightningCloakPct
        const lcResolvedTypes = resolveDamageTypes({ air: 0.5, magic: 0.5 }, perkDmgTypeBonuses)

        for (const [k, mult] of Object.entries(lcResolvedTypes)) {
          const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
          const applicableBoosts = getApplicableBoosts(k, false)
          const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
          const lcDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
          const lcDefPct  = defPctForType(k)
          const lcDefMult = calcArmorMult(lcDefPct, penDecimal).mult
          const lcTypeBase = cloakTotal * mult
          const lcRaw       = lcTypeBase * typedMultUsed * lcDefMult
          
          types.push({
            key: k, label: info.label, color: info.color,
            typeBase: lcTypeBase, scalingMult: 1, combatMult: 1,
            applicableBoosts, weaponBoostMult: 1, typeDebuffMult: lcDebuffMult,
            defMult: lcDefMult, enemyDefPct: lcDefPct,
            raw: lcRaw, critVal: Math.round(lcRaw * critDmgMult / 100 * 10000) / 10000,
            isHeal: false, isChainLightning: true, forceCrit: false,
          })
        }
      }
    }

    if (!isHeal && explosiveChargePct > 0 && hit.group === 'WA') {
      const preMitSum  = computePreMitigationBase(hit)
      const preMitBase = preMitSum * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const explosiveTotal = preMitBase * explosiveChargePct
        const ecResolvedTypes = resolveDamageTypes({ physical: 0.5, fire: 0.5 }, perkDmgTypeBonuses)

        for (const [k, mult] of Object.entries(ecResolvedTypes)) {
          const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
          const applicableBoosts = getApplicableBoosts(k, false)
          const typedMultUsed = applicableBoosts.reduce((acc, b) => acc * b.mult, 1)
          const ecDebuffMult = _activeDebuffTypeDamageMult[k] ?? 1
          const ecDefPct  = defPctForType(k)
          const ecDefMult = calcArmorMult(ecDefPct, penDecimal).mult
          const ecTypeBase = explosiveTotal * mult
          const ecRaw       = ecTypeBase * typedMultUsed * ecDefMult

          types.push({
            key: k, label: info.label, color: info.color,
            typeBase: ecTypeBase, scalingMult: 1, combatMult: 1,
            applicableBoosts, weaponBoostMult: 1, typeDebuffMult: ecDebuffMult,
            defMult: ecDefMult, enemyDefPct: ecDefPct,
            raw: ecRaw, critVal: Math.round(ecRaw * critDmgMult / 100 * 10000) / 10000,
            isHeal: false, isExplosiveCharge: true, forceCrit: false,
          })
        }
      }
    }

    if (!isHeal && curseRipPerkAmount > 0 && curseRipActiveDebuffCount > 0) {
      const preMitSum  = computePreMitigationBase(hit)
      const preMitBase = preMitSum * _activeDebuffDamageMult * selfDebuffDamageMult

      if (preMitBase > 0) {
        const healAmount = preMitBase / 60
        if (healAmount > 0) {
          const healRaw = healAmount * curseRipHealMult * antiHealSelfMult
          
          types.push({
            key: 'heal', label: 'Heal', color: '#4ade80',
            typeBase: healAmount, scalingMult: 1, combatMult: 1,
            applicableBoosts: [], weaponBoostMult: 1, typeDebuffMult: 1,
            defMult: 1, enemyDefPct: 0,
            raw: healRaw, critVal: healRaw,
            isHeal: true, isCurseRip: true, forceCrit: false,
            healBoostMult: curseRipHealMult !== 1 ? curseRipHealMult : undefined,
          })
        }
      }
    }
    

    return { group: hit.group, index: hit.index, count: hit.count, isFinisher: hit.isFinisher, label: hit.label, isHeal, types }
  })

  $: m1Hits   = computedHits.filter(h => h.group === 'M1')
  $: m2Hits   = computedHits.filter(h => h.group === 'M2')
  $: waHits   = computedHits.filter(h => h.group === 'WA')
  $: runeHits = computedHits.filter(h => h.group === 'Rune')
  $: perkHits = computedHits.filter(h => h.group !== 'M1' && h.group !== 'M2' && h.group !== 'WA' && h.group !== 'Rune')

  $: hitGroups = [
    { label: m1Label, list: m1Hits },
    { label: 'M2', list: m2Hits },
    { label: 'WA', list: waHits },
    ...(runeHits.length > 0 ? [{ label: 'Rune', list: runeHits }] : []),
    ...(perkHits.length > 0 ? [{ label: 'Perk', list: perkHits }] : [])
  ]

  // ── Totals ──────────────────────────────────────────────────
  function hitTypeSum(hit: ComputedHit, useCrit: boolean, includeCount: boolean = false): number {
    const sum = hit.types.filter(t => !t.isCurseRip).reduce((s, t) => s + ((useCrit || t.forceCrit) ? t.critVal : t.raw), 0)
    return sum * (includeCount ? hit.count : 1)
  }
  function groupTotalSum(list: ComputedHit[], useCrit: boolean): number {return list.filter(h => !h.isHeal).reduce((s, h) =>s +h.types.filter(t => !t.isCurseRip).reduce((ts, t) => ts + ((useCrit || t.forceCrit) ? t.critVal : t.raw),0) * h.count, 0)}

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
</script>

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
        <div class="bdc-no-hp">∞ No HP</div>
        {#if armorPen > 0}
          <div class="bdc-pen-badge">🗡 {fmt(armorPen)} Pen</div>
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
                    title="Switch variant (currently: {(d.variants ?? [])[activeVariants.get(d.name) ?? 0]?.sourceName ?? d.name})"
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
              class:bdc-preset-chip--active={activePreset === p.id}
              style="--pc:{p.color}"
              title={p.desc}
              on:click={() => applyPreset(p)}
            >{p.label}</button>
          {/each}
          <button class="bdc-preset-chip bdc-preset-chip--reset" on:click={resetDefenses}>Reset</button>
        </div>
      </div>

      <div class="bdc-def-grid">
        {#each DMG_TYPES.filter(t => t.id !== 'true' && t.id !== 'summon' && t.id !== 'heal') as t}
          <div class="bdc-def-row" style="--tc:{t.color}">
            <span class="bdc-def-type">{t.label}</span>
            <input
              class="bdc-def-input"
              type="number"
              min="-200"
              max="1000"
              step="1"
              value={defenses[t.id]}
              on:input={e => { defenses[t.id] = parseFloat((e.target as HTMLInputElement).value) || 0; defenses = defenses; activePreset = null }}
            />
            <span class="bdc-def-pct">%</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="bdc-calc-col">
      {#if showCritToggle}
        <div class="bdc-crit-toggle-row">
          <button
            class="bdc-crit-toggle"
            class:bdc-crit-toggle--on={showCritValues}
            on:click={() => showCritValues = !showCritValues}
          >
            <CritIcon size={12}/> {showCritValues ? 'Crit ON' : 'Crit OFF'}
          </button>
        </div>
      {/if}

      {#if hitGroups.every(g => g.list.length === 0)}
        <p class="bdc-empty">No weapon hits available.</p>
      {:else}
        <div class="bdc-hit-list">
          {#each hitGroups as grp}
            {#if grp.list.length > 0}
              {@const gTotal = groupTotalSum(grp.list, showCritValues)}
              <div class="bdc-hit-list-grp">
                <div class="bdc-grp-head">
                  <span class="bdc-hit-grp-label">{grp.label}</span>
                  {#if grp.label !== 'Perk'}
                    <span class="bdc-grp-total" class:bdc-grp-total--crit={showCritValues}>
                      {#if showCritValues}<CritIcon size={10}/>{/if}
                      {fmt1(gTotal)}
                    </span>
                  {/if}
                </div>
                <div class="bdc-hit-list-rows">
                  {#each grp.list as hit}
                    {@const hSum = hitTypeSum(hit, showCritValues)}
                    {@const hSumWithCount = hitTypeSum(hit, showCritValues, true)}
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
                            class:bdc-hit-type-chunk--luminescent={t.isLuminescent || t.isChainLightning}
                            class:bdc-hit-type-chunk--crit={(showCritValues && !t.isCritExempt) || t.forceCrit}
                            role="group"
                            on:mouseenter={(e) => {
                              const el = e.currentTarget;
                              const needFlip = el.getBoundingClientRect().bottom + 250 > window.innerHeight;
                              if (needFlip) el.classList.add('bdc-hit-type-chunk--flip');
                              el.classList.add('bdc-hit-type-chunk--hovered');
                            }}
                            on:mouseleave={(e) => {
                              e.currentTarget.classList.remove('bdc-hit-type-chunk--hovered', 'bdc-hit-type-chunk--flip');
                            }}
                            on:touchstart={(e) => {
                              const el = e.currentTarget;
                              const needFlip = el.getBoundingClientRect().bottom + 250 > window.innerHeight;
                              if (needFlip) el.classList.add('bdc-hit-type-chunk--flip');
                              el.classList.add('bdc-hit-type-chunk--hovered');
                              el.dataset.touchStart = String(Date.now());
                            }}
                            on:touchend={(e) => {
                              const el = e.currentTarget;
                              const start = el.dataset.touchStart;
                              delete el.dataset.touchStart;
                              if (start && Date.now() - +start > 300) {
                                el.classList.remove('bdc-hit-type-chunk--hovered', 'bdc-hit-type-chunk--flip');
                              }
                            }}>
                            <div class="bdc-hit-type-top">
                              <div class="bdc-hit-type-val-row">
                                {#if (showCritValues && !t.isCritExempt) || t.forceCrit}
                                  <span class="bdc-crit-inline-icon"><CritIcon size={12} /></span>
                                {/if}
                                <span class="bdc-hit-type-val">{fmt(((showCritValues && !t.isCritExempt) || t.forceCrit) ? t.critVal : t.raw)}</span>
                              </div>
                              <div class="bdc-hit-type-label-row">
                                <span class="bdc-hit-type-label">{t.label}{t.isHeal && t.label.toLowerCase() !== 'heal' ? ' Heal' : ''}</span>
                                {#if t.isLuminescent}
                                  <span class="bdc-lum-badge" title="Luminescent Fervor: 5% × perk amount of this hit's damage">✦ Luminescent</span>
                                {/if}
                                {#if t.isChainLightning}
                                  <span class="bdc-lum-badge bdc-chain-badge" title="Lightning Cloak: 1/3 of hit damage as Air+Magic chain lightning (up to 4 targets)">Chain</span>
                                {/if}
                                {#if t.isExplosiveCharge}
                                  <span class="bdc-lum-badge bdc-explosive-badge" title="Explosive Charge: 100% of WA pre-boost damage as Physical+Fire explosion">✦ Explosive</span>
                                {/if}
                                {#if t.isCurseRip}
                                  <span class="bdc-lum-badge bdc-curse-rip-badge" title="Curse Rip: 1/60 of damage dealt as lifesteal (requires debuffed opponent)">✦ Curse Rip</span>
                                {/if}
                                {#if hit.group === 'Rune' && draconicRunesBonus[t.label.toLowerCase()]}
                                  <span class="bdc-dr-badge" title="Draconic Bonus: +{fmt((draconicRunesBonus[t.label.toLowerCase()] || 0))} {t.label} damage type">
                                    ✦ +{fmt((draconicRunesBonus[t.label.toLowerCase()] || 0))}
                                  </span>
                                {/if}
                              </div>
                            </div>
                            <div class="bdc-hit-type-formula">
                              <div class="bdc-fr">
                                <span class="bdc-fr-label">Base Damage</span>
                                <span class="bdc-fr-val">{fmt(t.typeBase)}</span>
                              </div>
                              {#if t.scalingMult !== 1}
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Scaling</span>
                                  <span class="bdc-fr-val bdc-fr-val--scaling">× {fmtMult(t.scalingMult)}</span>
                                </div>
                              {/if}
                              {#if t.applicableBoosts && t.applicableBoosts.length > 0}
                                {#each t.applicableBoosts as boost}
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
                                  <span class="bdc-fr-label">Self-Debuff (Weakness)</span>
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
                                <div class="bdc-fr">
                                  <span class="bdc-fr-label">Defense ({fmt(t.enemyDefPct)}% / Pen {fmt(armorPen)})</span>
                                  <span class="bdc-fr-val bdc-fr-val--def" class:bdc-fr-val--amplify={t.defMult > 1}>× {fmtMult(t.defMult)}</span>
                                </div>
                              {/if}
                              <div class="bdc-fr-divider"></div>
                              <div class="bdc-fr bdc-fr--result">
                                <span class="bdc-fr-label">Final Damage</span>
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
                        
                        <span class="bdc-hit-type-sum-sep">=</span>
                          <span class="bdc-hit-type-sum" class:bdc-hit-type-sum--crit={showCritValues || hitForceCrit}>
                          {#if showCritValues || hitForceCrit}<CritIcon size={11}/>{/if}
                          {fmt4(hSumWithCount)}
                        </span>
                        
                        {#if hit.isFinisher}<span class="bdc-hit-fin">✦</span>{/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

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

.bdc-no-hp {
  font-size: .6rem;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(248,113,113,.12);
  border: 1px solid rgba(248,113,113,.28);
  color: #f87171;
  letter-spacing: .1em;
  text-shadow: 0 0 8px rgba(248,113,113,.4);
}

.bdc-pen-badge {
  font-size: .6rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(229,229,229,.1);
  border: 1px solid rgba(229,229,229,.25);
  color: #e5e5e5;
  letter-spacing: .06em;
  white-space: nowrap;
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
.bdc-crit-toggle-row {
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
  font-size: 1.18rem;
  font-weight: 900;
  color: var(--ink, #e8e4da);
  padding: 5px 13px;
  border-radius: 8px;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.14);
  letter-spacing: -.01em;
  min-width: 64px;
}

.bdc-hit-type-sum--crit {
  color: #e2b203;
  background: rgba(226,178,3,.12);
  border-color: rgba(226,178,3,.3);
  text-shadow: 0 0 10px rgba(226,178,3,.35);
}

/* ── Full hit list (no selection needed) ── */
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
.bdc-lum-badge {
  font-size: .45rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.bdc-explosive-badge {
  color: #f97316;
  background: rgba(249,115,22,.12);
  border: 1px solid rgba(249,115,22,.3);
}
.bdc-dr-badge {
  font-size: .45rem;
  font-weight: 700;
  color: #c084fc;
  background: rgba(192,132,252,.12);
  border: 1px solid rgba(192,132,252,.3);
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.bdc-chain-badge {
  font-size: .45rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #AAFFDB;
  background: rgba(170,255,219,.12);
  border: 1px solid rgba(170,255,219,.3);
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.bdc-curse-rip-badge {
  font-size: .45rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: #e879f9;
  background: rgba(232,121,249,.12);
  border: 1px solid rgba(232,121,249,.3);
  padding: 1px 4px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: .05em;
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

  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;

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
</style>