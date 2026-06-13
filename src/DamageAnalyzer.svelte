<script lang="ts">
  import { build, result } from './lib/store'
  import { calcWeapon, calcMonkWeapon, isMonkGuild } from './lib/engine'
  import BaseDamageCalc from './BaseDamageCalc.svelte'
  import { WEAPON_ARTS } from './data/weaponArts'
  import { WEAPON_BASE_DMG } from './data/weapon base dmg'
  import { DMG_TYPE_COLORS, DMG_TYPE_PRIORITY, ONE_HANDED_TYPES, type WeaponBaseDmg } from './lib/types'
  import { getActiveBuildBuffs, getPerkBuffs, getWeaponArtBuffs, applyBuffPerkModifiers } from './data/BuffData'
  import { WA_SUMMON_MAP, SUMMON_MAP, calcSummonStat } from './data/SummonData'
  import CritIcon from './CritIcon.svelte'

  $: _waSummonDef = (() => {
    const summonName = WA_SUMMON_MAP[selectedWA.name]
    if (!summonName) return null
    const def = SUMMON_MAP[summonName]
    if (!def) return null
    const sb = (($result.stats as Record<string,number>).summonBoost ?? 0)
    const lv = $build.level ?? 80
    return {
      ...def,
      scaledDmg: calcSummonStat(def.baseDmg, sb, lv),
      scaledHp: def.baseHp !== undefined ? calcSummonStat(def.baseHp, sb, lv) : undefined,
      scaledAttacks: def.attacks?.map(a => ({ 
        ...a,
        scaledDmg: calcSummonStat(a.baseDmg, sb, lv),
      })),
      summonBoostPct: sb,
    }
  })()

  $: _showCrit = crit.effectiveCritChance > 0
  $: _critMult = crit.critDamageMultiplier / 100  
  let showCritValues = false

  $: crit = $result.crit
  $: boosts = $result.boosts
  $: stats = $result.stats
  $: perks = $result.perks

  $: _activeRageBuffs = (() => {
    const itemBuffs = getActiveBuildBuffs({
      rune: $build.rune,
      ring: $build.ring,
      infusionRing: $build.infusionRing,
      helmet: $build.helmet,
      chestplate: $build.chestplate,
      leggings: $build.leggings,
      weaponBlade: $build.weaponBlade,
      weaponHandle: $build.weaponHandle,
      monkGlove: $build.monkGlove,
    })
    const all = applyBuffPerkModifiers(
      [...itemBuffs, ...getPerkBuffs($result.perks), ...getWeaponArtBuffs($build.selectedWeaponArt)],
      $result.perks,
      $build.rune || undefined
    )
    return all.filter(b => b.buffName === 'Rage')
  })()

  $: _ragePotency = _activeRageBuffs.length > 0
    ? Math.max(..._activeRageBuffs.map(b => b.potency))
    : 0

  $: _rageAffectedTypes = (() => {
    if (_ragePotency <= 0) return new Set<string>()
    const types = new Set(['physical'])
    if ((perks['Mage Rage'] ?? 0) > 0) types.add('magic')
    if ((perks['Oceans Rage'] ?? 0) > 0) types.add('water')
    if ((perks['Scourge'] ?? 0) > 0) types.add('true')
    if ((perks['Cursed Experiment'] ?? 0) > 0) types.add('hex')
    return types
  })()

  $: _rageMult = _ragePotency > 0
    ? Math.round((1 + _ragePotency) * 10000) / 10000
    : 1

  type HitSeq = (number | { n: number; count: number })[]

  interface WeaponChargeConfig {
    enabled: boolean
    label: string
    max: number
    formula: (base: number, charge: number) => number
  }

  type DamageDisplayType = {
    label: string
    rawVal: number
    val: number
    scalingMult: number
    color: string
    rageApplied?: boolean
  }

  interface WeaponBaseDmg {
    type: string
    m1: HitSeq | null
    m2: HitSeq | null
    m2Charge?: WeaponChargeConfig
  }

  function fmtSeq(seq: HitSeq): string {
    return seq.map(h => {
      if (typeof h === 'number') return String(h)
      return `${h.n}\u00d7${h.count}`
    }).join(', ')
  }

  type HitBreakdown = Array<{
    label: string
    rawVal: number
    val: number
    scalingMult: number
    color: string
    rageApplied?: boolean
  }>

  function fmtNum(n: number): string {
    const r = Math.round(n * 100) / 100
    return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
  }

  function seqWithTypes(
    seq: HitSeq,
    dmgTypes: Record<string, number>,
    scalingMult: number = 1,
    rageMult: number = 1,
    rageAffectedTypes: Set<string> = new Set()
  ): Array<{ base: number; count: number; types: HitBreakdown }> {
    return seq.map(h => {
      const base = typeof h === 'number' ? h : h.n
      const count = typeof h === 'number' ? 1 : h.count
      const types: HitBreakdown = Object.entries(dmgTypes).map(([k, mult]) => {
        const rageApplied = rageMult !== 1 && rageAffectedTypes.has(k)
        const finalMult = rageApplied ? mult * rageMult : mult
        return {
          label: k.charAt(0).toUpperCase() + k.slice(1),
          rawVal: Math.round(base * 100) / 100,
          val: Math.round(base * finalMult * scalingMult * 100) / 100,
          scalingMult,
          color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
          rageApplied,
        }
      })
      return { base, count, types }
    })
  }

  $: _isMonk = isMonkGuild($build.guild)

  $: _blasterCount = [$build.ring, $build.infusionRing, $build.infusionHelmet, $build.infusionChestplate, $build.infusionLeggings]
    .filter(s => s === 'Blaster Ring').length

  $: _hasLockedAndLoaded = ($result.perks['Locked And Loaded'] ?? 0) > 0

  interface GunOverlay {
    type: string
    m2Only: boolean
    m2NoLock?: boolean
  }

  $: _weaponResult = _isMonk
    ? (($build.monkGlove || $build.monkEssence) ? calcMonkWeapon($build.monkGlove, $build.monkEssence, $build.shrineActive, $build.guildRank) : null)
    : (($build.weaponBlade || $build.weaponHandle) ? calcWeapon($build.weaponBlade, $build.weaponHandle, $build.shrineActive) : null)

  $: _baseWeaponType = _weaponResult?.finalWeaponType ?? ''
  $: _weaponPerks = _weaponResult?.perks ?? {}

  $: _gunOverlay = ((): GunOverlay | null => {
    const wt = _baseWeaponType
    const isFists = wt === 'Fists' || wt === 'Chain Fists'

    if (_blasterCount >= 2) {
      if (isFists) return { type: 'Rifle', m2Only: false, m2NoLock: true }
      if (wt) return { type: 'Shotgun', m2Only: true }
    }

    if (_hasLockedAndLoaded) {
      if (isFists) return { type: 'Dual Guns', m2Only: false }
      if (wt) return { type: 'Side Gun', m2Only: true }
    }

    if ((_weaponPerks['Cosmic Ray'] ?? 0) > 0) {
      return { type: 'Cosmic Ray', m2Only: true }
    }
    if ((_weaponPerks['Mine'] ?? 0) > 0) {
      return { type: 'Mine', m2Only: true }
    }

    return null
  })()

  $: _displayRows = (() => {
    type MergedRow = WeaponBaseDmg & { gunLabel?: string; m2Only?: boolean; m2NoLock?: boolean }
    const rows: MergedRow[] = []

    if (_baseWeaponType) {
      const base = WEAPON_BASE_DMG.find(w => w.type === _baseWeaponType)
      if (base) {
        if (_gunOverlay) {
          const gun = WEAPON_BASE_DMG.find(w => w.type === _gunOverlay.type)
          if (_gunOverlay.m2Only) {
            rows.push({ type: _baseWeaponType, m1: base.m1, m2: gun?.m2 ?? null, gunLabel: _gunOverlay.type, m2Only: true, m2NoLock: _gunOverlay.m2NoLock })
          } else {
            rows.push({ type: _baseWeaponType, m1: gun?.m1 ?? null, m2: gun?.m2 ?? null, gunLabel: _gunOverlay.type, m2Only: false, m2NoLock: _gunOverlay.m2NoLock })
          }
        } else {
          rows.push({ ...base })
        }
      }
    } else if (_gunOverlay) {
      const gun = WEAPON_BASE_DMG.find(w => w.type === _gunOverlay.type)
      if (gun) rows.push({ ...gun, gunLabel: _gunOverlay.type, m2NoLock: _gunOverlay.m2NoLock })
    }

    return rows
  })()

  $: _currentLabel = _gunOverlay && _baseWeaponType
    ? `${_baseWeaponType} + ${_gunOverlay.type}`
    : _gunOverlay?.type ?? _baseWeaponType

  // Aggregated perk-based damage type bonuses applied unconditionally to ALL attacks.
  // Add new perks here — they'll automatically propagate to M1/M2, WA, and per-hit.
  $: _perkDmgTypeBonuses = (() => {
    const bonus: Record<string, number> = {}
    const voidRage = ($result.perks['Void Rage'] ?? 0)
    if (voidRage > 0 && _ragePotency > 0) {
      bonus['hex'] = Math.round(voidRage * 0.1 * 100) / 100
    }
    return bonus
  })()

  function _applyDmgBonuses(base: Record<string, number>, bonuses: Record<string, number>): Record<string, number> {
    if (Object.keys(bonuses).length === 0) return base
    const out = { ...base }
    for (const [k, v] of Object.entries(bonuses)) {
      out[k] = Math.round(((out[k] ?? 0) + v) * 100) / 100
    }
    return out
  }

  $: _weaponDmgTypes = (() => {
    const base: Record<string, number> = { ...(_weaponResult?.damageTypes ?? {}) }
    const stoneWeapon = ($result.perks['Stone Weapon'] ?? 0)
    if (stoneWeapon > 0) {
      base['earth'] = Math.round(((base['earth'] ?? 0) + stoneWeapon * 0.3) * 100) / 100
    }
    return _applyDmgBonuses(base, _perkDmgTypeBonuses)
  })()

  $: _gunDmgTypes = (() => {
    if (!_gunOverlay) return _weaponDmgTypes
    const entries = Object.entries(_weaponDmgTypes)
    if (entries.length === 0) return _weaponDmgTypes
    const PRIORITY = DMG_TYPE_PRIORITY
    
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        const pa = PRIORITY.indexOf(a[0])
        const pb = PRIORITY.indexOf(b[0])
        const ia = pa === -1 ? 999 : pa
        const ib = pb === -1 ? 999 : pb
        return ib < ia ? b : a
      }
      return a
    })
    
    const total = Math.round(entries.reduce((s, [, v]) => s + v, 0) * 100) / 100
    return { [highestKey]: total }
  })()

  let showAllWeapons = false

  function fmtMult(n: number): string {
    return `×${n.toFixed(4)}`
  }
  function isFinisher(row: any, attackType: 'm1' | 'm2', hitIndex: number): boolean {
    if (attackType === 'm2') return true
    const hasFinisher = (row as any).hasM1Finisher ?? true
    if (!hasFinisher) return false
    return row.m1 ? hitIndex === row.m1.length - 1 : false
  }

  $: natSources = crit.naturalBreakdown
  $: allCritSources = crit.allCritBreakdown
  $: critDmgSources = crit.critDmgBreakdown

  let disabledBoosts = new Set<string>([
    'Thief Training (would-crit bonus)'
  ])

  function toggleBoost(name: string) {
    if (disabledBoosts.has(name)) disabledBoosts.delete(name)
    else disabledBoosts.add(name)
    disabledBoosts = new Set(disabledBoosts)
  }

  $: activeEntries = boosts.dmgEntries.filter(e => !disabledBoosts.has(e.sourceName))
  $: hasDisabledVisible = boosts.dmgEntries.some(e => disabledBoosts.has(e.sourceName))
  $: activeFinalMult = activeEntries.reduce((acc, e) => acc * e.rawMultiplier, 1.0)
  $: activeFinalMultRounded = Math.round(activeFinalMult * 10000) / 10000

  const SCALING_TO_BOOST: Record<string, string> = {
    physical:   'physicalBoost',
    magic:      'magicBoost',
    fire:       'fireBoost',
    water:      'waterBoost',
    earth:      'earthBoost',
    air:        'airBoost',
    hex:        'hexBoost',
    holy:       'holyBoost',
    dexterity:  'dexterityBoost',
    summon:     'summonBoost',
  }

  const SCALING_COLORS: Record<string, string> = {
    physical:  '#fb923c',
    magic:     '#818cf8',
    fire:      '#f97316',
    water:     '#38bdf8',
    earth:     '#a3e635',
    air:       '#AAFFDB',
    hex:       '#e879f9',
    holy:      '#facc15',
    dexterity: '#34d399',
    summon:    '#c084fc',
  }

  interface ScalingRow {
    key: string
    label?: string 
    scalingVal: number
    boostKey: string
    boostPct: number
    contribution: number
    color: string
  }

  $: scalingBreakdown = (() => {
    if (!_weaponResult) return { rows: [] as ScalingRow[], totalEffectivePct: 0, multiplier: 1 }
    const scalings = _weaponResult.scalings
    const rows: ScalingRow[] = []
    for (const [key, scalingVal] of Object.entries(scalings)) {
      if (!scalingVal) continue
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
      const contribution = Math.round(scalingVal * boostPct * 100) / 100
      rows.push({ key, scalingVal, boostKey, boostPct, contribution, color: SCALING_COLORS[key] ?? '#e8e4da' })
    }
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + r.contribution, 0) * 100) / 100
    const multiplier = Math.round((1 + totalEffectivePct / 100) * 10000) / 10000
    return { rows, totalEffectivePct, multiplier }
  })()

  $: waScalingBreakdown = (() => {
    if (selectedWA.hitScalings?.length) {
      const rows: ScalingRow[] = []
      for (let i = 0; i < selectedWA.hitScalings.length; i++) {
        const scaling = selectedWA.hitScalings[i]
        if (!scaling || scaling === 'Same as weapon') continue
        const dmgLabel = selectedWA.hitDamageTypes?.[i]?.match(/[A-Za-z]+/)?.[0] ?? `Hit ${i+1}`
        const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
        let m
        while ((m = re.exec(scaling)) !== null) {
          const key = /dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()
          const boostKey = SCALING_TO_BOOST[key]
          if (!boostKey) continue
          const scalingVal = parseFloat(m[1])
          const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
          rows.push({ 
            key,
            label: `${dmgLabel} · ${key} ×${scalingVal}`,
            scalingVal,
            boostKey,
            boostPct,
            contribution: Math.round(scalingVal * boostPct * 100) / 100,
            color: SCALING_COLORS[key] ?? '#e8e4da'
          })
        }
      }
      if (!rows.length) return null
      const totalContribution = rows.reduce((sum, row) => sum + row.contribution, 0)
      const avgEffectivePct = Math.round((totalContribution / rows.length) * 100) / 100
      const multiplier = Math.round((1 + avgEffectivePct / 100) * 10000) / 10000
      return {
        rows,
        totalEffectivePct: avgEffectivePct,
        multiplier,
        isPerHit: true
      }
    }

    const sc = selectedWA.scaling
    if (!sc || sc === 'Same as weapon' || sc === 'None') return null
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
    const parsed: Record<string, number> = {}
    let m: RegExpExecArray | null
    while ((m = re.exec(sc)) !== null)
      parsed[/dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()] = parseFloat(m[1])
    const rows: ScalingRow[] = []
    for (const [key, scalingVal] of Object.entries(parsed)) {
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
      rows.push({ key, scalingVal, boostKey, boostPct,
        contribution: Math.round(scalingVal * boostPct * 100) / 100,
        color: SCALING_COLORS[key] ?? '#e8e4da' })
    }
    if (!rows.length) return null
    const totalEffectivePct = Math.round(rows.reduce((a, r) => a + r.contribution, 0) * 100) / 100
    return { rows, totalEffectivePct,
      multiplier: Math.round((1 + totalEffectivePct / 100) * 10000) / 10000,
      isPerHit: false }
  })()

  $: waScalingSameAsWeapon = selectedWA.scaling === 'Same as weapon'
  $: waScalingIsHealOnly = !_waHitsSeq && !!_waHealSeq

  const SCALING_TO_BOOST_KEY: Record<string, string> = {
    physical: 'physicalBoost', magic: 'magicBoost', fire: 'fireBoost',
    water: 'waterBoost', earth: 'earthBoost', air: 'airBoost',
    hex: 'hexBoost', holy: 'holyBoost', dexterity: 'dexterityBoost', summon: 'summonBoost',
  }

  $: _scalingMult = (() => {
    if (!_weaponResult) return 1
    const scalings = _weaponResult.scalings
    let totalEffectivePct = 0
    for (const [key, scalingVal] of Object.entries(scalings)) {
      const boostKey = SCALING_TO_BOOST_KEY[key]
      if (!boostKey) continue
      const boostPct = (stats as Record<string, number>)[boostKey] ?? 0
      totalEffectivePct += scalingVal * boostPct
    }
    return Math.round((1 + totalEffectivePct / 100) * 10000) / 10000
  })()

  $: selectedWA = WEAPON_ARTS.find(wa => wa.name === $build.selectedWeaponArt) ?? WEAPON_ARTS[0]

  function parseWAHitsAll(baseDamage: string | undefined): {
    dmg: Array<{ n: number; count: number }>
    heal: Array<{ n: number; count: number }>
  } {
    const empty = { dmg: [], heal: [] }
    if (!baseDamage) return empty
    if (/\d+[^+]*[–—]\s*\d+/.test(baseDamage)) return empty
    const dmg: Array<{ n: number; count: number }> = []
    const heal: Array<{ n: number; count: number }> = []
    for (const part of baseDamage.split(/\s*\+\s*/)) {
      const isHeal = /healing/i.test(part)
      const mx = part.match(/([\d.]+)\s*[×x]\s*(\d+)/i)
      if (mx) {
        ;(isHeal ? heal : dmg).push({ n: parseFloat(mx[1]), count: parseInt(mx[2]) })
        continue
      }
      const nx = part.match(/^([\d.]+)/)
      if (nx) (isHeal ? heal : dmg).push({ n: parseFloat(nx[1]), count: 1 })
    }
    return { dmg, heal }
  }

  $: _waAllHits = parseWAHitsAll(selectedWA.baseDamage)
  $: _waHitsSeq = _waAllHits.dmg.length > 0 ? _waAllHits.dmg : null
  $: _waHealSeq = _waAllHits.heal.length > 0 ? _waAllHits.heal : null

  $: _waDmgTypes = (() => {
    const dt = selectedWA.damageType
    if (!dt || dt === 'Same as weapon') return _weaponDmgTypes
    if (dt.includes('Highest damage type')) {
      const entries = Object.entries(_weaponDmgTypes)
      if (entries.length === 0) return _weaponDmgTypes
      const PRIORITY = ['hex', 'water', 'air', 'true', 'earth', 'magic', 'fire', 'physical', 'holy']
      const [highestKey] = entries.reduce((a, b) => {
        if (b[1] > a[1]) return b
        if (b[1] === a[1]) {
          const ia = PRIORITY.indexOf(a[0])
          const ib = PRIORITY.indexOf(b[0])
          return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
        }
        return a
      })
      const total = Math.round(entries.reduce((s, [, v]) => s + v, 0) * 100) / 100
      return _applyDmgBonuses({ [highestKey]: total }, _perkDmgTypeBonuses)
    }
    const types: Record<string, number> = {}
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(dt)) !== null) types[m[2].toLowerCase()] = parseFloat(m[1])
    const base = Object.keys(types).length > 0 ? types : { ..._weaponDmgTypes }
    return _applyDmgBonuses(base, _perkDmgTypeBonuses)
  })()

  $: _waScalingMult = (() => {
    const sc = selectedWA.scaling
    if (!sc || sc === 'Same as weapon') return _scalingMult
    if (sc === 'None') return 1
    const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
    let totalPct = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(sc)) !== null) {
      const typeName = /dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()
      totalPct += parseFloat(m[1]) * ((stats as Record<string, number>)[typeName + 'Boost'] ?? 0)
    }
    return Math.round((1 + totalPct / 100) * 10000) / 10000
  })()

  $: _waTyped = (() => {
    if (!_waHitsSeq || Object.keys(_waDmgTypes).length === 0) return null
    const seq: HitSeq = _waHitsSeq.map(h => h.count === 1 ? h.n : h)

    if (selectedWA.hitDamageTypes && selectedWA.hitDamageTypes.length > 0) {
      return seq.map((h, i) => {
        const base = typeof h === 'number' ? h : h.n
        const count = typeof h === 'number' ? 1 : h.count
        const dtStr = selectedWA.hitDamageTypes![Math.min(i, selectedWA.hitDamageTypes!.length - 1)]

        const hitScalingStr = selectedWA.hitScalings?.[Math.min(i, (selectedWA.hitScalings?.length ?? 1) - 1)]
        let hitScalingMult = _waScalingMult
        if (hitScalingStr && hitScalingStr !== 'Same as weapon') {
          const scRe = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
          let totalPct = 0
          let scM: RegExpExecArray | null
          while ((scM = scRe.exec(hitScalingStr)) !== null) {
            const typeName = /dex/i.test(scM[2]) ? 'dexterity' : scM[2].toLowerCase()
            totalPct += parseFloat(scM[1]) * ((stats as Record<string, number>)[typeName + 'Boost'] ?? 0)
          }
          hitScalingMult = Math.round((1 + totalPct / 100) * 10000) / 10000
        } else if (hitScalingStr === 'Same as weapon') {
          hitScalingMult = _scalingMult
        }

        if (dtStr === 'Same as weapon') {
          const types: DamageDisplayType[] = Object.entries(_weaponDmgTypes).map(([k, mult]) => ({
            label: k.charAt(0).toUpperCase() + k.slice(1),
            rawVal: Math.round(base * 100) / 100,
            val: Math.round(base * mult * hitScalingMult * 100) / 100,
            scalingMult: hitScalingMult,
            color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
          }))
          return { base, count, types }
        }

        const dtParsed: Record<string, number> = {}
        const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
        let m: RegExpExecArray | null
        while ((m = re.exec(dtStr)) !== null) dtParsed[m[2].toLowerCase()] = parseFloat(m[1])
        const dtFinal = _applyDmgBonuses(dtParsed, _perkDmgTypeBonuses)
        const types: DamageDisplayType[] = Object.entries(dtFinal).map(([k, mult]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          rawVal: Math.round(base * 100) / 100,
          val: Math.round(base * mult * hitScalingMult * 100) / 100,
          scalingMult: hitScalingMult,
          color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
        }))
        
        return { base, count, types }
      })
    }

    return seqWithTypes(seq, _waDmgTypes, _waScalingMult, _rageMult, _rageAffectedTypes)
  })()

  $: _waAvgTotal = (() => {
    if (!selectedWA.avgTotalHits || !_waTyped || _waTyped.length === 0) return null
    const starsPerType = selectedWA.avgTotalHits / _waTyped.length
    const baseTotal = _waTyped.reduce((sum, hit) => {
      const hitTypeSum = hit.types.reduce((s, t) => s + t.val, 0)
      return sum + hitTypeSum * starsPerType * hit.count
    }, 0)
    return {
      starsPerType: Math.round(starsPerType * 100) / 100,
      total: selectedWA.avgTotalHits,
      baseTotal: Math.round(baseTotal * 100) / 100,
    }
  })()

  $: _waScalingDiffers = _waScalingMult !== _scalingMult
  $: _showWACol = !showAllWeapons && (!!_waHitsSeq || !!selectedWA.baseDamage || !!_waSummonDef)


  function parseRangeDamage(s: string): { min: number; minLabel: string; max: number; maxLabel: string } | null {
    const m = s.match(/([\d.]+)\s*(?:\(([^)]+)\))?\s*[–—]\s*([\d.]+)\s*(?:\(([^)]+)\))?/)
    if (!m) return null
    return { min: parseFloat(m[1]), minLabel: m[2] ?? '', max: parseFloat(m[3]), maxLabel: m[4] ?? '' }
  }

  $: _waRangeDamage = (() => {
    if (_waHitsSeq !== null || !selectedWA.baseDamage) return null
    return parseRangeDamage(selectedWA.baseDamage)
  })()

  interface RangeEnd { label: string; val: number; color: string; rageApplied?: boolean; }

  $: _waRangeTyped = (() => {
    if (!_waRangeDamage || Object.keys(_waDmgTypes).length === 0) return null
    const { min, minLabel, max, maxLabel } = _waRangeDamage
    const toEnds = (base: number): RangeEnd[] =>
      Object.entries(_waDmgTypes).map(([k, mult]) => {
        const rageApplied = _rageMult !== 1 && _rageAffectedTypes.has(k)
        const finalMult = rageApplied ? mult * _rageMult : mult
        
        return {
          label: k.charAt(0).toUpperCase() + k.slice(1),
          val: Math.round(base * finalMult * _waScalingMult * 100) / 100,
          color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
          rageApplied,
        }
      })
    return { minEnds: toEnds(min), minLabel, maxEnds: toEnds(max), maxLabel }
  })()

  let weaponCharge = 100

  $: selectedWeaponData = WEAPON_BASE_DMG.find(w => w.type === (_gunOverlay?.type ?? _baseWeaponType))

  function applyWeaponCharge(dmg: number) {
    if (!selectedWeaponData?.m2Charge?.enabled) {
      return dmg
    }
    return selectedWeaponData.m2Charge.formula(dmg, weaponCharge)
  }

  $: maxSummons = 15 + Math.floor(perks['Swarm'] ?? 0);

  // ── Perk Base Damage ───────────────────────────────────────────────────────
  import { PERK_DMG_DEFS } from './data/Perkbasedmg'

  let springblastFinisherHits = 1

  /** Total hit count in the current weapon's M2 (used as finisher hits context) */
  $: _m2FinisherHits = (() => {
    if (!_displayRows.length || !_displayRows[0].m2) return 1
    return _displayRows[0].m2.reduce(
      (s: number, h: any) => s + (typeof h === 'number' ? 1 : (h.count ?? 1)), 0
    )
  })()

  /** Hit count of the last element in M1 (M1 finisher) */
  $: _m1FinisherHits = (() => {
    if (!_displayRows.length || !_displayRows[0].m1) return 1
    const m1 = _displayRows[0].m1
    const last = m1[m1.length - 1]
    return typeof last === 'number' ? 1 : (last.count ?? 1)
  })()

  function _computePerkScalingMult(scalingDef: Record<string, number>): number {
    let totalPct = 0
    for (const [key, val] of Object.entries(scalingDef)) {
      const boostKey = SCALING_TO_BOOST[key]
      if (!boostKey) continue
      totalPct += val * ((stats as Record<string, number>)[boostKey] ?? 0)
    }
    return Math.round((1 + totalPct / 100) * 10000) / 10000
  }

  interface PerkDmgComputedEntry {
    perkName: string
    perkAmount: number
    condition?: string
    hits?: number
    isM1?: boolean; isM2?: boolean; isFinisher?: boolean; isWA?: boolean; isRune?: boolean
    guardbreak?: boolean
    note?: string
    /** typed hits for M2/main finisher context */
    typedHits_m2: Array<{ rawVal: number; val: number; color: string; label: string }>
    /** typed hits for M1 finisher context (only shown if different) */
    typedHits_m1f: Array<{ rawVal: number; val: number; color: string; label: string }>
    scalingMult: number
    dmgTypeMode: 'weapon' | 'fixed'
  }

  $: _activePerkDmgEntries = (() => {
    const out: PerkDmgComputedEntry[] = []
    for (const def of PERK_DMG_DEFS) {
      const perkAmount = perks[def.perkName] ?? 0
      if (perkAmount <= 0) continue

      const resolvedDmgTypes = def.dmgTypeMode === 'weapon'
        ? _weaponDmgTypes
        : (def.dmgTypes ?? {})

      const resolvedScalings = def.scalingMode === 'weapon'
        ? _weaponResult?.scalings ?? {}
        : def.scalingMode === 'fixed'
          ? (def.scalings ?? {})
          : {}

      const scalingMult = Object.keys(resolvedScalings).length > 0
        ? _computePerkScalingMult(resolvedScalings)
        : 1

      const buildTypedHits = (baseDmg: number) =>
        Object.entries(resolvedDmgTypes).map(([k, mult]) => ({
          rawVal: Math.round(baseDmg * 100) / 100,
          val: Math.round(baseDmg * mult * scalingMult * 100) / 100,
          color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
          label: k.charAt(0).toUpperCase() + k.slice(1),
        }))

      const _fhM2  = def.perkName === 'Springblast' ? springblastFinisherHits : _m2FinisherHits
      const _fhM1f = def.perkName === 'Springblast' ? springblastFinisherHits : _m1FinisherHits
      const baseDmg_m2  = def.getBaseDamage({ perkAmount, finisherHits: _fhM2  })
      const baseDmg_m1f = def.getBaseDamage({ perkAmount, finisherHits: _fhM1f })

      out.push({
        perkName: def.perkName,
        perkAmount,
        condition: def.condition,
        hits: def.hits,
        isM1: def.isM1, isM2: def.isM2, isFinisher: def.isFinisher,
        isWA: def.isWA, isRune: def.isRune, guardbreak: def.guardbreak,
        note: def.note,
        typedHits_m2: buildTypedHits(baseDmg_m2),
        typedHits_m1f: buildTypedHits(baseDmg_m1f),
        scalingMult,
        dmgTypeMode: def.dmgTypeMode,
      })
    }
    return out
  })()
