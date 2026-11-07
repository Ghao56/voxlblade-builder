<script lang="ts">
  // STATS — Base → Mult → Scaled table. `scaled` already comes from the
  // original functions (calcSummonMaxHp / calcSummonDamage ×
  // calcSummonBuffDmgMult) via the VM.
  import type { SummonStatRow } from '../lib/summonView'
  import { fmtSummonNum } from '../lib/summonView'
  import { DMG_TYPE_COLORS } from '../lib/constants/damage-types'

  export let stat: SummonStatRow
  /** Row shading (light zebra replaces per-row borders). */
  export let zebra = false

  const fmtPct = (v: number) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%'
  const fmtBase = (r: SummonStatRow) => (r.base === null ? null : r.unit === '%' ? fmtPct(r.base) : fmtSummonNum(r.base))
  const fmtScaled = (r: SummonStatRow) => (r.unit === '%' ? fmtPct(r.scaled) : fmtSummonNum(r.scaled))
  const fmtMult = (r: SummonStatRow) => (r.mult === null ? null : '×' + fmtSummonNum(r.mult))
  // Sign colors for % rows (resist/weakness semantics): + green, − red.
  const signColor = (v: number) => (v >= 0 ? 'var(--sum-ok, #4ade80)' : 'var(--sum-bad, #f87171)')
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
</script>

<div class="sst-row" class:sst-zebra={zebra} role="row">
  <span class="sst-label" role="cell">
    <span class="sst-name" title={stat.label}>{stat.label}</span>
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

<div class="sst-type-line">
  {#if stat.dmgChunks && stat.dmgChunks.length > 0}
    {#each stat.dmgChunks as chunk, i (chunk.type)}
      {#if i > 0}<span class="sst-chunk-plus">+</span>{/if}
      <div class="sst-chunk" role="group" style="--tc:{DMG_TYPE_COLORS[chunk.type] ?? '#e8e4da'}">
        <div class="sst-chunk-top">
          <span class="sst-chunk-val">{fmtSummonNum(chunk.scaled)}</span>
          <span class="sst-chunk-label">{cap(chunk.type)}</span>
        </div>
        <div class="sst-chunk-formula">
          <div class="sst-fr"><span class="sst-fr-label">Base Damage</span><span class="sst-fr-val">{fmtSummonNum(chunk.base)}</span></div>
          <div class="sst-fr"><span class="sst-fr-label">Boost Multiplier</span><span class="sst-fr-val">× {fmtSummonNum(stat.mult ?? 1)}</span></div>
          <div class="sst-fr-divider"></div>
          <div class="sst-fr sst-fr--result"><span class="sst-fr-label">Final Damage</span><span class="sst-fr-val sst-fr-val--result">{fmtSummonNum(chunk.scaled)}</span></div>
        </div>
      </div>
    {/each}
  {/if}
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
  /* Type block — sits directly under the row, same language as
     bdc-hit-type-chunk: value on top with its colored label, formula rows
     (Base Damage → Boost Multiplier → Final Damage) beneath; chunks join
     with '+' for multi-type hits (Imp Stab: Physical + Fire, 50/50). */
  .sst-type-line {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-end;
    gap: 6px;
    padding: 2px 4px 6px;
  }
  .sst-type-line:empty { display: none; }
  .sst-chunk {
    border: 1px solid color-mix(in srgb, var(--tc, #e8e4da) 25%, transparent);
    border-radius: var(--radius-sm, 6px);
    padding: 4px 6px;
    min-width: 0;
  }
  .sst-chunk-top {
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .sst-chunk-val {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: var(--weight-extrabold, 800);
    color: var(--tc, #e8e4da);
  }
  .sst-chunk-label {
    font-family: var(--font-body, sans-serif);
    font-size: 11px;
    font-weight: var(--weight-semibold, 600);
    color: var(--tc, #e8e4da);
    opacity: .85;
    white-space: nowrap;
  }
  .sst-chunk-formula { display: grid; gap: 1px; margin-top: 3px; }
  .sst-fr {
    display: flex;
    justify-content: space-between;
    gap: 10px;
  }
  .sst-fr-label {
    font-family: var(--font-body, sans-serif);
    font-size: 11px;
    color: var(--sum-muted, #a6a2b0);
  }
  .sst-fr-val {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 12px;
    color: var(--ink, #e8e4da);
  }
  .sst-fr-divider {
    height: 1px;
    background: color-mix(in srgb, var(--tc, #e8e4da) 20%, transparent);
    margin: 2px 0;
  }
  .sst-fr--result .sst-fr-label { color: var(--tc, #e8e4da); }
  .sst-fr-val--result { font-weight: var(--weight-bold, 700); color: var(--tc, #e8e4da); }
  .sst-chunk-plus {
    font-size: 12px;
    color: var(--sum-muted, #a6a2b0);
    line-height: 1.4;
  }
  @media (max-width: 600px) and (min-width: 0) {
    .sst-row { grid-template-columns: minmax(90px, 1.2fr) repeat(3, minmax(48px, 1fr)); }
  }
</style>
