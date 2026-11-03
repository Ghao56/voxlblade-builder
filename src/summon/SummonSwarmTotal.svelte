<script lang="ts">
  // SWARM TOTAL — active summons slider (max = the SHARED GLOBAL cap; per-panel
  // state routing handled by the caller via onSummonCountChange — owner
  // 2026-11: rune and WA sliders are independent, never cross-controlling).
  // Row math removed per owner request 2026-11 — summon damage totals are
  // shown in the Base Damage chip / other panels. count === 0 → empty state
  // "not summoned". Buff toggles moved to SummonBuffs (own titled block).
  import type { SummonPanelVM } from '../lib/summonView'

  export let vm: SummonPanelVM
  /** (value) → caller routes: rune → build.vassalsCroakSummons, WA → per-name state */
  export let onSummonCountChange: (value: number) => void = () => {}

  $: empty = vm.count === 0
</script>

<div class="swe-swarm">
  <div class="swe-block-label">Swarm Total</div>

  {#if empty}
    <div class="swe-empty">not summoned</div>
  {/if}

  <div class="swe-slider-row">
    <span class="swe-slider-label">Active summons</span>
    <input
      class="swe-slider"
      type="range"
      min="0"
      max={vm.cap}
      step="1"
      value={vm.count}
      on:change={(e) => onSummonCountChange(Number((e.currentTarget as HTMLInputElement).value))}
      aria-label="Active summon count"
      aria-valuemax={vm.cap}
      aria-valuemin={0}
      aria-valuenow={vm.count}
    />
    <span class="swe-slider-val" style="color:#c084fc">{vm.count}</span>
  </div>
</div>

<style>
  .swe-swarm { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .swe-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .swe-empty {
    color: var(--ink-muted, #8a8694);
    font-style: italic;
    font-size: var(--text-base-plus, 13px);
    padding: 2px 0;
  }
  .swe-slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .swe-slider-label { font-size: var(--text-base-plus, 13px); color: var(--ink-muted, #8a8694); }
  .swe-slider {
    flex: 1;
    height: 8px;
    accent-color: #c084fc;
    cursor: pointer;
  }
  .swe-slider-val {
    font-family: 'Courier New', monospace;
    font-weight: var(--weight-extrabold, 800);
    color: #c084fc;
    min-width: 2ch;
    text-align: right;
  }
</style>