</script>

<div class="da-root">

  <!-- ══════════════════ TOP ROW: CRIT + APEN ══════════════════ -->
  <div class="da-top-row">

    <!-- Crit column -->
    <div class="da-section da-section--crit">
      <div class="da-section-title"><CritIcon size={13}/> Crit Statistics</div>
      <div class="da-crit-grid">

        <div class="da-stat-card da-stat-card--crit">
          <div class="da-stat-label"><CritIcon size={12}/> Crit Chance</div>
          <div class="da-stat-val" style="color:#e2b203">{crit.effectiveCritChance.toFixed(1)}%</div>
          {#if allCritSources.length > 0}
            <div class="da-sources">
              {#each allCritSources as s}
                <div class="da-source-row">
                  <span class="da-source-name">{s.source}</span>
                  <span class="da-source-val" style="color:{s.isExtra ? '#f59e0b' : '#e2b203'}">
                    +{s.amount.toFixed(2)}%
                  </span>
                </div>
              {/each}
              {#if crit.critFormula}
                <div class="da-source-formula">{crit.critFormula}</div>
              {/if}
            </div>
          {:else}
            <div class="da-empty-hint">No crit sources</div>
          {/if}
        </div>

        <div class="da-stat-card da-stat-card--critdmg">
          <div class="da-stat-label">Crit Damage Multiplier</div>
          <div class="da-stat-val" style="color:#a78bfa">{crit.critDamageMultiplier.toFixed(1)}%</div>
          <div class="da-sources">
            {#each critDmgSources as s}
              <div class="da-source-row">
                <span class="da-source-name">{s.source}</span>
                <span class="da-source-val" style="color:{s.amount < 0 ? '#f87171' : '#a78bfa'}">
                  {s.source === 'Base' ? '' : s.amount >= 0 ? '+' : ''}{s.amount.toFixed(s.source === 'Base' ? 0 : 2)}%
                </span>
              </div>
            {/each}
          </div>
        </div>

      </div>
    </div>

    <!-- Armor Pen column -->
    {#if (stats as Record<string, number>).armorPenetration}
      <div class="da-section da-section--apen">
        <div class="da-section-title">🛡 Armor Penetration</div>
        <div class="da-apen-inner">
          <span class="da-apen-val">{(stats as Record<string, number>).armorPenetration}</span>
        </div>
      </div>
    {/if}

  </div>

<!-- ══════════════════ COMBAT MULTIPLIERS ══════════════════ -->
<div class="da-section">
  <div class="da-section-title">⚔ Combat Multipliers</div>
    {#if (perks['Vassals Croak'] ?? 0) > 0}
      <div class="da-summon-row">
        <span class="da-summon-label">Active Summons</span>
        <input class="da-summon-input" 
          type="number" 
          min="0" 
          max={maxSummons}
          value={Math.floor($build.summonCount)}
          on:input={e => {
            let val = Math.floor(parseInt(e.currentTarget.value));
            if (isNaN(val) || val < 0) val = 0;
            if (val > maxSummons) val = maxSummons;
            build.update(s => ({ ...s, summonCount: val }));
          }} 
        />
        <span class="da-summon-max">/ {maxSummons}</span>
      </div>
    {/if}

<div class="da-boost-row">
    {#each boosts.dmgEntries as entry}
      {@const disabled = disabledBoosts.has(entry.sourceName)}
      <button
        class="da-boost-chip"
        class:da-boost-chip--lvl={entry.sourceName === 'Level Damage'}
        class:da-boost-chip--off={disabled}
        title={entry.condition ?? ''}
        on:click={() => toggleBoost(entry.sourceName)}
      >
        <span class="da-bc-name">
          {entry.sourceName === 'Level Damage' ? `LV${$build.level ?? 80}` : entry.sourceName}
        </span>
        <span class="da-bc-val">{disabled ? '—' : `×${+entry.rawMultiplier.toFixed(3)}`}</span>
        {#if entry.condition}
          <span class="da-bc-cond">{entry.condition}</span>
        {/if}
        <span class="da-bc-toggle">{disabled ? 'OFF' : 'ON'}</span>
      </button>
      <span class="da-chain-op">×</span>
    {/each}
    <span class="da-chain-result"
      class:da-chain-result--dimmed={hasDisabledVisible}>
      = ×{+activeFinalMultRounded.toFixed(4)}
      {#if hasDisabledVisible}
        <span class="da-chain-orig">/{+boosts.dmgFinalMultiplier.toFixed(4)}</span>
      {/if}
    </span>
  </div>

  {#if _ragePotency > 0}
    <div class="da-rage-row" style="margin-top: 8px;">
      <span class="da-rage-badge">
        Rage ×{+_rageMult.toFixed(4)}
      </span>
      <span class="da-rage-types">
        {[..._rageAffectedTypes].map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')}
      </span>
      <span class="da-rage-sources">
        {_activeRageBuffs.map(b => `${b.sourceName} (${b.potency})`).join(', ')}
      </span>
    </div>
  {/if}

  {#if boosts.healEntries.length > 0}
    <div class="da-boost-row" style="margin-top:8px">
      <span class="da-heal-label">✦ Heal</span>
      {#each boosts.healEntries as entry}
        <div class="da-boost-chip da-boost-chip--heal" title={entry.condition ?? ''}>
          <span class="da-bc-name">{entry.sourceName}</span>
          <span class="da-bc-val" style="color:#4ade80">×{+entry.rawMultiplier.toFixed(3)}</span>
        </div>
        <span class="da-chain-op">×</span>
      {/each}
      <span class="da-chain-result" style="color:#4ade80">= ×{+boosts.healFinalMultiplier.toFixed(4)}</span>
    </div>
  {/if}
</div>

<!-- ══════════════════ WEAPON BASE DAMAGE + PERK BASE DAMAGE ══════════════════ -->
<div class="da-wbd-outer">

<!-- Weapon Base Damage -->
<div class="da-section da-section--wbd da-section--wbd-inner">
  <div class="da-section-title-row">
    <span class="da-section-title">Base Damage</span>
    <div class="da-wbd-controls">
      {#if _currentLabel}
        <span class="da-wbd-current-badge">{_currentLabel}</span>
      {/if}
      {#if _showCrit}
        <button
          class="da-crit-toggle"
          class:da-crit-toggle--on={showCritValues}
          on:click={() => showCritValues = !showCritValues}
        >
          <CritIcon size={12}/> {showCritValues ? 'Crit ON' : 'Crit OFF'}
        </button>
      {/if}
      <button class="da-wbd-toggle" on:click={() => showAllWeapons = !showAllWeapons}>
        {showAllWeapons ? 'Show current only' : 'Show all weapons'}
      </button>
    </div>
  </div>

  {#if !_currentLabel && !showAllWeapons}
    <p class="da-empty-hint">No weapon selected. <button class="da-wbd-link" on:click={() => showAllWeapons = true}>Show all weapon types</button></p>
  {:else}
    {@const rows = showAllWeapons ? WEAPON_BASE_DMG.map(r => ({...r})) : _displayRows}
<div class="da-wbd-cards">
  {#each rows as row}
    {@const isActive   = !showAllWeapons || row.type === _baseWeaponType}
    {@const isGunActive = showAllWeapons && !!_gunOverlay && row.type === _gunOverlay.type}
    {@const gunLabel = (row as any).gunLabel as string | undefined}
    {@const m2Only = (row as any).m2Only as boolean | undefined}
    {@const hasDmgTypes = isActive && Object.keys(_weaponDmgTypes).length > 0}
    {@const m1DmgTypes = (isActive && gunLabel && !m2Only) ? _gunDmgTypes : _weaponDmgTypes}
    {@const m2DmgTypes = (isActive && gunLabel && !(row as any).m2NoLock) ? _gunDmgTypes : _weaponDmgTypes}
    {@const m1Typed = hasDmgTypes && row.m1 ? seqWithTypes(row.m1, m1DmgTypes, _scalingMult, _rageMult, _rageAffectedTypes) : null}
    {@const m2Typed = hasDmgTypes && row.m2 ? seqWithTypes(row.m2, m2DmgTypes, _scalingMult, _rageMult, _rageAffectedTypes) : null}
    <div class="da-wbd-card" class:da-wbd-card--active={isActive || isGunActive} class:da-wbd-card--gun={isGunActive}>

      <div class="da-wbd-card-head">
        {#if isActive}<span class="da-wbd-dot" class:da-wbd-dot--gun={!!gunLabel}></span>{/if}
        {#if isGunActive}<span class="da-wbd-dot da-wbd-dot--gun"></span>{/if}

        <span class="da-wbd-card-name">{row.type}</span>
        {#if gunLabel}<span class="da-wbd-gun-badge">{gunLabel}</span>{/if}

        {#if showAllWeapons && isActive}
          <span class="da-wbd-equipped-badge">✦ Equipped</span>
        {/if}
        {#if isGunActive}
          <span class="da-wbd-gun-active-badge">✦ Active Gun</span>
        {/if}
      </div>
      <div class="da-wbd-card-divider"></div>

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m1">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m1">M1</span>
          <span class="da-wbd-lbl-text">Combo</span>
        </div>
        <div class="da-hits-row">
          {#if m1Typed}
            {#each m1Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              {@const finisher = isFinisher(row, 'm1', hi)}
              <div class="da-hit-wrapper">
                <div class="da-hit-card" class:da-hit-card--finisher={finisher}>
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      {#if t.scalingMult !== 1}
                        <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                        <span class="da-hit-arrow">→</span>
                      {/if}
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                      </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                    {#if hit.count > 1}
                      <div class="da-hit-repeat">×{hit.count}<span>Hits</span></div>
                    {/if}
                  {/each}
                  {#if finisher}
                    <span class="da-finisher-crown">✦</span>
                  {/if}
                  {#if showCritValues}
                    <span class="da-crit-mini-badge">
                      <CritIcon size={12}/>
                    </span>
                  {/if}
                </div>
              </div>
            {/each}
          {:else if row.m1}
            {#each row.m1 as hit, hi}
              {@const finisher = isFinisher(row, 'm1', hi)}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              
              <div class="da-plain-pill" class:da-plain-pill--finisher={finisher}>
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
                {#if finisher}
                  <span class="da-finisher-badge-mini">F</span>
                {/if}
              </div>
            {/each}
          {:else}
            <span class="da-wbd-na">N/A</span>
          {/if}
        </div>
      </div>

      <div class="da-wbd-section">
        <div class="da-wbd-row-label da-wbd-row-label--m2">
          <span class="da-wbd-lbl-badge da-wbd-lbl-badge--m2">M2</span>
          <span class="da-wbd-lbl-text">Heavy</span>
        </div>
        <div class="da-hits-row">
          {#if m2Typed}
            {#each m2Typed as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-hit-wrapper">
                <div class="da-hit-card da-hit-card--finisher">
                  {#each hit.types as t, ti}
                    {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                    {@const finalVal = selectedWeaponData?.m2Charge?.enabled
                      ? selectedWeaponData.m2Charge.formula(t.val, weaponCharge)
                      : t.val}
                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      {#if _scalingMult !== 1}
                        <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                        <span class="da-hit-arrow">→</span>
                      {/if}
                        <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                          {fmtNum(showCritValues ? Math.round(finalVal * _critMult * 100) / 100 : finalVal)}
                        </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}
                  <span class="da-finisher-crown">✦</span>
                  {#if showCritValues}
                    <span class="da-crit-mini-badge"><CritIcon size={12}/></span>
                  {/if}
                </div>
              </div>
              {#if hit.count > 1}
                <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
            {/each}
          {:else if row.m2}
            {#each row.m2 as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              <div class="da-plain-pill">
                <span class="da-plain-num">{typeof hit === 'number' ? hit : hit.n}</span>
                {#if typeof hit !== 'number' && hit.count > 1}
                  <span class="da-plain-count">×{hit.count}</span>
                {/if}
              </div>
            {/each}
          {:else}
            <span class="da-wbd-na">N/A</span>
          {/if}
          {#if gunLabel && !m2Only}
            <span class="da-wbd-m2-src">from {gunLabel}</span>
            {#if selectedWeaponData?.m2Charge?.enabled}
              <div class="da-rifle-charge-wrap">
                <div class="da-rifle-charge-label">
                  <span class="da-rcl-name">{selectedWeaponData.m2Charge.label}</span>
                  <span class="da-rcl-pct">{weaponCharge}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={selectedWeaponData.m2Charge.max}
                  step="1"
                  bind:value={weaponCharge}
                  class="da-rifle-charge-slider"
                  style="--fill:{weaponCharge}%"
                />
                <div class="da-rifle-marks">
                  <span>0</span><span>25</span><span>50</span><span>75</span><span>100%</span>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      </div>

      {#if _showWACol && isActive}
        <div class="da-wbd-section">
          <div class="da-wbd-row-label da-wbd-row-label--wa">
            <span class="da-wbd-lbl-badge da-wbd-lbl-badge--wa">WA</span>
            <span class="da-wbd-lbl-text da-wbd-lbl-text--wa">{selectedWA.name}</span>
            {#if _waScalingDiffers && _waScalingMult !== 1}
              <span class="da-wbd-scaling-badge" style="background:rgba(167,139,250,.12);border-color:rgba(167,139,250,.3);color:var(--accent3)">×{_waScalingMult.toFixed(4)}</span>
            {/if}
          </div>
          <div class="da-hits-row">
          {#if _waTyped}
            {#each _waTyped as hit, hi}
              {#if hi > 0}<span class="da-hit-divider">›</span>{/if}
              
              <div class="da-hit-card"
                class:da-hit-card--finisher={selectedWA.hits?.[hi]?.isFinisher}
                class:da-hit-card--crit={selectedWA.hits?.[hi]?.isCrit}>
                {#each hit.types as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                    {#if selectedWA.hits?.[hi]?.isCrit}
                      <span class="da-hit-raw">{fmtNum(t.val)}</span>
                      <span class="da-hit-arrow">→</span>
                      <span class="da-hit-num" style="color:#e2b203;text-shadow:0 0 10px rgba(226,178,3,.5)">
                        {fmtNum(Math.round(t.val * _critMult * 100) / 100)}
                      </span>
                    {:else}
                      {#if t.scalingMult !== 1}
                        <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                        <span class="da-hit-arrow">→</span>
                      {/if}
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                      </span>
                    {/if}
                    <span class="da-hit-type">
                      {t.label}
                    </span>
                  </div>
                {/each}

                {#if selectedWA.hits?.[hi]?.isCrit}
                  <CritIcon size={12}/>
                {/if}

                {#if selectedWA.hits?.[hi]?.isFinisher}
                  <span class="da-finisher-crown">✦</span>
                {/if}

                {#if showCritValues && !selectedWA.hits?.[hi]?.isCrit}
                  <span class="da-crit-mini-badge"><CritIcon size={12}/></span>
                {/if}

                {#if hit.count > 1}
                  <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
                {/if}
              </div>
            {/each}

          {:else if _waHitsSeq}
            {_waHitsSeq.map(h => h.count > 1 ? `${h.n}×${h.count}` : String(h.n)).join(', ')}

          {:else if _waRangeTyped}
            <div class="da-range-row">
              <div class="da-hit-card">
                <div class="da-range-end">
                  {#each _waRangeTyped.minEnds as t, ti}
                    {#if ti > 0}
                      <span class="da-hit-plus">+</span>
                    {/if}

                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                      </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}

                  {#if _waRangeTyped.minLabel}
                    <span class="da-range-label">
                      ({_waRangeTyped.minLabel})
                    </span>
                  {/if}
                </div>
              </div>

              <span class="da-range-arrow">→</span>

              <div class="da-hit-card">
                <div class="da-range-end">
                  {#each _waRangeTyped.maxEnds as t, ti}
                    {#if ti > 0}
                      <span class="da-hit-plus">+</span>
                    {/if}

                    <div class="da-hit-chunk" style="--tc:{t.color}" class:da-hit-chunk--rage={t.rageApplied}>
                      <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                        {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                      </span>
                      <span class="da-hit-type">{t.label}</span>
                    </div>
                  {/each}

                  {#if _waRangeTyped.maxLabel}
                    <span class="da-range-label da-range-label--max">
                      ({_waRangeTyped.maxLabel})
                    </span>
                  {/if}
                </div>
              </div>

              {#if selectedWA.scaling && selectedWA.scaling !== 'Same as weapon'}
                <span class="da-range-scl">
                  {selectedWA.scaling === 'None'
                    ? 'No Scaling'
                    : `Scaling: ${selectedWA.scaling}`}
                </span>
              {/if}
            </div>

          {:else if selectedWA.baseDamage && _waAllHits.dmg.length > 0}
            <div class="da-range-row">
              <span class="da-wbd-range">{selectedWA.baseDamage}</span>
              {#if Object.keys(_waDmgTypes).length > 0}
                {#each Object.entries(_waDmgTypes) as [k, v]}
                  <div class="da-hit-chunk da-hit-chunk--sm" style="--tc:{DMG_TYPE_COLORS[k] ?? '#e8e4da'}">
                    <span class="da-hit-num">{v}×</span>
                    <span class="da-hit-type">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                  </div>
                {/each}
              {/if}
              {#if selectedWA.scaling && selectedWA.scaling !== 'Same as weapon'}
                <span class="da-range-scl">{selectedWA.scaling === 'None' ? 'No Scaling' : `Scaling: ${selectedWA.scaling}`}</span>
              {/if}
            </div>

          {:else if _waSummonDef}
            <div class="da-range-row" style="gap: 8px; align-items: center;">
              <div class="da-hit-card">
                {#if _waSummonDef.scaledAttacks}
                  {#each _waSummonDef.scaledAttacks as atk, ai}
                    {#if ai > 0}<span class="da-hit-plus">+</span>{/if}
                    <div class="da-hit-chunk" style="--tc:#c084fc">
                      {#if atk.scaledDmg !== atk.baseDmg}
                        <span class="da-hit-raw">{atk.baseDmg}</span>
                        <span class="da-hit-arrow">→</span>
                      {/if}
                      <span class="da-hit-num" style="--tc:#c084fc">{atk.scaledDmg}</span>
                      <span class="da-hit-type">{atk.label}</span>
                    </div>
                    {#if atk.guardbreak}
                      <span class="da-pbd-badge da-pbd-badge--gb" style="align-self:center">GB</span>
                    {/if}
                  {/each}
                {:else}
                  <div class="da-hit-chunk" style="--tc:#c084fc">
                    {#if _waSummonDef.scaledDmg !== _waSummonDef.baseDmg}
                      <span class="da-hit-raw">{_waSummonDef.baseDmg}</span>
                      <span class="da-hit-arrow">→</span>
                    {/if}
                    <span class="da-hit-num" style="--tc:#c084fc">{_waSummonDef.scaledDmg}</span>
                    <span class="da-hit-type">{_waSummonDef.dmgType}</span>
                  </div>
                {/if}
                <span class="da-hit-repeat" style="background:rgba(192,132,252,.12);border-color:rgba(192,132,252,.3);color:#c084fc">
                  ×{_waSummonDef.count}<span class="da-hit-repeat-label">summons</span>
                </span>
              </div>
              <span class="da-summon-formula">
                ({_waSummonDef.baseDmg} × (1 + {_waSummonDef.summonBoostPct}% × (1 + LV{$build.level}/80)))
              </span>
            </div>
          {:else}
            <span class="da-wbd-na">—</span>
          {/if}

          {#if _waHealSeq}
            <div class="da-heal-hits-row">
              {#each _waHealSeq as h, hi}
                {@const scaledHeal = Math.round(h.n * _waScalingMult * 100) / 100}
                {#if hi > 0}
                  <span class="da-hit-divider">›</span>
                {/if}
                <div class="da-hit-card da-hit-card--heal">
                  <div class="da-hit-chunk" style="--tc:#4ade80">
                    {#if _waScalingMult !== 1}
                      <span class="da-hit-raw">{fmtNum(h.n)}</span>
                      <span class="da-hit-arrow">→</span>
                    {/if}
                    <span class="da-hit-num" style="--tc:#4ade80">
                      {fmtNum(scaledHeal)}
                    </span>
                    <span class="da-heal-badge">✦ Heal</span>
                  </div>
                  {#if h.count > 1}
                    <span class="da-hit-repeat">×{h.count}</span>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}

          {#if _waAvgTotal}
            <div class="wa-avg-total-box">
              <div class="wa-atb-left">
                <span class="wa-atb-label">Avg Total</span>
                <span class="wa-atb-hint">~{_waAvgTotal.total} stars · {_waAvgTotal.starsPerType}/type</span>
              </div>
              <span class="wa-atb-base">{fmtNum(_waAvgTotal.baseTotal)}</span>
            </div>
          {/if}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>
<p class="da-wbd-note">M1 = light attack combo · M2 = heavy attack · × = repeated hits</p>
  {/if}
</div>

<!-- ── Perk Base Damage ── -->
{#if _activePerkDmgEntries.length > 0}
<div class="da-section da-section--pbd">
  <div class="da-section-title">Perk Base Damage</div>
  <div class="da-pbd-list">
    {#each _activePerkDmgEntries as entry}
      <div class="da-pbd-card">
        <!-- Header row -->
        <div class="da-pbd-head">
          <span class="da-pbd-name">{entry.perkName}</span>
          <span class="da-pbd-amt">+{Math.round(entry.perkAmount * 100) / 100}</span>
        </div>
        <!-- Badges -->
        <div class="da-pbd-badges">
          {#if entry.isFinisher}<span class="da-pbd-badge da-pbd-badge--finisher">Finisher</span>{/if}
          {#if entry.isM1}<span class="da-pbd-badge da-pbd-badge--m1">M1</span>{/if}
          {#if entry.isM2}<span class="da-pbd-badge da-pbd-badge--m2">M2</span>{/if}
          {#if entry.isWA}<span class="da-pbd-badge da-pbd-badge--wa">WA</span>{/if}
          {#if entry.isRune}<span class="da-pbd-badge da-pbd-badge--rune">Rune</span>{/if}
          {#if entry.guardbreak}<span class="da-pbd-badge da-pbd-badge--gb">Guardbreak</span>{/if}
          {#if entry.dmgTypeMode === 'weapon'}<span class="da-pbd-badge da-pbd-badge--weapon">Weapon Type</span>{/if}
        </div>
        <!-- Condition -->
        {#if entry.condition}
          <div class="da-pbd-condition">{entry.condition}</div>
        {/if}
        <!-- Springblast: finisher hit count slider -->
        {#if entry.perkName === 'Springblast'}
          <div class="da-sb-slider-wrap">
            <span class="da-sb-slider-label">Finisher hits</span>
            <input
              type="range" min="1" max="20" step="1"
              bind:value={springblastFinisherHits}
              class="da-sb-slider"
              style="--fill:{((springblastFinisherHits - 1) / 19) * 100}%"
            />
            <span class="da-sb-slider-val">{springblastFinisherHits}</span>
          </div>
        {/if}
        <!-- Typed damage: M2/main finisher -->
        <div class="da-pbd-dmg-row">
          {#if entry.isFinisher && _m2FinisherHits > 1}
            <span class="da-pbd-ctx-label">M2 ({_m2FinisherHits} hits)</span>
          {/if}
          <div class="da-hits-row">
            <div class="da-hit-card" class:da-hit-card--finisher={entry.isFinisher}>
              {#each entry.typedHits_m2 as t, ti}
                {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                <div class="da-hit-chunk" style="--tc:{t.color}">
                  {#if entry.scalingMult !== 1}
                    <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                    <span class="da-hit-arrow">→</span>
                  {/if}
                  <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                    {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                  </span>
                  <span class="da-hit-type">{t.label}</span>
                </div>
              {/each}
              {#if entry.hits && entry.hits > 1}
                <span class="da-hit-repeat">×{entry.hits}<span class="da-hit-repeat-label">hits</span></span>
              {/if}
              {#if entry.isFinisher}
                <span class="da-finisher-crown">✦</span>
              {/if}
              {#if showCritValues}
                <span class="da-crit-mini-badge">
                  <CritIcon size={12}/>
                </span>
              {/if}
            </div>
          </div>
        </div>
        <!-- M1 finisher context (only when different from M2) -->
        {#if entry.isFinisher && !entry.isM2 && Number(_m1FinisherHits) !== Number(_m2FinisherHits)}
          <div class="da-pbd-dmg-row">
            <span class="da-pbd-ctx-label">M1 fin ({_m1FinisherHits} hit{_m1FinisherHits > 1 ? 's' : ''})</span>
            <div class="da-hits-row">
              <div class="da-hit-card da-hit-card--finisher">
                {#each entry.typedHits_m1f as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                    {#if entry.scalingMult !== 1}
                      <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                      <span class="da-hit-arrow">→</span>
                    {/if}
                    <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                      {fmtNum(showCritValues ? Math.round(t.val * _critMult * 100) / 100 : t.val)}
                    </span>
                    <span class="da-hit-type">{t.label}</span>
                  </div>
                {/each}
                <span class="da-finisher-crown">✦</span>
                {#if showCritValues}
                  <span class="da-crit-mini-badge"><CritIcon size={12}/></span>
                {/if}
              </div>
            </div>
          </div>
        {/if}
        <!-- Springblast: total damage across all finisher hits -->
        {#if entry.perkName === 'Springblast' && springblastFinisherHits > 1}
          <div class="da-pbd-dmg-row">
            <span class="da-pbd-ctx-label">Total (×{springblastFinisherHits} hits)</span>
            <div class="da-hits-row">
              <div class="da-hit-card">
                {#each entry.typedHits_m2 as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                    <span class="da-hit-num" class:da-hit-num--crit={showCritValues} style="--tc:{t.color}">
                      {fmtNum(Math.round(t.val * springblastFinisherHits * (showCritValues ? _critMult : 1) * 100) / 100)}
                    </span>
                    <span class="da-hit-type">{t.label}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        {/if}
        <!-- Note -->
        {#if entry.note}
          <div class="da-pbd-note">{entry.note}</div>
        {/if}
      </div>
    {/each}
  </div>
</div>
{/if}

</div><!-- end da-wbd-outer -->
<!-- ══════════════════ DAMAGE SCALING ══════════════════ -->
{#if _weaponResult && scalingBreakdown.rows.length > 0}
<div class="da-section da-section--scaling">
  <div class="da-section-title">📐 Damage Scaling</div>

  <div class="ds-formula-hint">
    Effective Boost = Σ (Scaling × Boost%) → adds to base as ×(1 + Effective%)
  </div>

  <div class="ds-table">
    <div class="ds-head">
      <div class="ds-col ds-col--type">Scaling</div>
      <div class="ds-col ds-col--val">Scaling Val</div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--boost">Your Boost</div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--contrib">Contribution</div>
    </div>

    {#each scalingBreakdown.rows as row}
      <div class="ds-row">
        <div class="ds-col ds-col--type">
          <span class="ds-dot" style="background:{row.color}"></span>
          <span style="color:{row.color}">{row.label ??(row.key.charAt(0).toUpperCase()+ row.key.slice(1))}</span>
        </div>
        <div class="ds-col ds-col--val">
          <span class="ds-num" style="color:{row.color}">{Math.round(row.scalingVal * 1000) / 1000}</span>
        </div>
        <div class="ds-col ds-col--op">×</div>
        <div class="ds-col ds-col--boost">
          {#if row.boostPct !== 0}
            <span class="ds-boost" class:ds-boost--zero={row.boostPct === 0}>{row.boostPct > 0 ? '+' : ''}{row.boostPct}%</span>
          {:else}
            <span class="ds-boost ds-boost--zero">+0%</span>
          {/if}
        </div>
        <div class="ds-col ds-col--op">=</div>
        <div class="ds-col ds-col--contrib">
          <span class="ds-contrib" class:ds-contrib--zero={row.contribution === 0} style={row.contribution > 0 ? `color:${row.color}` : ''}>
            +{row.contribution}%
          </span>
        </div>
      </div>
    {/each}

    <!-- Total row -->
    <div class="ds-row ds-row--total">
      <div class="ds-col ds-col--type ds-total-label">Total Effective Boost</div>
      <div class="ds-col ds-col--val"></div>
      <div class="ds-col ds-col--op"></div>
      <div class="ds-col ds-col--boost"></div>
      <div class="ds-col ds-col--op">=</div>
      <div class="ds-col ds-col--contrib">
        <span class="ds-total-pct">+{scalingBreakdown.totalEffectivePct}%</span>
      </div>
    </div>
  </div>

  <!-- Multiplier result -->
  <div class="ds-result-row">
    <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
      <span class="ds-result-label">Scaling Multiplier</span>
      <span class="ds-applies-to">{waScalingSameAsWeapon ? 'M1 · M2 · Weapon Art' : 'M1 · M2'}</span>
    </div>
    <span class="ds-result-eq">1 + {scalingBreakdown.totalEffectivePct}% =</span>
    <span class="ds-result-val">×{+scalingBreakdown.multiplier.toFixed(4)}</span>
  </div>

  {#if scalingBreakdown.rows.some(r => r.boostPct === 0)}
    <p class="ds-warn">⚠ Some scalings have no matching boost stat — those contribute 0%</p>
  {/if}

  <!-- WA-specific scaling subsection (only when WA has its own formula) -->
  {#if waScalingBreakdown}
    <div class="ds-wa-subsection">
      <div class="ds-wa-header">
        <span class="ds-sub-badge">WA</span>
        <span class="ds-wa-name">{selectedWA.name}</span>
      </div>
      <div class="ds-table">
        <div class="ds-head">
          <div class="ds-col ds-col--type">Scaling</div>
          <div class="ds-col ds-col--val">Scaling Val</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost">Your Boost</div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--contrib">Contribution</div>
        </div>
        {#each waScalingBreakdown.rows as row}
          <div class="ds-row">
            <div class="ds-col ds-col--type">
              <span class="ds-dot" style="background:{row.color}"></span>
              <span style="color:{row.color}">{(row as any).label ?? (row.key.charAt(0).toUpperCase() + row.key.slice(1))}</span>
            </div>
            <div class="ds-col ds-col--val">
              <span class="ds-num" style="color:{row.color}">{Math.round(row.scalingVal * 10000) / 10000}</span>
            </div>
            <div class="ds-col ds-col--op">×</div>
            <div class="ds-col ds-col--boost">
              {#if row.boostPct !== 0}
                <span class="ds-boost">{row.boostPct > 0 ? '+' : ''}{row.boostPct}%</span>
              {:else}
                <span class="ds-boost ds-boost--zero">+0%</span>
              {/if}
            </div>
            <div class="ds-col ds-col--op">=</div>
            <div class="ds-col ds-col--contrib">
              <span class="ds-contrib" class:ds-contrib--zero={row.contribution === 0}
                style={row.contribution > 0 ? `color:${row.color}` : ''}>
                +{row.contribution}%
              </span>
            </div>
          </div>
        {/each}
        <div class="ds-row ds-row--total">
          <div class="ds-col ds-col--type ds-total-label">Total</div>
          <div class="ds-col ds-col--val"></div>
          <div class="ds-col ds-col--op"></div>
          <div class="ds-col ds-col--boost"></div>
          <div class="ds-col ds-col--op">=</div>
          <div class="ds-col ds-col--contrib">
            <span class="ds-total-pct">+{waScalingBreakdown.totalEffectivePct}%</span>
          </div>
        </div>
      </div>
      
    </div>
      <div class="ds-result-row"
        style={waScalingIsHealOnly ? 'border-color:rgba(74,222,128,.2);background:rgba(74,222,128,.06)' : ''}>
        <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
          <span class="ds-result-label" style={waScalingIsHealOnly ? 'color:#4ade80' : ''}>
            {waScalingIsHealOnly ? 'Heal Multiplier' : 'Scaling Multiplier'}
          </span>
          <span class="ds-applies-to">Weapon Art</span>
        </div>
        <span class="ds-result-eq">1 + {waScalingBreakdown.totalEffectivePct}% =</span>
        <span class="ds-result-val"
          style={waScalingIsHealOnly ? 'color:#4ade80;text-shadow:0 0 12px rgba(74,222,128,.4)' : ''}>
          ×{+waScalingBreakdown.multiplier.toFixed(4)}
        </span>
      </div>
      {#if waScalingBreakdown.rows.some(r => r.boostPct === 0)}
        <p class="ds-warn">⚠ Some WA scalings have no matching boost stat — those contribute 0%</p>
      {/if}
  {/if}
</div>
{:else if _weaponResult && Object.keys(_weaponResult.scalings).length > 0}
<div class="da-section da-section--scaling">
  <div class="da-section-title">
    📐 Damage Scaling
  </div>
  <p class="da-empty-hint">Weapon has scalings but no matching boost stats equipped — all contributions are 0%.</p>
  {#if waScalingBreakdown}
    {#if waScalingBreakdown.isPerHit}
      <div class="ds-result-row"style="background:rgba(167,139,250,.06);border-color:rgba(167,139,250,.2);">
        <span class="ds-result-label">Per-hit scaling</span>
        <span class="ds-result-val">see rows above</span>
      </div>
    {:else}
      <div class="ds-result-row">Scaling Multiplier×{waScalingBreakdown.multiplier.toFixed(4)}</div>
    {/if}
  {/if}
</div>
{/if}
{#if _weaponResult && scalingBreakdown.rows.length > 0 
  && _activePerkDmgEntries.some(e => (e.dmgTypeMode === 'fixed' && e.scalingMult !== 1) || e.dmgTypeMode === 'weapon')}
  <div class="da-section da-section--scaling">
    <div class="da-section-title">📐 Damage Scaling</div>
    <div class="ds-formula-hint">Effective Boost = Σ (Scaling × Boost%) → adds to base as ×(1 + Effective%)</div>
    
    <div class="ds-table">
      <div class="ds-head">
        <div class="ds-col ds-col--type">Scaling</div>
        <div class="ds-col ds-col--val">Scaling Val</div>
        <div class="ds-col ds-col--op"></div>
        <div class="ds-col ds-col--boost">Your Boost</div>
        <div class="ds-col ds-col--op"></div>
        <div class="ds-col ds-col--contrib">Contribution</div>
      </div>

      {#each _activePerkDmgEntries as entry}
        {#if entry.dmgTypeMode === 'fixed' && entry.scalingMult !== 1}
          <div class="da-perk-scaling-divider">
            <span class="da-perk-scaling-label">Perk Damage</span>
          </div>

          <div class="ds-table ds-table--perk" style="margin-top: 5px; font-size: 0.75rem; opacity: 0.9;">
            {#each Object.entries(PERK_DMG_DEFS.find(d => d.perkName === entry.perkName)?.scalings ?? {}) as [key, scalingVal]}
              {@const boostKey = SCALING_TO_BOOST[key]}
              {@const boostPct = boostKey ? (stats[boostKey as keyof typeof stats] ?? 0) : 0}
              {@const contrib = Math.round(scalingVal * boostPct * 100) / 100}
              
              <div class="ds-row">
                <div class="ds-col ds-col--type">
                  <span class="ds-dot" style="background: {SCALING_COLORS[key] ?? '#e8e4da'}"></span>
                  <span style="color: {SCALING_COLORS[key] ?? '#e8e4da'}">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
                <div class="ds-col ds-col--val">
                  <span class="ds-num" style="color: {SCALING_COLORS[key] ?? '#e8e4da'}">{scalingVal}</span>
                </div>
                <div class="ds-col ds-col--op">×</div>
                <div class="ds-col ds-col--boost">
                  <span class="ds-boost">+{boostPct}%</span>
                </div>
                <div class="ds-col ds-col--op">=</div>
                <div class="ds-col ds-col--contrib">
                  <span class="ds-contrib" style="color: {SCALING_COLORS[key] ?? '#e8e4da'}">+{contrib}%</span>
                </div>
              </div>
            {/each} 
          </div>

          <div class="ds-result-row ds-result-row--perk" style="background: rgba(251, 146, 60, 0.05); border-color: rgba(251, 146, 60, 0.15);">
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
              <span class="ds-result-label" style="color: #fb923c;">Perk: {entry.perkName} Scaling</span>
            </div>
            <span class="ds-result-eq">Multiplier =</span>
            <span class="ds-result-val">×{entry.scalingMult.toFixed(4)}</span>
          </div>

        {:else if entry.dmgTypeMode === 'weapon'}
          <div class="da-perk-scaling-divider">
            <span class="da-perk-scaling-label">{entry.perkName}</span>
          </div>
          <div class="ds-result-row ds-result-row--perk" style="background: rgba(251, 146, 60, 0.05); border-color: rgba(251, 146, 60, 0.15);">
            <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
              <span class="ds-result-label" style="color: #fb923c;">Perk: {entry.perkName} Scaling</span>
              <span class="ds-applies-to" style="opacity:.5;font-size:.58rem;">Same as weapon</span>
            </div>
            <span class="ds-result-eq">Multiplier =</span>
            <span class="ds-result-val">×{entry.scalingMult.toFixed(4)}</span>
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<BaseDamageCalc {boosts} {crit} {stats} {disabledBoosts} {activeFinalMult}/>
</div>

<style>
  .da-root {
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  }

  /* ── Section ── */
  .da-section {
    background: var(--surface, #141715);
    border: 1px solid var(--border, rgba(255,255,255,.06));
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .da-section-title {
    font-size: .65rem;
    text-transform: uppercase;
    letter-spacing: .18em;
    font-weight: 800;
    color: var(--ink-muted, #8a8d85);
    border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
    padding-bottom: 8px;
  }

  /* ── Crit grid ── */
  .da-crit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
  }
  .da-stat-card {
    background: var(--surface2, #1a1d1b);
    border: 1px solid var(--border, rgba(255,255,255,.06));
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .da-stat-card--crit    { border-color: rgba(226,178,3,.2); }
  .da-stat-card--critdmg { border-color: rgba(167,139,250,.2); }

  .da-stat-label {
    font-size: .62rem;
    text-transform: uppercase;
    letter-spacing: .12em;
    font-weight: 700;
    color: var(--ink-muted, #8a8d85);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .da-stat-val {
    font-size: 1.6rem;
    font-weight: 900;
    line-height: 1;
    font-family: 'Courier New', monospace;
  }
  .da-sources {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 2px;
  }
  .da-source-row {
    display: flex;
    justify-content: space-between;
    font-size: .72rem;
    padding: 3px 6px;
    border-radius: 5px;
    background: var(--surface3, #212420);
  }
  .da-source-name { color: var(--ink-muted, #8a8d85); display: flex; align-items: center; gap: 5px; }
  .da-source-val  { font-weight: 700; }
  .da-source-formula {
    font-size: .6rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .45;
    font-style: italic;
    padding-top: 4px;
    border-top: 1px solid rgba(255,255,255,.05);
    margin-top: 2px;
  }
  .da-empty-hint {
    font-size: .68rem;
    color: var(--ink-muted, #8a8d85);
    opacity: .45;
    font-style: italic;
  }

  /* ── Boost row ── */
  .da-boost-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
  }
  .da-boost-chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px 10px;
    border-radius: 8px;
    background: rgba(251,146,60,.08);
    border: 1px solid rgba(251,146,60,.2);
    cursor: pointer;
  }
  .da-boost-chip--lvl {
    background: rgba(251,191,36,.08);
    border-color: rgba(251,191,36,.2);
  }
  .da-boost-chip--heal {
    background: rgba(74,222,128,.08);
    border-color: rgba(74,222,128,.2);
  }
  .da-bc-name { font-size: .68rem; font-weight: 700; color: var(--ink, #e8e4da); }
  .da-bc-val  { font-size: .82rem; font-weight: 800; color: #fb923c; }
  .da-boost-chip--lvl .da-bc-val { color: #fbbf24; }
  .da-bc-cond { font-size: .55rem; color: var(--ink-muted, #8a8d85); opacity: .6; font-style: italic; text-align: center; max-width: 80px; }
  .da-chain-op { font-size: .8rem; color: var(--ink-muted, #8a8d85); opacity: .5; font-weight: 700; }
  .da-chain-result { font-size: 1rem; font-weight: 900; color: #fb923c; background: rgba(251,146,60,.1); padding: 4px 10px; border-radius: 8px; }
  .da-heal-label { font-size: .62rem; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .1em; padding: 4px 8px; background: rgba(74,222,128,.08); border-radius: 6px; border: 1px solid rgba(74,222,128,.2); flex-shrink: 0; }
.da-boost-chip--off {
  opacity: 0.4;
  filter: grayscale(0.7);
  border-style: dashed;
}
.da-boost-chip--off .da-bc-val {
  color: var(--ink-muted, #8a8d85);
  text-decoration: line-through;
}

.da-bc-toggle {
  font-size: .48rem;
  font-weight: 800;
  letter-spacing: .1em;
  padding: 1px 4px;
  border-radius: 3px;
  margin-top: 2px;
  background: rgba(74,222,128,.15);
  color: #4ade80;
}
.da-boost-chip--off .da-bc-toggle {
  background: rgba(248,113,113,.12);
  color: #f87171;
}

.da-chain-result--dimmed {
  color: #fb923c;
  background: rgba(251,146,60,.18);
}
.da-chain-orig {
  font-size: .65rem;
  opacity: .4;
  font-weight: 500;
  margin-left: 4px;
  text-decoration: line-through;
}

/* ── Top row: 2 columns ── */
.da-top-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: start;
}
@media (max-width: 560px) {
  .da-top-row {
    grid-template-columns: 1fr;
  }
}

.da-section--apen {
  border-color: rgba(229,229,229,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(229,229,229,.03) 100%);
  min-width: 130px;
  height: 100%;
  text-align: center;
}
.da-apen-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.da-apen-val {
  font-size: 2rem;
  font-weight: 900;
  color: #e5e5e5;
  font-family: 'Courier New', monospace;
  line-height: 1;
}

/* ── Weapon Base Damage ── */
.da-section--wbd {
  border-color: rgba(251,146,60,.15);
}
.da-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.06));
  padding-bottom: 8px;
}
.da-section-title-row .da-section-title {
  border-bottom: none;
  padding-bottom: 0;
}
.da-wbd-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.da-wbd-current-badge {
  font-size: .65rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(251,146,60,.14);
  border: 1px solid rgba(251,146,60,.3);
  color: #fb923c;
}
.da-wbd-toggle {
  font-size: .62rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,.1);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.da-wbd-toggle:hover {
  border-color: rgba(251,146,60,.35);
  color: #fb923c;
}
.da-wbd-link {
  background: none;
  border: none;
  color: #fb923c;
  cursor: pointer;
  font-family: inherit;
  font-size: inherit;
  text-decoration: underline;
  padding: 0;
}

/* Table */

.da-wbd-na {
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  font-style: italic;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  font-size: .65rem;
}
.da-wbd-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fb923c;
  flex-shrink: 0;
  box-shadow: 0 0 5px rgba(251,146,60,.6);
}
.da-wbd-dot--gun {
  background: linear-gradient(135deg, #fb923c, #38bdf8);
  box-shadow: 0 0 5px rgba(56,189,248,.5);
}
.da-wbd-gun-badge {
  font-size: .6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(56,189,248,.1);
  border: 1px solid rgba(56,189,248,.25);
  color: #38bdf8;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  flex-shrink: 0;
}
.da-wbd-m2-src {
  font-size: .58rem;
  color: #38bdf8;
  opacity: .6;
  font-style: italic;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
  flex-shrink: 0;
}
.da-wbd-note {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .45;
  font-style: italic;
  margin-top: 2px;
}

/* ── Typed hits — pill card design ── */
.da-hits-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.da-hit-divider {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  flex-shrink: 0;
  user-select: none;
}

.da-hit-card {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.07);
  border-radius: 7px;
  padding: 3px 7px 3px 6px;
  position: relative;
}

.da-hit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.da-hit-repeat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(251,191,36,.1);
  border: 1px solid rgba(251,191,36,.3);
  font-weight: 900;
  font-size: .78rem;
  color: #fbbf24;
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: .02em;
}
.da-hit-repeat span,
.da-hit-repeat-label {
  font-size: .56rem;
  font-weight: 700;
  opacity: .6;
  text-transform: uppercase;
  letter-spacing: .12em;
}

.da-hit-plus {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  margin: 0 1px;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
}

.da-hit-chunk {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  gap: 1px;
}

.da-hit-raw {
  font-size: .7rem;
  font-weight: 500;
  color: var(--ink-muted, #8a8d85);
  opacity: .45;
  text-decoration: line-through;
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
}

.da-hit-arrow {
  font-size: .55rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .3;
  margin: 0 1px;
  user-select: none;
}

.da-wbd-scaling-badge {
  font-size: .62rem;
  font-weight: 700;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(52,211,153,.12);
  border: 1px solid rgba(52,211,153,.3);
  color: #34d399;
  white-space: nowrap;
}

.da-hit-num {
  font-size: .88rem;
  font-weight: 800;
  color: var(--tc, #e8e4da);
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
  text-shadow: 0 0 10px color-mix(in srgb, var(--tc, #e8e4da) 50%, transparent);
}

.da-hit-type {
  font-size: .5rem;
  font-weight: 700;
  color: var(--tc, #e8e4da);
  opacity: .6;
  text-transform: uppercase;
  letter-spacing: .1em;
  font-family: var(--font-body, 'Trebuchet MS', sans-serif);
}
/* ── Damage Scaling section ── */
.da-section--scaling {
  border-color: rgba(52,211,153,.18);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(52,211,153,.03) 100%);
}

.ds-formula-hint {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  font-style: italic;
  opacity: .6;
  padding: 4px 8px;
  background: rgba(255,255,255,.02);
  border-radius: 5px;
  border: 1px solid rgba(255,255,255,.04);
}

.ds-table {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ds-head {
  display: grid;
  grid-template-columns: 120px 80px 20px 90px 20px 100px;
  gap: 4px;
  padding: 4px 8px;
  font-size: .55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .13em;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
}

.ds-row {
  display: grid;
  grid-template-columns: 120px 80px 20px 90px 20px 100px;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--surface2, #1a1d1b);
  align-items: center;
  border: 1px solid transparent;
  transition: background .1s;
}
.ds-row:hover { background: var(--surface3, #212420); }

.ds-row--total {
  background: rgba(52,211,153,.06);
  border-color: rgba(52,211,153,.15);
  margin-top: 4px;
}

.ds-col {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: .78rem;
}
.ds-col--op {
  justify-content: center;
  font-size: .7rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .4;
  font-weight: 700;
}
.ds-col--val { justify-content: flex-end; }
.ds-col--contrib { justify-content: flex-end; }
.ds-col--boost { justify-content: flex-end; }

.ds-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ds-num {
  font-family: 'Courier New', monospace;
  font-weight: 800;
  font-size: .88rem;
}

.ds-boost {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: .82rem;
  color: #4ade80;
}
.ds-boost--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }

.ds-contrib {
  font-family: 'Courier New', monospace;
  font-weight: 800;
  font-size: .88rem;
}
.ds-contrib--zero { color: var(--ink-muted, #8a8d85); opacity: .35; }

.ds-total-label {
  font-size: .65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: #34d399;
  opacity: .8;
  grid-column: 1 / 5;
}

.ds-total-pct {
  font-family: 'Courier New', monospace;
  font-weight: 900;
  font-size: 1rem;
  color: #34d399;
}

.ds-result-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 7px;
  background: rgba(52,211,153,.08);
  border: 1px solid rgba(52,211,153,.2);
  flex-wrap: wrap;
}
.ds-result-label {
  font-size: .62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: #34d399;
  opacity: .7;
  flex: 1;
}
.ds-result-eq {
  font-size: .75rem;
  color: var(--ink-muted, #8a8d85);
}
.ds-result-val {
  font-family: 'Courier New', monospace;
  font-size: 1.2rem;
  font-weight: 900;
  color: #34d399;
  text-shadow: 0 0 12px rgba(52,211,153,.4);
}

.ds-warn {
  font-size: .68rem;
  color: #f59e0b;
  padding: 5px 8px;
  background: rgba(245,158,11,.08);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 5px;
}

@media (max-width: 540px) {
  .ds-head,
  .ds-row {
    grid-template-columns: 100px 60px 16px 75px 16px 80px;
    font-size: .7rem;
  }
}

.da-wbd-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}

.da-wbd-card {
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background .12s, border-color .12s;
}

.da-wbd-card--active {
  border-color: rgba(251,146,60,.25);
  background: linear-gradient(160deg, rgba(251,146,60,.05) 0%, var(--surface2, #1a1d1b) 60%);
  box-shadow: 0 0 0 1px rgba(251,146,60,.08) inset;
}

.da-wbd-card--gun {
  border-color: rgba(56,189,248,.2);
  background: linear-gradient(
    160deg,
    rgba(251,146,60,.04),
    rgba(56,189,248,.04)
  );
}
.da-wbd-card-head {
  display: flex;
  align-items: center;
  gap: 5px;
}
.da-wbd-card-name {
  font-size: .88rem;
  font-weight: 700;
  color: var(--ink, #e8e4da);
  flex: 1;
}
.da-wbd-card-divider {
  height: 1px;
  background: rgba(255,255,255,.06);
  margin: 1px 0;
}
.da-plain-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 7px;
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.09);
}
.da-plain-num {
  font-weight: 800;
  font-size: .84rem;
  color: var(--ink, #e8e4da);
  font-family: 'Courier New', monospace;
  letter-spacing: -.01em;
}
.da-plain-count {
  font-size: .62rem;
  color: rgba(251,191,36,.75);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}
.da-wbd-section + .da-wbd-section {
  padding-top: 6px;
  border-top: 1px dashed rgba(255,255,255,.05);
}

/* Row label — badge + text side by side */
.da-wbd-row-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;
  flex-wrap: wrap;
}
.da-wbd-lbl-badge {
  font-size: .58rem;
  font-weight: 900;
  letter-spacing: .1em;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  flex-shrink: 0;
}
.da-wbd-lbl-badge--m1 {
  background: rgba(251,146,60,.18);
  border: 1px solid rgba(251,146,60,.35);
  color: #fb923c;
}
.da-wbd-lbl-badge--m2 {
  background: rgba(251,191,36,.14);
  border: 1px solid rgba(251,191,36,.3);
  color: #fbbf24;
}
.da-wbd-lbl-badge--wa {
  background: rgba(167,139,250,.16);
  border: 1px solid rgba(167,139,250,.35);
  color: var(--accent3);
}
.da-wbd-lbl-text {
  font-size: .6rem;
  font-weight: 600;
  color: var(--ink-muted);
  opacity: .55;
  text-transform: uppercase;
  letter-spacing: .1em;
}
.da-wbd-lbl-text--wa {
  color: var(--accent3);
  opacity: .75;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
  font-size: .72rem;
}

/* Range damage display */
.da-range-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.da-range-end {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.da-range-arrow {
  font-size: .75rem;
  color: var(--ink-muted);
  opacity: .4;
  font-weight: 700;
  flex-shrink: 0;
}
.da-range-label {
  font-size: .6rem;
  color: var(--ink-muted);
  opacity: .5;
  font-style: italic;
  font-weight: 600;
  white-space: nowrap;
}
.da-range-label--max {
  color: var(--accent3);
  opacity: .7;
}
.da-hit-chunk--sm .da-hit-num { font-size: .78rem; }
.da-hit-chunk--sm .da-hit-type { font-size: .48rem; }
.da-range-scl {
  font-size: .62rem;
  color: var(--ink-muted);
  font-style: italic;
  padding: 2px 8px;
  background: rgba(255,255,255,.03);
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.07);
}
.da-heal-hits-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed rgba(74,222,128,.15);
}
.da-heal-badge {
  font-size: .58rem;
  font-weight: 800;
  color: #4ade80;
  padding: 1px 6px;
  background: rgba(74,222,128,.1);
  border: 1px solid rgba(74,222,128,.2);
  border-radius: 999px;
  flex-shrink: 0;
}
.da-hit-card--heal {
  border-color: rgba(74,222,128,.2);
  background: rgba(74,222,128,.06);
}
.da-rifle-charge-wrap {
  margin-top: 10px;
  padding: 10px 13px 8px;
  border-radius: 10px;
  background: rgba(251,191,36,.06);
  border: 1px solid rgba(251,191,36,.22);
  display: flex;
  flex-direction: column;
  gap: 7px;
  min-width: 170px;
}
.da-rifle-charge-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.da-rcl-name {
  font-size: .57rem;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: #d97706;
}
.da-rcl-pct {
  font-size: .85rem;
  font-weight: 900;
  color: #fbbf24;
  font-family: 'Courier New', monospace;
  line-height: 1;
}
.da-rifle-charge-slider {
  width: 100%;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    90deg,
    #fb923c var(--fill, 100%),
    rgba(255,255,255,.1) var(--fill, 100%)
  );
}
.da-rifle-charge-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2.5px solid rgba(0,0,0,.55);
  cursor: grab;
  box-shadow: 0 0 0 3px rgba(251,191,36,.18);
  transition: transform .1s, box-shadow .1s;
}
.da-rifle-charge-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 5px rgba(251,191,36,.28);
}
.da-rifle-charge-slider::-webkit-slider-thumb:active {
  cursor: grabbing;
  transform: scale(1.08);
}
.da-rifle-charge-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2px solid rgba(0,0,0,.5);
  cursor: grab;
}
.da-rifle-marks {
  display: flex;
  justify-content: space-between;
  padding: 0 1px;
}
.da-rifle-marks span {
  font-size: .52rem;
  color: rgba(251,191,36,.38);
  font-weight: 700;
  font-family: 'Courier New', monospace;
  letter-spacing: .02em;
}
.wa-avg-total-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  padding: 6px 10px;
  border-radius: 7px;
  background: rgba(167,139,250,.08);
  border: 1px solid rgba(167,139,250,.2);
  flex-wrap: wrap;
}
.wa-atb-left {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.wa-atb-label {
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--accent3);
  opacity: .8;
}
.wa-atb-hint {
  font-size: .58rem;
  color: var(--ink-muted);
  opacity: .5;
}
.wa-atb-base {
  font-family: 'Courier New', monospace;
  font-size: .95rem;
  font-weight: 800;
  color: var(--accent3);
  text-shadow: 0 0 10px rgba(167,139,250,.35);
}
.da-wbd-equipped-badge {
  font-size: .55rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(251,146,60,.18);
  border: 1px solid rgba(251,146,60,.4);
  color: #fb923c;
  letter-spacing: .1em;
  text-transform: uppercase;
  animation: da-pulse 2s ease-in-out infinite;
}

@keyframes da-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,146,60,.4); }
  50%       { box-shadow: 0 0 0 4px rgba(251,146,60,.0); }
}
.da-wbd-gun-active-badge {
  font-size: .55rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(56,189,248,.18);
  border: 1px solid rgba(56,189,248,.4);
  color: #38bdf8;
  letter-spacing: .1em;
  text-transform: uppercase;
  animation: da-pulse-gun 2s ease-in-out infinite;
}

@keyframes da-pulse-gun {
  0%, 100% { box-shadow: 0 0 0 0 rgba(56,189,248,.4); }
  50%       { box-shadow: 0 0 0 4px rgba(56,189,248,.0); }
}
.da-summon-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(192,132,252,.08);
  border: 1px solid rgba(192,132,252,.22);
  border-radius: 7px;
  width: fit-content;
}
.da-summon-label {
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: #c084fc;
  opacity: .8;
}
.da-summon-input {
  font-family: 'Courier New', monospace;
  font-size: .9rem;
  font-weight: 800;
  color: #c084fc;
  background: none;
  border: none;
  outline: none;
  width: 36px;
  text-align: center;
  -moz-appearance: textfield;
  appearance: textfield;
}
.da-summon-input::-webkit-inner-spin-button,
.da-summon-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.da-summon-max {
  font-size: .62rem;
  color: #c084fc;
  opacity: .45;
  font-family: 'Courier New', monospace;
}
.da-hit-chunk--rage .da-hit-num {
  text-shadow: 0 0 14px color-mix(in srgb, var(--tc) 80%, #f70201);
}
.da-rage-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 10px; border-radius: 6px;
  background: rgba(247,2,1,.06); border: 1px solid rgba(247,2,1,.2);
}
.da-rage-badge {
  font-size: .75rem; font-weight: 800;
  color: #f70201; font-family: 'Courier New', monospace;
}
.da-rage-types { font-size: .68rem; color: var(--ink-muted); }
.da-rage-sources { font-size: .6rem; color: var(--ink-muted); opacity: .5; font-style: italic; margin-left: auto; }

.da-hit-card--finisher {
  position: relative;
  border: 1.5px solid rgba(250, 204, 21, 0.75) !important;
  background: linear-gradient(135deg, rgba(20, 20, 20, 0.85) 0%, rgba(250, 204, 21, 0.12) 100%) !important;
  box-shadow: 0 0 12px rgba(250, 204, 21, 0.35), inset 0 0 8px rgba(250, 204, 21, 0.1) !important;
  overflow: visible;
  animation: finisherPulse 3s infinite ease-in-out;
}

@keyframes finisherPulse {
  0%, 100% {
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.25), inset 0 0 6px rgba(250, 204, 21, 0.05);
    border-color: rgba(250, 204, 21, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(250, 204, 21, 0.5), inset 0 0 12px rgba(250, 204, 21, 0.2);
    border-color: rgba(250, 204, 21, 1);
  }
}

.da-finisher-crown {
  position: absolute;
  top: -8px;
  right: -4px;
  font-size: 0.9rem;
  color: #facc15;
  text-shadow: 0 0 6px #facc15, 0 0 2px #000;
  z-index: 10;
  transform: rotate(15deg);
  font-weight: bold;
}

.da-plain-pill--finisher {
  position: relative;
  border: 1px solid #facc15 !important;
  background: rgba(250, 204, 21, 0.1) !important;
  box-shadow: 0 0 8px rgba(250, 204, 21, 0.2);
}

.da-finisher-badge-mini {
  background: #facc15 !important;
  color: #111 !important;
  font-weight: 900 !important;
  padding: 1px 4px !important;
  border-radius: 3px !important;
  font-size: 0.6rem !important;
}

/* ── WBD outer flex container ── */
.da-wbd-outer {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.da-section--wbd-inner {
  flex: 1 1 0;
  min-width: 0;
}

/* ── Perk Base Damage section ── */
.da-section--pbd {
  flex: 0 0 260px;
  min-width: 200px;
  border-color: rgba(167,139,250,.2);
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(167,139,250,.04) 100%);
}

.da-pbd-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.da-pbd-card {
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(167,139,250,.14);
  border-radius: 8px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.da-pbd-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.da-pbd-name {
  font-size: .88rem;
  font-weight: 800;
  color: var(--accent3, #a78bfa);
  line-height: 1;
}
.da-pbd-amt {
  font-size: .65rem;
  font-weight: 700;
  color: var(--accent2, #f59e0b);
  font-family: 'Courier New', monospace;
  background: rgba(245,158,11,.1);
  border: 1px solid rgba(245,158,11,.22);
  padding: 1px 5px;
  border-radius: 999px;
}

.da-pbd-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}
.da-pbd-badge {
  font-size: .52rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .1em;
  padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid;
}
.da-pbd-badge--finisher { color: #facc15; background: rgba(250,204,21,.1); border-color: rgba(250,204,21,.3); }
.da-pbd-badge--m1      { color: #fb923c; background: rgba(251,146,60,.1); border-color: rgba(251,146,60,.28); }
.da-pbd-badge--m2      { color: #fbbf24; background: rgba(251,191,36,.1); border-color: rgba(251,191,36,.28); }
.da-pbd-badge--wa      { color: #a78bfa; background: rgba(167,139,250,.1); border-color: rgba(167,139,250,.28); }
.da-pbd-badge--rune    { color: #38bdf8; background: rgba(56,189,248,.1); border-color: rgba(56,189,248,.28); }
.da-pbd-badge--gb      { color: #f87171; background: rgba(248,113,113,.08); border-color: rgba(248,113,113,.25); }
.da-pbd-badge--weapon  { color: #34d399; background: rgba(52,211,153,.08); border-color: rgba(52,211,153,.22); }

.da-pbd-condition {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  font-style: italic;
  padding: 2px 0;
}

.da-pbd-dmg-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.da-pbd-ctx-label {
  font-size: .55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: var(--ink-muted, #8a8d85);
  opacity: .55;
}

.da-pbd-note {
  font-size: .62rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .6;
  font-style: italic;
  line-height: 1.4;
  padding-top: 2px;
  border-top: 1px dashed rgba(255,255,255,.05);
}

/* ── Springblast finisher hits slider ── */
.da-sb-slider-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 6px;
  background: rgba(251,146,60,.05);
  border: 1px solid rgba(251,146,60,.18);
  min-width: 0;
  overflow: hidden;
}
.da-sb-slider-label {
  font-size: .55rem;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: #fb923c;
  opacity: .75;
  white-space: nowrap;
  flex-shrink: 0;
}
.da-sb-slider {
  flex: 1;
  min-width: 0;
  width: 0;
  appearance: none;
  height: 5px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    90deg,
    #fb923c var(--fill, 0%),
    rgba(255,255,255,.1) var(--fill, 0%)
  );
}
.da-sb-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fbbf24;
  border: 2px solid rgba(0,0,0,.5);
  cursor: grab;
  box-shadow: 0 0 0 3px rgba(251,191,36,.2);
}
.da-sb-slider::-webkit-slider-thumb:active { cursor: grabbing; }
.da-sb-slider-val {
  font-family: 'Courier New', monospace;
  font-size: .82rem;
  font-weight: 800;
  color: #fbbf24;
  min-width: 16px;
  text-align: right;
  flex-shrink: 0;
}

@media (max-width: 700px) {
  .da-wbd-outer {
    flex-direction: column;
  }
  .da-section--pbd {
    flex: none;
    width: 100%;
  }
}
/* ── Perk scaling section ── */
.da-perk-scaling-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 8px;
}
.da-perk-scaling-divider::before,
.da-perk-scaling-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(245,158,11,.2);
}
.da-perk-scaling-label {
  font-size: .55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: var(--accent2);
  opacity: .7;
  white-space: nowrap;
  padding: 0 4px;
}

/* Perk scaling rows — tinted amber */
.ds-table--perk .ds-row {
  background: rgba(245,158,11,.04);
  border-radius: 5px;
  margin-bottom: 2px;
}

/* Perk result row */
.ds-result-row--perk {
  background: rgba(245,158,11,.07) !important;
  border-color: rgba(245,158,11,.22) !important;
}
.ds-result-row--perk .ds-result-label {
  color: var(--accent2) !important;
  font-size: .65rem;
  font-weight: 800;
  letter-spacing: .04em;
}
.ds-result-row--perk .ds-result-val {
  color: var(--accent2) !important;
}
.da-hit-card--crit {
  border-color: rgba(226,178,3,.6) !important;
  background: linear-gradient(135deg, rgba(20,20,20,.85) 0%, rgba(226,178,3,.1) 100%) !important;
}
.da-crit-toggle {
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

.da-crit-toggle--on {
  border-color: rgba(226,178,3,.6);
  background: rgba(226,178,3,.12);
  color: #e2b203;
  box-shadow: 0 0 8px rgba(226,178,3,.2);
}

.da-hit-num--crit {
  color: #e2b203 !important;
  text-shadow: 0 0 10px rgba(226,178,3,.4) !important;
}
.da-summon-formula {
  font-size: 0.58rem;
  font-family: 'Courier New', monospace;
  color: #c084fc;
  opacity: 0.5;
  white-space: nowrap;
}
.da-crit-mini-badge {
  position: absolute;
  top: 10px;
  right: -4px;
  display: flex;
  align-items: center;
  pointer-events: none;
  z-index: 10;
}
</style>