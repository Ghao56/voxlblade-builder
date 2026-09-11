<script lang="ts">
  import type { SummonInstance } from './data/SummonData'
  import { UI_COLORS } from './lib/uiConstants'
  import { calcSummonMaxHp, calcSummonDamage } from './data/SummonData'

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

  $: maxHp = calcSummonMaxHp(summon.def.baseHp, summon.spawnBoostPct, summon.level)
  $: currentHp = Math.round(summon.currentHp * 100) / 100
  $: decay = Math.round(summon.decayPerSec * 100) / 100
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

  {#if summon.def.tenacity !== undefined || summon.def.physicalDefenseBoost !== undefined || summon.def.magicDefenseBoost !== undefined}
    <div class="summon-stats">
      {#if summon.def.tenacity !== undefined}
        <div class="stat-item"><span class="stat-label">Tenacity</span><span class="stat-value">{summon.def.tenacity}</span></div>
      {/if}
      {#if summon.def.physicalDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Physical Defense</span><span class="stat-value">+{Math.round(summon.def.physicalDefenseBoost * 100)}%</span></div>
      {/if}
      {#if summon.def.magicDefenseBoost !== undefined}
        <div class="stat-item"><span class="stat-label">Magic Defense</span><span class="stat-value">+{Math.round(summon.def.magicDefenseBoost * 100)}%</span></div>
      {/if}
    </div>
  {/if}

  <div class="attack-list" role="list" aria-label="Attacks">
    {#if summon.def.attacks && summon.def.attacks.length > 0}
      {#each summon.def.attacks as atk}
        {@const dmg = calcSummonDamage(atk.baseDmg, summon.currentBoostPct, summon.spawnBoostPct, summon.level)}
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
      {@const dmg = calcSummonDamage(summon.def.baseDmg, summon.currentBoostPct, summon.spawnBoostPct, summon.level)}
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
          <span class="buff-badge" style="background: #f87171;">[ {b.name} ] {b.value}</span>
        {/each}
      </div>
    </div>
  {/if}

  {#if showDebuffs && summon.debuffs && summon.debuffs.length}
    <div class="section debuffs-section" aria-label="Applied Debuffs">
      <h4 class="section-title">Applied Debuffs</h4>
      <div class="badge-row">
        {#each summon.debuffs as d}
          <span class="debuff-badge" style="background: #9333ea;">[ {d.name} ] {d.value}</span>
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
    .buff-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
    }
    .debuff-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
    }
  </style>
</div>
