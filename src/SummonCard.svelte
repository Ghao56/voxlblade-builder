<script lang="ts">
  import type { SummonInstance } from './data/SummonData'
  import { UI_COLORS } from './lib/uiConstants'
  import { calcSummonMaxHp, calcSummonDamage, calcSummonBuffDmgMult } from './data/SummonData'
  import { BUFF_DEFS } from './data/BuffData'

  export let summon: SummonInstance
  export let showBuffs = true
  export let showDebuffs = true

  const dmgColor = (type: string) => {
    const map: Record<string, string> = {
      physical: UI_COLORS.combat,
      hex: UI_COLORS.hex,
      magic: UI_COLORS.magic,
      holy: UI_COLORS.holy,
      fire: UI_COLORS.fire,
      water: UI_COLORS.water,
      earth: UI_COLORS.earth,
    }
    return map[type.toLowerCase()] || UI_COLORS.combat
  }

  const fmtPct = (v: number) => (v >= 0 ? '+' : '') + `${Math.round(v * 100)}%`

  const BUFF_COLOR_OVERRIDES: Record<string, string> = { 'Rage Potency': '#f70201' }
  const buffColor = (name: string, isDebuff: boolean) =>
    BUFF_DEFS[name]?.color ?? BUFF_COLOR_OVERRIDES[name] ?? (isDebuff ? '#9333ea' : '#f87171')

  let _buffOff = new Map<string, boolean>()
  const toggleBuff = (key: string) => {
    _buffOff = new Map(_buffOff).set(key, !(_buffOff.get(key) ?? false))
  }

  $: _offBuffs = new Set([..._buffOff.entries()].filter(([, v]) => v).map(([k]) => k))
  $: _dmgMult = calcSummonBuffDmgMult(summon.buffs ?? [], _offBuffs)

  $: maxHp = calcSummonMaxHp(summon.def.baseHp, summon.spawnBoostPct, summon.level)
  $: currentHp = Math.round(summon.currentHp * 100) / 100
  $: decay = Math.round(summon.decayPerSec * 100) / 100

  const fmtDuration = (secs: number) => {
    const s = Math.round(secs)
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const r = s % 60
    return r > 0 ? `${m}m ${r}s` : `${m}m`
  }
  $: lifetime = (() => {
    if (summon.decayPerSec <= 0 || !isFinite(summon.decayPerSec)) return '∞'
    return fmtDuration((summon.currentHp ?? 0) / summon.decayPerSec)
  })()
</script>

