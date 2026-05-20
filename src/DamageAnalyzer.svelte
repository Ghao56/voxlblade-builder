<!-- DamageAnalyzer.svelte -->
<script lang="ts">
  import { build, result } from './lib/store'

  // ── Reactive từ store ──────────────────────────────────────────────────────
  $: crit      = $result.crit
  $: boosts    = $result.boosts
  $: stats     = $result.stats
  $: perks     = $result.perks

  // ── Damage calculator state ────────────────────────────────────────────────
  let baseDamage: number = 100
  let enemyDefense: number = 0       // % reduction
  let damageType: string = 'physical'
  let hits: number = 1

  const DMG_TYPES = [
    { id: 'physical', label: 'Physical', color: '#fb923c' },
    { id: 'magic',    label: 'Magic',    color: '#818cf8' },
    { id: 'fire',     label: 'Fire',     color: '#f97316' },
    { id: 'water',    label: 'Water',    color: '#38bdf8' },
    { id: 'earth',    label: 'Earth',    color: '#a3e635' },
    { id: 'air',      label: 'Air',      color: '#e2e8f0' },
    { id: 'hex',      label: 'Hex',      color: '#e879f9' },
    { id: 'holy',     label: 'Holy',     color: '#facc15' },
    { id: 'true',     label: 'True',     color: '#f87171' },
    { id: 'summon',   label: 'Summon',   color: '#c084fc' },
  ]

  const TYPE_BOOST_KEY: Record<string, string> = {
    physical: 'physicalBoost',
    magic:    'magicBoost',
    fire:     'fireBoost',
    water:    'waterBoost',
    earth:    'earthBoost',
    air:      'airBoost',
    hex:      'hexBoost',
    holy:     'holyBoost',
    true:     '',
    summon:   'summonBoost',
  }

  $: typeBoostPct = (() => {
    const key = TYPE_BOOST_KEY[damageType]
    if (!key) return 0
    return (stats as Record<string, number>)[key] ?? 0
  })()

  $: typeBoostMult = 1 + typeBoostPct / 100

  // Combat multiplier (dmg)
  $: combatMult = boosts.dmgFinalMultiplier

  // Defense reduction
  $: defMult = Math.max(0, 1 - enemyDefense / 100)

  // ── Per-hit calculations ───────────────────────────────────────────────────
  $: rawHit       = baseDamage * typeBoostMult * combatMult * defMult
  $: critHit      = rawHit * (crit.critDamageMultiplier / 100)
  $: avgHit       = rawHit * (1 - crit.effectiveCritChance / 100) + critHit * (crit.effectiveCritChance / 100)

  // ── Multi-hit ─────────────────────────────────────────────────────────────
  $: totalNormal  = rawHit  * hits
  $: totalCrit    = critHit * hits
  $: totalAvg     = avgHit  * hits

  // ── Breakdown rows ─────────────────────────────────────────────────────────
  interface Step { label: string; mult: number; running: number; color?: string }
  $: breakdown = (() => {
    const steps: Step[] = []
    let running = baseDamage
    steps.push({ label: 'Base Damage', mult: 1, running, color: '#e8e4da' })

    if (typeBoostMult !== 1) {
      running *= typeBoostMult
      steps.push({ label: `${DMG_TYPES.find(d=>d.id===damageType)?.label} Boost (+${typeBoostPct}%)`, mult: typeBoostMult, running, color: DMG_TYPES.find(d=>d.id===damageType)?.color })
    }

    for (const entry of boosts.dmgEntries) {
      running *= entry.rawMultiplier
      steps.push({ label: entry.sourceName + (entry.condition ? ` (${entry.condition})` : ''), mult: entry.rawMultiplier, running, color: entry.sourceName === 'Level Damage' ? '#fbbf24' : '#fb923c' })
    }

    if (defMult !== 1) {
      running *= defMult
      steps.push({ label: `Enemy Defense (${enemyDefense}% reduction)`, mult: defMult, running, color: '#f87171' })
    }

    return steps
  })()

  function fmt(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M'
    if (n >= 1_000)     return (n / 1_000).toFixed(2) + 'K'
    return n.toFixed(2)
  }

  function fmtMult(n: number): string {
    return `×${n.toFixed(4)}`
  }

  let showBreakdown = true

  // ── Crit source breakdown ──────────────────────────────────────────────────
  $: natSources = crit.naturalBreakdown
  $: allCritSources = crit.allCritBreakdown
  $: critDmgSources = crit.critDmgBreakdown
</script>

<div class="da-root">

  <!-- ══════════════════ TOP: CRIT STATS ══════════════════ -->
  <div class="da-section">
    <div class="da-section-title">⚡ Crit Statistics</div>
    <div class="da-crit-grid">

      <div class="da-stat-card da-stat-card--crit">
        <div class="da-stat-label">Crit Chance</div>
        <div class="da-stat-val" style="color:#e2b203">{crit.effectiveCritChance.toFixed(1)}%</div>
        {#if allCritSources.length > 0}
          <div class="da-sources">
            {#each allCritSources as s}
              <div class="da-source-row">
                <span class="da-source-name">
                  {s.source}
                </span>
                <span class="da-source-val" style="color:{s.isExtra ? '#f59e0b' : '#e2b203'}">
                  +{s.amount.toFixed(2)}%
                </span>
              </div>
            {/each}
            {#if crit.extraCritChance > 0 && crit.naturalCritChance > 0}
              <div class="da-source-formula">
                (1−(1−{(crit.naturalCritChance/100).toFixed(3)})(1−{(crit.extraCritChance/100).toFixed(3)}))
              </div>
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
              <span class="da-source-val" style="color:#a78bfa">{s.source === 'Base' ? '' : '+'}{s.amount.toFixed(s.source === 'Base' ? 0 : 2)}%</span>
            </div>
          {/each}
        </div>
      </div>

    </div>
  </div>

  <!-- ══════════════════ COMBAT MULTIPLIERS ══════════════════ -->
  <div class="da-section">
    <div class="da-section-title">⚔ Combat Multipliers</div>
    <div class="da-boost-row">
      {#each boosts.dmgEntries as entry}
        <div class="da-boost-chip"
          class:da-boost-chip--lvl={entry.sourceName === 'Level Damage'}
          title={entry.condition ?? ''}>
          <span class="da-bc-name">
            {entry.sourceName === 'Level Damage' ? `LV${$build.level ?? 80}` : entry.sourceName}
          </span>
          <span class="da-bc-val">×{entry.rawMultiplier.toFixed(3)}</span>
          {#if entry.condition}
            <span class="da-bc-cond">{entry.condition}</span>
          {/if}
        </div>
        <span class="da-chain-op">×</span>
      {/each}
      <span class="da-chain-result">= ×{boosts.dmgFinalMultiplier.toFixed(4)}</span>
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
    cursor: default;
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

</style>