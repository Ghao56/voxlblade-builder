<script lang="ts">
  // SURVIVAL — HP bar + decay. HP/decay from the instance (locked at spawn);
  // base decay from the VM (lifetime.baseDecay) — display-only, this
  // component never rebuilds the ÷ (1 + boost) formula.
  import type { SummonPanelVM } from '../lib/summonView'
  import { fmtSummonNum, fmtSummonDuration } from '../lib/summonView'

  export let vm: SummonPanelVM

  $: pct = vm.lifetime.maxHp > 0 ? Math.max(0, Math.min(100, (vm.lifetime.hp / vm.lifetime.maxHp) * 100)) : 0
  $: barColor = pct >= 50 ? 'var(--sum-ok, #4ade80)' : pct >= 25 ? 'var(--sum-warn, #facc15)' : 'var(--sum-bad, #f87171)'
  $: secondsText = vm.lifetime.seconds === null ? '∞' : '~' + fmtSummonDuration(vm.lifetime.seconds)
  // decay 0 → neutral "No decay" chip; red only when actually decaying.
  $: noDecay = vm.lifetime.decayPerSec <= 0
</script>

<div class="slt-lifetime">
  <div class="slt-block-label">Survival</div>
  <div class="slt-bar-row">
    <div
      class="slt-bar"
      role="progressbar"
      aria-label="Summon HP"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(pct)}
    >
      <div class="slt-fill" style="--fill:{pct}%; --bc:{barColor}"></div>
    </div>
    <span class="slt-hp" style="color:{barColor}">{fmtSummonNum(vm.lifetime.hp)}<span class="slt-hp-max">/{fmtSummonNum(vm.lifetime.maxHp)}</span></span>
  </div>
  <div class="slt-detail">
    {#if noDecay}
      <span class="slt-nodecay">No decay</span>
    {:else}
      <span
        class="slt-decay"
        title={vm.lifetime.baseDecay !== null
          ? `Base decay ${fmtSummonNum(vm.lifetime.baseDecay)} — reduced by Summon Boost (calcSummonDecayPercent, SummonData)`
          : undefined}
      >−{fmtSummonNum(vm.lifetime.decayPerSec)}/s decay</span>
    {/if}
    <span class="slt-lifetime-val" title={noDecay ? 'No decay — lives until killed' : 'Estimated time until HP runs out'}>{secondsText}</span>
  </div>
</div>

<style>
  .slt-lifetime { padding: 4px 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .slt-block-label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--sum-accent, #c084fc); font-weight: var(--weight-semibold, 600); margin-bottom: 4px; }
  .slt-bar-row { display: flex; align-items: center; gap: 8px; }
  .slt-bar {
    flex: 1;
    height: 10px;
    border-radius: var(--radius-full, 999px);
    background: var(--surface, #26232e);
    overflow: hidden;
  }
  .slt-fill {
    height: 100%;
    width: var(--fill);
    background: var(--bc);
    border-radius: inherit;
    transition: width var(--duration-fast, .15s) var(--ease-out, ease);
  }
  .slt-hp {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: var(--weight-extrabold, 800);
    white-space: nowrap;
  }
  .slt-hp-max { color: var(--sum-muted, #a6a2b0); font-weight: var(--weight-semibold, 600); }
  .slt-detail {
    display: flex; justify-content: space-between; gap: 8px;
    margin-top: 3px;
    font-size: 13px;
  }
  .slt-nodecay {
    color: var(--sum-muted, #a6a2b0);
    font-size: 12px;
    background: rgba(255,255,255,.05);
    border: 1px solid var(--border, rgba(255,255,255,.12));
    border-radius: var(--radius-full, 999px);
    padding: 0 7px;
  }
  .slt-decay { color: var(--sum-bad, #f87171); font-weight: var(--weight-semibold, 600); font-variant-numeric: tabular-nums; }
  .slt-lifetime-val { color: var(--sum-warn, #facc15); font-weight: var(--weight-bold, 700); font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; }
</style>