<div class="summon-card" aria-label="Summon {summon.def.name}">
  <div class="summon-header">
    <h3 class="summon-name">{summon.def.name}</h3>
    <span class="summon-source">{summon.source}</span>
  </div>

  <div class="summon-hp-line">
    <span class="hp-label">HP:</span>
    <span class="hp-current">{currentHp}</span>
    <span class="hp-sep">/</span>
    <span class="hp-max">{maxHp}</span>
    <span class="decay-label">−{decay}/s Decay</span>
  </div>

  <div class="summon-lifetime">
    <span class="lifetime-label">Lifetime</span>
    <span class="lifetime-value">~{lifetime}</span>
  </div>

  {#if summon.def.tenacity !== undefined || summon.def.physicalDefenseBoost !== undefined || summon.def.magicDefenseBoost !== undefined || summon.def.airDefenseBoost !== undefined || summon.def.waterDefenseBoost !== undefined}
    <div class="summon-stats">
      {#if summon.def.tenacity !== undefined}
        <div class="stat-item"><span class="stat-label">Tenacity</span><span class="stat-value">{summon.def.tenacity}</span></div>
      {/if}
      {#if summon.def.physicalDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Physical Defense</span><span class="stat-value">{fmtPct(summon.def.physicalDefenseBoost)}</span></div>
      {/if}
      {#if summon.def.airDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Air Defense</span><span class="stat-value">{fmtPct(summon.def.airDefenseBoost)}</span></div>
      {/if}
      {#if summon.def.magicDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Magic Defense</span><span class="stat-value">{fmtPct(summon.def.magicDefenseBoost)}</span></div>
      {/if}
      {#if summon.def.waterDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Water Defense</span><span class="stat-value">{fmtPct(summon.def.waterDefenseBoost)}</span></div>
      {/if}
    </div>
  {/if}

  <div class="attack-list" role="list" aria-label="Attacks">
    {#if summon.def.attacks && summon.def.attacks.length > 0}
      {#each summon.def.attacks as atk}
        {@const dmg = Math.round(calcSummonDamage(atk.baseDmg, summon.currentBoostPct, summon.spawnBoostPct, summon.level) * _dmgMult * 100) / 100}
        <div class="attack-block" role="listitem" style="--badge-color: {dmgColor(atk.dmgType)}">
          <span class="attack-label">{atk.label}</span>
          <span class="attack-dmg">[ {dmg} ]</span>
          <span class="attack-type">{atk.dmgType}</span>
          {#if atk.guardbreak}
            <span class="guardbreak">GB</span>
          {/if}
        </div>
      {/each}
    {:else}
      {@const dmg = Math.round(calcSummonDamage(summon.def.baseDmg, summon.currentBoostPct, summon.spawnBoostPct, summon.level) * _dmgMult * 100) / 100}
      <div class="attack-block" role="listitem" style="--badge-color: {dmgColor(summon.def.dmgType)}">
        <span class="attack-label">Base Attack</span>
        <span class="attack-dmg">[ {dmg} ]</span>
        <span class="attack-type">{summon.def.dmgType}</span>
      </div>
    {/if}
  </div>

  {#if showBuffs && summon.buffs && summon.buffs.length}
    <div class="section buffs-section" aria-label="Buffs">
      <h4 class="section-title">Buffs</h4>
      <div class="badge-row">
        {#each summon.buffs as b}
          {@const off = _buffOff.get(b.name) ?? false}
          {@const color = buffColor(b.name, false)}
          <button
            class="buff-badge" class:buff-badge--off={off}
            style="background:color-mix(in srgb,{color} 10%,transparent);border-color:color-mix(in srgb,{color} 35%,transparent)"
            aria-pressed={!off}
            on:click={() => toggleBuff(b.name)}
          >
            [ {b.name} ] <span class="badge-val" style="color:{color}">{off ? '—' : b.value}</span>
            <span class="badge-toggle" class:badge-toggle--on={!off} style={!off ? `background:color-mix(in srgb,${color} 25%,transparent);color:${color}` : ''}>{off ? 'OFF' : 'ON'}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if showDebuffs && summon.debuffs && summon.debuffs.length}
    <div class="section debuffs-section" aria-label="Applied Debuffs">
      <h4 class="section-title">Applied Debuffs</h4>
      <div class="badge-row">
        {#each summon.debuffs as d}
          {@const off = _buffOff.get(`d:${d.name}`) ?? false}
          {@const color = buffColor(d.name, true)}
          <button
            class="debuff-badge" class:debuff-badge--off={off}
            style="background:color-mix(in srgb,{color} 10%,transparent);border-color:color-mix(in srgb,{color} 35%,transparent)"
            aria-pressed={!off}
            on:click={() => toggleBuff(`d:${d.name}`)}
          >
            [ {d.name} ] <span class="badge-val" style="color:{color}">{off ? '—' : d.value}</span>
            <span class="badge-toggle" class:badge-toggle--on={!off} style={!off ? `background:color-mix(in srgb,${color} 25%,transparent);color:${color}` : ''}>{off ? 'OFF' : 'ON'}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <style>
    .summon-card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 12px;
      padding: 14px 16px;
      color: #e4e4e7;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35);
    }
    .summon-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .summon-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fafafa;
      margin: 0;
      letter-spacing: 0.02em;
    }
    .summon-source {
      font-size: 0.7rem;
      color: #a1a1aa;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .summon-hp-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.95rem;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .summon-stats {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 10px;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    .stat-label {
      font-size: 0.78rem;
      color: #a1a1aa;
      font-weight: 600;
    }
    .stat-value {
      font-size: 0.82rem;
      color: #fafafa;
      font-weight: 700;
    }
    .hp-current { color: #22c55e; font-weight: 700; }
    .hp-max { color: #e4e4e7; }
    .hp-sep { color: #71717a; }
    .decay-label { color: #ef4444; font-weight: 600; margin-left: auto; font-size: 0.85rem; }
    .summon-lifetime {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 0.82rem;
      margin-bottom: 10px;
      color: #a1a1aa;
    }
    .lifetime-label { font-weight: 600; }
    .lifetime-value { color: #fbbf24; font-weight: 700; }
    .attack-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .attack-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 1 1 96px;
      min-width: 96px;
      padding: 8px 10px;
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid rgba(255,255,255,0.08);
      color: #fafafa;
      text-align: center;
    }
    .attack-dmg {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--badge-color, #fb923c);
      white-space: nowrap;
    }
    .attack-label { font-size: 0.8rem; color: #d4d4d8; font-weight: 600; }
    .attack-type { font-size: 0.7rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.03em; }
    .guardbreak {
      font-size: 0.65rem;
      font-weight: 700;
      color: #facc15;
      background: rgba(250,204,21,0.15);
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid rgba(250,204,21,0.3);
    }
    .section { margin-top: 8px; }
    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #a1a1aa;
      margin: 0 0 6px 0;
      font-weight: 600;
    }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .buff-badge, .debuff-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      font-family: inherit;
      line-height: inherit;
      transition: opacity .15s ease, filter .15s ease;
    }
    .buff-badge--off, .debuff-badge--off {
      opacity: .45;
      filter: grayscale(.6);
    }
    .badge-val { font-weight: 800; }
    .badge-toggle {
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 1px 5px;
      border-radius: 9999px;
      color: #71717a;
      background: rgba(0,0,0,0.35);
      border: 1px solid rgba(255,255,255,0.12);
    }
    .badge-toggle--on {
      color: #fff;
      background: rgba(255,255,255,0.22);
    }
  </style>
</div>
