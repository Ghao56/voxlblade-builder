<script lang="ts">
  // STATS — Base → Mult → Scaled table. `scaled` already comes from the
  // original functions (calcSummonMaxHp / calcSummonDamage ×
  // calcSummonBuffDmgMult) via the VM.
  import type { SummonStatRow } from '../lib/summonView'
  import { fmtSummonNum } from '../lib/summonView'

  export let stat: SummonStatRow
  /** Row shading (light zebra replaces per-row borders). */
  export let zebra = false

  const fmtPct = (v: number) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%'
  const fmtBase = (r: SummonStatRow) => (r.base === null ? null : r.unit === '%' ? fmtPct(r.base) : fmtSummonNum(r.base))
  const fmtScaled = (r: SummonStatRow) => (r.unit === '%' ? fmtPct(r.scaled) : fmtSummonNum(r.scaled))
  const fmtMult = (r: SummonStatRow) => (r.mult === null ? null : '×' + fmtSummonNum(r.mult))
  // Sign colors for % rows (resist/weakness semantics): + green, − red.
  const signColor = (v: number) => (v >= 0 ? 'var(--sum-ok, #4ade80)' : 'var(--sum-bad, #f87171)')
</script>

<div class="sst-row" class:sst-zebra={zebra} role="row">
  <span class="sst-label" role="cell">
    <!-- Name truncates on its own; the type pill must stay visible — never clip both together. -->
    <span class="sst-name" title={stat.label}>{stat.label}</span>
    {#if stat.dmgType}<span class="sst-type" style="color:{stat.dmgColor ?? '#e8e4da'}; border-color: color-mix(in srgb, {stat.dmgColor ?? '#e8e4da'} 40%, transparent)">{stat.dmgType}</span>{/if}
    {#if stat.note}<span class="sst-note">{stat.note}</span>{/if}
  </span>
  <span class="sst-col sst-col--base" role="cell" style={stat.unit === '%' && stat.base !== null ? `color:${signColor(stat.base)}` : ''}>{fmtBase(stat) ?? '—'}</span>
  <span class="sst-col sst-col--mult" role="cell" class:sst-col--empty={stat.mult === null}>{fmtMult(stat) ?? '—'}</span>
  <span class="sst-col sst-col--scaled" role="cell" style={stat.unit === '%' ? `color:${signColor(stat.scaled)}` : ''}>
    {fmtScaled(stat)}
    {#if stat.ignoresArmor}
      <span class="sst-armor" title="Summon damage ignores enemy armor">🛡 ignores armor</span>
    {/if}
  </span>
</div>

<style>
  .sst-row {
    display: grid;
    grid-template-columns: minmax(110px, 1.4fr) repeat(3, minmax(56px, 1fr));
    align-items: baseline;
    gap: 6px;
    padding: 3px 4px;
    border-radius: var(--radius-xs, 3px);
  }
  .sst-zebra { background: var(--sum-zebra, rgba(192,132,252,.035)); }
  .sst-label {
    color: var(--ink, #e8e4da);
    font-size: 13px;
    font-weight: var(--weight-semibold, 600);
    min-width: 0;
    display: flex;
    gap: 5px;
    align-items: baseline;
  }
  /* Name shrinks + ellipsizes; pill never shrinks, so long names swallow it. */
  .sst-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sst-type {
    font-size: 11px;
    font-weight: var(--weight-bold, 700);
    text-transform: capitalize;
    border: 1px solid transparent;
    border-radius: var(--radius-full, 999px);
    padding: 0 5px;
    line-height: 1.4;
    flex: none;
  }
  .sst-note {
    font-size: 12px;
    color: var(--sum-muted, #a6a2b0);
    font-style: italic;
    overflow: hidden;
  }
  .sst-col {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }
  .sst-col--base { color: var(--sum-muted, #a6a2b0); }
  .sst-col--mult { color: var(--sum-accent, #c084fc); font-weight: var(--weight-bold, 700); }
  /* No multiplier (defense rows): keep the em-dash, don't fight for attention. */
  .sst-col--empty { color: var(--ink-dim, #5a5d55); font-weight: var(--weight-normal, 400); }
  .sst-col--scaled {
    color: var(--ink, #e8e4da);
    font-weight: var(--weight-extrabold, 800);
  }
  .sst-armor {
    font-family: var(--font-body, sans-serif);
    font-size: 12px;
    color: var(--sum-warn, #facc15);
    cursor: help;
    white-space: nowrap;
  }
  @media (max-width: 600px) and (min-width: 0) {
    .sst-row { grid-template-columns: minmax(90px, 1.2fr) repeat(3, minmax(48px, 1fr)); }
  }
</style>
