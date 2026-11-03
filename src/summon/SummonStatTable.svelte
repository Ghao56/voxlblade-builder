<script lang="ts">
  // ② CHỈ SỐ — bảng Base → Mult → Scaled. `scaled` đã đến từ hàm gốc
  // (calcSummonMaxHp / calcSummonDamage × calcSummonBuffDmgMult) qua VM.
  import type { SummonStatRow } from '../lib/summonView'
  import { fmtSummonNum } from '../lib/summonView'

  export let stat: SummonStatRow

  const fmtPct = (v: number) => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%'
  const fmtBase = (r: SummonStatRow) => (r.base === null ? null : r.unit === '%' ? fmtPct(r.base) : fmtSummonNum(r.base))
  const fmtScaled = (r: SummonStatRow) => (r.unit === '%' ? fmtPct(r.scaled) : fmtSummonNum(r.scaled))
  const fmtMult = (r: SummonStatRow) => (r.mult === null ? null : '×' + fmtSummonNum(r.mult))
</script>

<div class="sst-row sst-row--{stat.key}" role="row">
  <span class="sst-label" role="cell">
    {stat.label}
    {#if stat.dmgType}<span class="sst-type" style="color:{stat.dmgColor ?? '#e8e4da'}">[{stat.dmgType}]</span>{/if}
    {#if stat.note}<span class="sst-note">{stat.note}</span>{/if}
  </span>
  <span class="sst-col sst-col--base" role="cell">{fmtBase(stat) ?? '—'}</span>
  <span class="sst-col sst-col--mult" role="cell">{fmtMult(stat) ?? '—'}</span>
  <span class="sst-col sst-col--scaled" role="cell">
    {fmtScaled(stat)}
    {#if stat.ignoresArmor}
      <span class="sst-armor" title="Summon damage ignores enemy armor">🛡 ignores armor</span>
    {/if}
  </span>
</div>

<style>
  .sst-row {
    display: grid;
    grid-template-columns: 1fr 64px 72px 96px;
    align-items: baseline;
    gap: 6px;
    padding: 3px 0;
    border-bottom: 1px solid color-mix(in srgb, #c084fc 12%, transparent);
  }
  .sst-row:last-child { border-bottom: none; }
  .sst-label {
    color: var(--ink, #e8e4da);
    font-size: var(--text-base-plus, 13px);
    font-weight: var(--weight-semibold, 600);
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    align-items: baseline;
  }
  .sst-type { font-size: var(--text-sm, 11px); font-weight: var(--weight-bold, 700); }
  .sst-note {
    font-size: var(--text-2xs, 10px);
    color: var(--ink-muted, #8a8694);
    font-style: italic;
  }
  .sst-col { font-family: 'Courier New', monospace; text-align: right; }
  .sst-col--base { color: var(--ink-muted, #8a8694); }
  .sst-col--mult { color: #c084fc; font-weight: var(--weight-bold, 700); }
  .sst-col--scaled {
    color: var(--ink, #e8e4da);
    font-weight: var(--weight-extrabold, 800);
    white-space: nowrap;
  }
  .sst-armor {
    font-family: var(--font-body, sans-serif);
    font-size: var(--text-2xs, 10px);
    color: var(--accent2, #facc15);
    cursor: help;
    white-space: nowrap;
  }
  @media (max-width: 600px) {
    .sst-row { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
    .sst-label { grid-column: 1 / -1; }
  }
</style>
