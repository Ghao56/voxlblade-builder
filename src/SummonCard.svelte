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
      background: var(--surface2);
      border: 1px solid var(--surface4);
      border-radius: var(--radius-lg);
      padding: var(--space-3) var(--space-4);
      color: var(--ink);
      font-family: var(--font-body);
      max-width: 320px;
      box-shadow: var(--shadow-md);
    }
    .summon-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--space-2-5);
    }
    .summon-name {
      font-size: var(--text-xl);
      font-weight: var(--weight-bold);
      color: var(--ink);
      margin: 0;
      letter-spacing: var(--tracking-wide);
    }
    .summon-source {
      font-size: var(--text-sm);
      color: var(--ink-muted);
      text-transform: uppercase;
      letter-spacing: var(--tracking-wider);
    }
    .summon-hp-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: var(--text-lg);
      margin-bottom: var(--space-2-5);
      flex-wrap: wrap;
    }
    .summon-stats {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-bottom: var(--space-2-5);
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--space-2);
    }
    .stat-label {
      font-size: var(--text-sm-plus);
      color: var(--ink-muted);
      font-weight: var(--weight-semibold);
    }
    .stat-value {
      font-size: var(--text-base-plus);
      color: var(--ink);
      font-weight: var(--weight-bold);
    }
    .hp-current { color: var(--accent); font-weight: var(--weight-bold); }
    .hp-max { color: var(--ink); }
    .hp-sep { color: var(--ink-dim); }
    .decay-label { color: var(--neg); font-weight: var(--weight-semibold); margin-left: auto; font-size: var(--text-base-plus); }
    .summon-lifetime {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      font-size: var(--text-base-plus);
      margin-bottom: var(--space-2-5);
      color: var(--ink-muted);
    }
    .lifetime-label { font-weight: var(--weight-semibold); }
    .lifetime-value { color: var(--accent2); font-weight: var(--weight-bold); }
    .attack-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-2-5);
    }
    .attack-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 1 1 96px;
      min-width: 96px;
      padding: var(--space-2) var(--space-2-5);
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
      border: 1px solid var(--border);
      color: var(--ink);
      text-align: center;
    }
    .attack-dmg {
      font-size: var(--text-xl);
      font-weight: var(--weight-extrabold);
      color: var(--badge-color, var(--weapon-blade));
      white-space: nowrap;
    }
    .attack-label { font-size: var(--text-base); color: var(--ink-muted); font-weight: var(--weight-semibold); }
    .attack-type { font-size: var(--text-sm); color: var(--ink-muted); text-transform: uppercase; letter-spacing: var(--tracking-wider); }
    .guardbreak {
      font-size: var(--text-xs);
      font-weight: var(--weight-bold);
      color: var(--accent2);
      background: rgba(250,204,21,0.15);
      padding: 1px 4px;
      border-radius: var(--radius-xs);
      border: 1px solid rgba(250,204,21,0.3);
    }
    .section { margin-top: var(--space-2); }
    .section-title {
      font-size: var(--text-sm-plus);
      text-transform: uppercase;
      letter-spacing: var(--tracking-widest);
      color: var(--ink-muted);
      margin: 0 0 6px 0;
      font-weight: var(--weight-semibold);
    }
    .badge-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .buff-badge, .debuff-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: var(--radius-full);
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      color: var(--ink);
      border: 1px solid var(--border-strong);
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      font-family: inherit;
      line-height: inherit;
      transition: opacity var(--duration-fast) var(--ease-out), filter var(--duration-fast) var(--ease-out);
    }
    .buff-badge--off, .debuff-badge--off {
      opacity: .45;
      filter: grayscale(.6);
    }
    .badge-val { font-weight: var(--weight-extrabold); }
    .badge-toggle {
      font-size: var(--text-2xs);
      font-weight: var(--weight-extrabold);
      letter-spacing: var(--tracking-wide);
      padding: 1px 5px;
      border-radius: var(--radius-full);
      color: var(--ink-dim);
      background: rgba(0,0,0,0.35);
      border: 1px solid var(--border);
    }
    .badge-toggle--on {
      color: var(--ink);
      background: rgba(255,255,255,0.22);
    }
  </style>
</div>
