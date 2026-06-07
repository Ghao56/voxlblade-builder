<!-- DamageAnalyzer.svelte -->
<script lang="ts">

  import { build, result } from './lib/store'
  import { calcWeapon, calcMonkWeapon, isMonkGuild } from './lib/engine'
  import BaseDamageCalc from './BaseDamageCalc.svelte'
  import { WEAPON_ARTS } from './data/weaponArts'

  // ── Reactive từ store ──────────────────────────────────────────────────────
  $: crit      = $result.crit
  $: boosts    = $result.boosts
  $: stats     = $result.stats
  $: perks     = $result.perks

  // ── Weapon Base Damage table ───────────────────────────────────────────────
  // Format: null = N/A, number = single hit, array = combo hits
  type HitSeq = (number | { n: number; count: number })[]

interface WeaponChargeConfig {
  enabled: boolean
  label: string
  max: number
  formula: (
    base:number,
    charge:number
  ) => number
}
type DamageDisplayType = {
  label: string
  rawVal: number
  val: number
  scalingMult: number
  color: string
}

interface WeaponBaseDmg {
  type: string
  m1: HitSeq | null
  m2: HitSeq | null
  m2Charge?: WeaponChargeConfig
}

  // Helper: parse "4.5, 4.5, 1.5x4" → HitSeq
  // Each entry is either a flat number or {n, count} for nxCount notation
  const WEAPON_BASE_DMG: WeaponBaseDmg[] = [
    { type: 'Fists',                m1: [5.5, 5.5, {n:2.7,count:3}],   m2: [15.5] },
    { type: 'Chain Fists',          m1: [{n:3.5,count:2},{n:3.5,count:2},{n:3.5,count:2}], m2: [{n:3,count:7}] },
    { type: '1-Handed Sword',       m1: [6, 6, 6],                      m2: [9] },
    { type: '2-Handed Sword',       m1: [5.5, 5.5, 5.5],               m2: [12] },
    { type: 'Rapier',               m1: [4.5, 4.5, {n:1.5,count:4}],   m2: [7.5] },
    { type: 'Dual Swords',          m1: [{n:3,count:2},{n:3,count:2},6],m2: [8] },
    { type: 'Greatsword',           m1: [9, 4, 9],                      m2: [11] },
    { type: 'Unbalanced Sword',     m1: [7.5, 12],                      m2: [16] },
    { type: 'Dual Unbalanced Swords',m1: [12, 12],                     m2: [{n:8,count:2},12] },
    { type: 'Dagger',               m1: [4.5, 4.5, 4.5],               m2: [5.5] },
    { type: 'Dual Wielding Daggers',m1: [4, {n:1.4,count:5},{n:1.4,count:5}], m2: [11] },
    { type: 'Spear',                m1: [6, 6, 6],                      m2: [10] },
    { type: 'Great Spear',          m1: [9, 14],                        m2: [{n:5,count:3}] },
    { type: 'Mallet',               m1: [6, 6, 6],                      m2: [18] },
    { type: 'Dual Mallets',         m1: [5, {n:1,count:5}, 5.5],        m2: [18.5] },
    { type: 'War Hammer',           m1: [6, 6, 14],                     m2: [{n:8,count:2}] },
    { type: 'Dual Kamas',           m1: [4, 4, {n:3,count:3}],          m2: [5.5] },
    { type: 'Scythe',               m1: [7.5, 7.5, 7.5],               m2: [{n:5,count:3}] },
    { type: 'Lance',                m1: [6, 6, 6],                      m2: [6.8, 14] },
    { type: 'Chainsaw',             m1: [{n:4,count:2},{n:4,count:2},{n:4,count:2}], m2: [{n:1.7,count:10}] },
    { type: 'Shield',               m1: [5, 5, 10],                     m2: [5] },

    { type: 'Artillery Mage',       m1: [5.5, 5.5],                     m2: [8.5] },
    { type: 'Stratos Winds',        m1: [5, 5],                         m2: [8] },
    { type: 'Storm Caster',         m1: [5, 5],                         m2: [{n:2.75,count:5}] },
    { type: 'Virulent Core',        m1: [4.5, 4.5],                     m2: [13.9] },
    { type: 'Cosmic Ray',           m1: null,                           m2: [18.5] },
    { type: 'Mine',                 m1: null,                           m2: [5, 10, 15] },
    { type: 'Side Gun',             m1: null,                           m2: [7] },
    { type: 'Shotgun',              m1: null,                           m2: [{n:4.5,count:3}] },
    { type: 'Dual Guns',            m1: [4, 4],                         m2: [{n:1.6,count:8}] },
    { type: 'Rifle',                m1: [5, 5, 18],                     m2: [17],

  m2Charge: {
    enabled: true,
    label: 'Rifle Charge',
    max: 100,
    formula: (base:number,charge:number) =>base *(1 + (5 / 3) * (charge / 100))
  }},]

  function fmtSeq(seq: HitSeq): string {
    return seq.map(h => {
      if (typeof h === 'number') return String(h)
      return `${h.n}\u00d7${h.count}`
    }).join(', ')
  }

  // Per-hit damage breakdown with type multipliers applied
  type HitBreakdown = Array<{
    label: string
    rawVal: number
    val: number
    scalingMult: number
    color: string
  }>

  const DMG_TYPE_COLORS: Record<string, string> = {
    physical: '#fb923c', magic: '#818cf8', fire: '#f97316',
    water: '#38bdf8', earth: '#a3e635', air: '#AAFFDB',
    hex: '#e879f9', holy: '#facc15', true: '#ffffff', summon: '#c084fc',
  }

  function fmtNum(n: number): string {
    const r = Math.round(n * 100) / 100
    return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
  }

  function seqWithTypes(
  seq: HitSeq,
  dmgTypes: Record<string, number>,
  scalingMult: number = 1
): Array<{ base: number; count: number; types: HitBreakdown }> {
  const typeEntries = Object.entries(dmgTypes)
  return seq.map(h => {
    const base = typeof h === 'number' ? h : h.n
    const count = typeof h === 'number'? 1 : h.count
    const types: HitBreakdown =
      typeEntries.map(([k, mult]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        rawVal: Math.round(base * 100) / 100,
        val: Math.round(base * mult * scalingMult * 100) / 100,
        scalingMult,
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
      }))
    return {base,count,types}
  })
}

  $: _isMonk = isMonkGuild($build.guild)

  $: _blasterCount = [$build.ring, $build.infusionRing, $build.infusionHelmet, $build.infusionChestplate, $build.infusionLeggings]
    .filter(s => s === 'Blaster Ring').length

  $: _hasLockedAndLoaded = ($result.perks['Locked And Loaded'] ?? 0) > 0

  const ONE_HANDED_TYPES = new Set([
    'Dagger','1-Handed Sword','Unbalanced Sword','Mallet','Rapier',
    'Dual Swords','Dual Wielding Daggers','Dual Unbalanced Swords','Dual Mallets','Dual Kamas',
    'Shield','Lance','Chainsaw',
  ])
  interface GunOverlay {
    type: string
    m2Only: boolean
    m2NoLock?: boolean  // M2 uses full weapon dmg types instead of gun-locked type
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

  // Build merged display row
  $: _displayRows = (() => {
    type MergedRow = WeaponBaseDmg & { gunLabel?: string; m2Only?: boolean; m2NoLock?: boolean }
    const rows: MergedRow[] = []

    if (_baseWeaponType) {
      const base = WEAPON_BASE_DMG.find(w => w.type === _baseWeaponType)
      if (base) {
        if (_gunOverlay) {
          const gun = WEAPON_BASE_DMG.find(w => w.type === _gunOverlay.type)
          if (_gunOverlay.m2Only) {
            // Keep weapon M1, replace M2 with gun M2
            rows.push({ type: _baseWeaponType, m1: base.m1, m2: gun?.m2 ?? null, gunLabel: _gunOverlay.type, m2Only: true, m2NoLock: _gunOverlay.m2NoLock })
          } else {
            // Full gun: both M1 and M2 from gun data
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

  // ── Weapon damage types (base + Stone Weapon enchant bonus) ───────────────
  $: _weaponDmgTypes = (() => {
    const base: Record<string, number> = { ...(_weaponResult?.damageTypes ?? {}) }
    const stoneWeapon = ($result.perks['Stone Weapon'] ?? 0)
    if (stoneWeapon > 0) {
      base['earth'] = Math.round(((base['earth'] ?? 0) + stoneWeapon * 0.3) * 100) / 100
    }
    return base
  })()

  // Gun weapons use only the highest damage type at full total value
  $: _gunDmgTypes = (() => {
    if (!_gunOverlay) return _weaponDmgTypes
    const entries = Object.entries(_weaponDmgTypes)
    if (entries.length === 0) return _weaponDmgTypes
    
    const PRIORITY = ['hex','water','air','true','earth','magic','fire','physical','holy']
    
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        // tiebreak: lower index = higher priority
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

  // Show all or just current
  let showAllWeapons = false


  function fmtMult(n: number): string {
    return `×${n.toFixed(4)}`
  }

  // ── Crit source breakdown ──────────────────────────────────────────────────
  $: natSources = crit.naturalBreakdown
  $: allCritSources = crit.allCritBreakdown
  $: critDmgSources = crit.critDmgBreakdown

  // ── Toggle state cho boost entries ────────────────────────────────────────
let disabledBoosts = new Set<string>([
  'Thief Training (would-crit bonus)'
])

function toggleBoost(name: string) {
  if (disabledBoosts.has(name)) disabledBoosts.delete(name)
  else disabledBoosts.add(name)
  disabledBoosts = new Set(disabledBoosts) // trigger reactivity
}

$: activeEntries = boosts.dmgEntries.filter(e => !disabledBoosts.has(e.sourceName))
$: hasDisabledVisible = boosts.dmgEntries.some(e => disabledBoosts.has(e.sourceName))
$: activeFinalMult = activeEntries.reduce((acc, e) => acc * e.rawMultiplier, 1.0)
$: activeFinalMultRounded = Math.round(activeFinalMult * 10000) / 10000

// ── Damage Scaling breakdown ───────────────────────────────────────────────
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
// WA-specific scaling breakdown (only when WA has its own scaling formula)
$: waScalingBreakdown = (() => {
  if (selectedWA.hitScalings?.length) {
    const rows: ScalingRow[] = []
    for (let i=0;i<selectedWA.hitScalings.length;i++) {
      const scaling = selectedWA.hitScalings[i]
      if (!scaling || scaling === 'Same as weapon') continue
      const dmgLabel = selectedWA.hitDamageTypes?.[i] ?.match(/[A-Za-z]+/)?.[0] ?? `Hit ${i+1}`
      const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Dex(?:terity)?|Summon)/gi
      let m
      while ((m = re.exec(scaling)) !== null) {
        const key = /dex/i.test(m[2]) ? 'dexterity' : m[2].toLowerCase()
        const boostKey = SCALING_TO_BOOST[key]
        if (!boostKey) continue
        const scalingVal = parseFloat(m[1])
        const boostPct = (stats as Record<string,number>)[boostKey] ?? 0
        rows.push({ 
          key,
          label:`${dmgLabel} · ${key} ×${scalingVal}`,
          scalingVal,
          boostKey,
          boostPct,
          contribution:Math.round(scalingVal *boostPct *100) / 100,
          color:SCALING_COLORS[key]?? '#e8e4da'
        })
      }
    }
    if (!rows.length) return null
    const totalContribution =rows.reduce((sum,row)=>sum + row.contribution,0)
    const avgEffectivePct =Math.round((totalContribution / rows.length) * 100) / 100
    const multiplier =Math.round((1 + avgEffectivePct / 100) * 10000) / 10000
    return {
      rows,
      totalEffectivePct: avgEffectivePct,
      multiplier,
      isPerHit:true
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
  const totalEffectivePct = Math.round(rows.reduce((a,r) => a+r.contribution, 0) * 100) / 100
  return { rows, totalEffectivePct,
    multiplier: Math.round((1 + totalEffectivePct / 100) * 10000) / 10000,
    isPerHit: false }
})()
$: waScalingSameAsWeapon = selectedWA.scaling === 'Same as weapon'
$: waScalingIsHealOnly = !_waHitsSeq && !!_waHealSeq
// ── Scaling multiplier for base damage display ─────────────────────────────
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
// ── Weapon Art base damage ─────────────────────────────────────────────
function parseWAHitsAll(baseDamage: string | undefined): {
  dmg: Array<{n: number; count: number}>
  heal: Array<{n: number; count: number}>
} {
  const empty = { dmg: [], heal: [] }
  if (!baseDamage) return empty
  if (/\d+[^+]*[–—]\s*\d+/.test(baseDamage)) return empty
  const dmg: Array<{n: number; count: number}> = []
  const heal: Array<{n: number; count: number}> = []
  for (const part of baseDamage.split(/\s*\+\s*/)) {
    const isHeal = /healing/i.test(part)
    const mx = part.match(/([\d.]+)\s*[×x]\s*(\d+)/i)
    if (mx) { ;(isHeal ? heal : dmg).push({ n: parseFloat(mx[1]), count: parseInt(mx[2]) }); continue }
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
    const PRIORITY = ['hex','water','air','true','earth','magic','fire','physical','holy']
    const [highestKey] = entries.reduce((a, b) => {
      if (b[1] > a[1]) return b
      if (b[1] === a[1]) {
        const ia = PRIORITY.indexOf(a[0]); const ib = PRIORITY.indexOf(b[0])
        return (ib === -1 ? 999 : ib) < (ia === -1 ? 999 : ia) ? b : a
      }
      return a
    })
    const total = Math.round(entries.reduce((s, [, v]) => s + v, 0) * 100) / 100
    return { [highestKey]: total }
  }
  const types: Record<string, number> = {}
  const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|True|Summon)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(dt)) !== null) types[m[2].toLowerCase()] = parseFloat(m[1])
  return Object.keys(types).length > 0 ? types : _weaponDmgTypes
})()

$: _waScalingMult = (() => {
  const sc = selectedWA.scaling
  if (!sc || sc === 'Same as weapon') return _scalingMult
  if (sc === 'None') return 1
  const re = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
  let totalPct = 0; let m: RegExpExecArray | null
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
      let hitScalingMult = _waScalingMult  // default: WA scaling
      if (hitScalingStr && hitScalingStr !== 'Same as weapon') {
        const scRe = /([\d.]+)\s*(Physical|Magic|Fire|Water|Earth|Air|Hex|Holy|Dex(?:terity)?|Summon)/gi
        let totalPct = 0; let scM: RegExpExecArray | null
        while ((scM = scRe.exec(hitScalingStr)) !== null) {
          const typeName = /dex/i.test(scM[2]) ? 'dexterity' : scM[2].toLowerCase()
          totalPct += parseFloat(scM[1]) * ((stats as Record<string, number>)[typeName + 'Boost'] ?? 0)
        }
        hitScalingMult = Math.round((1 + totalPct / 100) * 10000) / 10000
      } else if (hitScalingStr === 'Same as weapon') {
        hitScalingMult = _scalingMult
      }

      if (dtStr === 'Same as weapon') {
        const types: DamageDisplayType[] =Object.entries(_weaponDmgTypes).map(([k, mult]) => ({
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
      const types: DamageDisplayType[] = Object.entries(dtParsed).map(([k, mult]) => ({
        label: k.charAt(0).toUpperCase() + k.slice(1),
        rawVal: Math.round(base * 100) / 100,
        val: Math.round(base * mult * hitScalingMult * 100) / 100,
        scalingMult: hitScalingMult,
        color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
      }))
      return { base, count, types }
    })
  }

  return seqWithTypes(seq, _waDmgTypes, _waScalingMult)
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
$: _showWACol = !showAllWeapons && (!!_waHitsSeq || !!selectedWA.baseDamage)

// ── Range damage parser (e.g. "15 (Base) – 175 (Fully Charged)") ──────────
function parseRangeDamage(s: string): { min: number; minLabel: string; max: number; maxLabel: string } | null {
  const m = s.match(/([\d.]+)\s*(?:\(([^)]+)\))?\s*[–—]\s*([\d.]+)\s*(?:\(([^)]+)\))?/)
  if (!m) return null
  return { min: parseFloat(m[1]), minLabel: m[2] ?? '', max: parseFloat(m[3]), maxLabel: m[4] ?? '' }
}

$: _waRangeDamage = (() => {
  if (_waHitsSeq !== null || !selectedWA.baseDamage) return null
  return parseRangeDamage(selectedWA.baseDamage)
})()

interface RangeEnd { label: string; val: number; color: string }
$: _waRangeTyped = (() => {
  if (!_waRangeDamage || Object.keys(_waDmgTypes).length === 0) return null
  const { min, minLabel, max, maxLabel } = _waRangeDamage
  const toEnds = (base: number): RangeEnd[] =>
    Object.entries(_waDmgTypes).map(([k, mult]) => ({
      label: k.charAt(0).toUpperCase() + k.slice(1),
      val: Math.round(base * mult * _waScalingMult * 100) / 100,
      color: DMG_TYPE_COLORS[k] ?? '#e8e4da',
    }))
  return { minEnds: toEnds(min), minLabel, maxEnds: toEnds(max), maxLabel }
})()

let weaponCharge = 100

$: selectedWeaponData =
  WEAPON_BASE_DMG.find(w => w.type === (_gunOverlay?.type ?? _baseWeaponType))
function applyWeaponCharge(dmg:number){
  if (!selectedWeaponData?.m2Charge?.enabled) {
    return dmg
  }
  return selectedWeaponData.m2Charge.formula(dmg, weaponCharge)
}
</script>

<div class="da-root">

  <!-- ══════════════════ TOP ROW: CRIT + APEN ══════════════════ -->
  <div class="da-top-row">

    <!-- Crit column -->
    <div class="da-section da-section--crit">
      <div class="da-section-title">⚡ Crit Statistics</div>
      <div class="da-crit-grid">

        <div class="da-stat-card da-stat-card--crit">
          <div class="da-stat-label">Crit Chance</div>
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
        <span class="da-bc-val">{disabled ? '—' : `×${entry.rawMultiplier.toFixed(3)}`}</span>
        {#if entry.condition}
          <span class="da-bc-cond">{entry.condition}</span>
        {/if}
        <span class="da-bc-toggle">{disabled ? 'OFF' : 'ON'}</span>
      </button>
      <span class="da-chain-op">×</span>
    {/each}
    <span class="da-chain-result"
      class:da-chain-result--dimmed={hasDisabledVisible}>
      = ×{activeFinalMultRounded.toFixed(4)}
      {#if hasDisabledVisible}
        <span class="da-chain-orig">/{boosts.dmgFinalMultiplier.toFixed(4)}</span>
      {/if}
    </span>
  </div>

  {#if boosts.healEntries.length > 0}
    <div class="da-boost-row" style="margin-top:8px">
      <span class="da-heal-label">✦ Heal</span>
      {#each boosts.healEntries as entry}
        <div class="da-boost-chip da-boost-chip--heal" title={entry.condition ?? ''}>
          <span class="da-bc-name">{entry.sourceName}</span>
          <span class="da-bc-val" style="color:#4ade80">×{entry.rawMultiplier.toFixed(3)}</span>
        </div>
        <span class="da-chain-op">×</span>
      {/each}
      <span class="da-chain-result" style="color:#4ade80">= ×{boosts.healFinalMultiplier.toFixed(4)}</span>
    </div>
  {/if}
</div>

<!-- ══════════════════ WEAPON BASE DAMAGE ══════════════════ -->
<div class="da-section da-section--wbd">
  <div class="da-section-title-row">
    <span class="da-section-title">Base Damage</span>
    <div class="da-wbd-controls">
      {#if _currentLabel}
        <span class="da-wbd-current-badge">{_currentLabel}</span>
      {/if}
      {#if !showAllWeapons && _scalingMult !== 1}
        <span class="da-wbd-scaling-badge" title="Base damage × damage type × scaling multiplier">
          ×scaling {_scalingMult.toFixed(4)}
        </span>
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
    {@const m1Typed = hasDmgTypes && row.m1 ? seqWithTypes(row.m1, m1DmgTypes, _scalingMult) : null}
    {@const m2Typed = hasDmgTypes && row.m2 ? seqWithTypes(row.m2, m2DmgTypes, _scalingMult) : null}
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
            <div class="da-hit-wrapper">
              <div class="da-hit-card">
                {#each hit.types as t, ti}
                  {#if ti > 0}
                    <span class="da-hit-plus">+</span>
                  {/if}

                  <div class="da-hit-chunk" style="--tc:{t.color}">
                  {#if t.scalingMult !== 1}
                    <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                    <span class="da-hit-arrow">→</span>
                  {/if}
                    <span class="da-hit-num">{fmtNum(t.val)}</span>
                    <span class="da-hit-type">{t.label}</span>
                    </div>
                  {#if hit.count > 1}
                    <div class="da-hit-repeat">×{hit.count}<span>Hits</span></div>
                  {/if}
                {/each}
              </div>
          </div>
            {/each}
          {:else if row.m1}
            {#each row.m1 as hit, hi}
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
              <div class="da-hit-card">
                {#each hit.types as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  {@const finalVal = selectedWeaponData?.m2Charge?.enabled ? selectedWeaponData.m2Charge.formula(t.val, weaponCharge) : t.val}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                    {#if _scalingMult !== 1}
                      <span class="da-hit-raw">{fmtNum(t.rawVal)}</span>
                      <span class="da-hit-arrow">→</span>
                    {/if}
                    <span class="da-hit-num">{fmtNum(finalVal)}</span>
                    <span class="da-hit-type">{t.label}</span>
                  </div>
                {/each}
              </div>
              {#if hit.count > 1}<span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>{/if}
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
              <div class="da-hit-card">
                {#each hit.types as t, ti}
                  {#if ti > 0}<span class="da-hit-plus">+</span>{/if}
                  <div class="da-hit-chunk" style="--tc:{t.color}">
                  {#if t.scalingMult !== 1}
                    <span class="da-hit-raw">
                      {fmtNum(t.rawVal)}
                    </span>
                    <span class="da-hit-arrow">→</span>
                  {/if}
                  <span class="da-hit-num">
                    {fmtNum(t.val)}
                  </span>
                  <span class="da-hit-type">
                    {t.label}
                  </span>
                </div>
                {/each}

                {#if hit.count > 1}
                  <span class="da-hit-repeat">×{hit.count}<span class="da-hit-repeat-label">hits</span></span>
                {/if}
              </div>
            {/each}

          {:else if _waHitsSeq}

            {_waHitsSeq.map(h =>
              h.count > 1 ? `${h.n}×${h.count}` : String(h.n)
            ).join(', ')}
              {_waHitsSeq.map(h => h.count > 1 ? `${h.n}×${h.count}` : String(h.n)).join(', ')}
            {:else if _waRangeTyped}
              <div class="da-range-row">
                <div class="da-hit-card">
                  <div class="da-range-end">
                    {#each _waRangeTyped.minEnds as t, ti}
                      {#if ti > 0}
                        <span class="da-hit-plus">+</span>
                      {/if}

                      <div class="da-hit-chunk" style="--tc:{t.color}">
                        <span class="da-hit-num">{fmtNum(t.val)}</span>
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

                      <div class="da-hit-chunk" style="--tc:{t.color}">
                        <span class="da-hit-num">{fmtNum(t.val)}</span>
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
                      <span class="da-hit-num">{fmtNum(scaledHeal)}</span>
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
          <span class="ds-num" style="color:{row.color}">{Math.round(row.scalingVal * 10000) / 10000}</span>
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
  <!-- Multiplier result -->
  <div class="ds-result-row">
    <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
      <span class="ds-result-label">Scaling Multiplier</span>
      <span class="ds-applies-to">{waScalingSameAsWeapon ? 'M1 · M2 · Weapon Art' : 'M1 · M2'}</span>
    </div>
    <span class="ds-result-eq">1 + {scalingBreakdown.totalEffectivePct}% =</span>
    <span class="ds-result-val">×{scalingBreakdown.multiplier.toFixed(4)}</span>
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
          ×{waScalingBreakdown.multiplier.toFixed(4)}
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

.da-hit-wrapper{
  display:flex;
  align-items:center;
  gap:8px;
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
</style>