<script lang="ts">
  // SWARM TOTAL — active summons control (max = the SHARED GLOBAL cap; per-panel
  // state routing handled by the caller via onSummonCountChange — owner
  // 2026-11: rune and WA sliders are independent, never cross-controlling).
  // Row math removed per owner request 2026-11 — summon damage totals are
  // shown in the Base Damage chip / other panels. count === 0 → empty state
  // "not summoned". Buff toggles moved to SummonBuffs (own titled block).
  // cap <= 1 → static readout instead of a slider (nothing to drag).
  import type { SummonPanelVM } from '../lib/summonView'

  export let vm: SummonPanelVM
  /** (value) → caller routes: rune → build.vassalsCroakSummons, WA → per-name state */
  export let onSummonCountChange: (value: number) => void = () => {}

  $: empty = vm.count === 0
  $: staticCap = vm.cap <= 1

  // Drag without jank: the expensive part (build.update → full engine recalc in
  // DamageAnalyzer) is debounced to one commit; thumb/readout/fill follow the
  // raw drag instantly. _pending is null when the display follows vm.count.
  let _pending: number | null = null
  let _commitTimer: ReturnType<typeof setTimeout> | null = null

  $: displayed = _pending ?? vm.count
  $: fillPct = vm.cap > 0 ? (displayed / vm.cap) * 100 : 0

  function handleInput(this: HTMLInputElement, e: Event & { currentTarget: HTMLInputElement }) {
    const el = this ?? e.currentTarget
    const raw = Math.max(0, Math.min(vm.cap, Math.floor(Number(el.value))))
    _pending = raw
    if (_commitTimer) clearTimeout(_commitTimer)
    _commitTimer = setTimeout(() => {
      _commitTimer = null
      const asked = _pending as number
      onSummonCountChange(asked)
      // Snap the thumb back when the shared-total cap reduced the requested
      // value (setTimeout, not rAF — rAF stalls in unrendering tabs).
      setTimeout(() => {
        if (el.isConnected && vm.count !== asked) el.value = String(vm.count)
        _pending = null
      }, 0)
    }, 120)
  }
</script>

<div class="swe-swarm">
  <div class="swe-block-label">Swarm Total</div>

  {#if empty}
    <div class="swe-empty">not summoned</div>
  {/if}

  {#if staticCap}
    <div class="swe-static-row" title="Spawns {vm.spawnCount} per cast — max {vm.cap} active at once">
      <span class="swe-slider-label">Active summons</span>
      <span class="swe-static">
        <span class="swe-slider-val">{vm.count}</span><span class="swe-cap">/{vm.cap}</span>
      </span>
      <span class="swe-cap-note">Spawns {vm.spawnCount} per cast · max {vm.cap} active</span>
    </div>
  {:else}
    <div class="swe-slider-row">
      <span class="swe-slider-label">Active summons</span>
      <input
        class="swe-slider"
        type="range"
        min="0"
        max={vm.cap}
        step="1"
        value={displayed}
        on:input={handleInput}
        style="--tc:#c084fc; --fill:{fillPct}%"
        aria-label="Active summon count"
        aria-valuemax={vm.cap}
        aria-valuemin={0}
        aria-valuenow={displayed}
      />
      <span class="swe-slider-val" style="color:#c084fc">{displayed}<span class="swe-cap">/{vm.cap}</span></span>
    </div>
  {/if}
</div>

<style>
  .swe-swarm { padding: 4px 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .swe-block-label {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--sum-accent, #c084fc);
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .swe-empty {
    color: var(--sum-muted, #a6a2b0);
    font-style: italic;
    font-size: 13px;
    padding: 2px 0;
  }
  .swe-slider-row, .swe-static-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .swe-slider-label { font-size: 13px; color: var(--sum-muted, #a6a2b0); flex: none; }
  /* Same slider language as .da-sb-slider (DamageAnalyzer): filled track + glowing thumb */
  .swe-slider {
    flex: 1 1 0;
    min-width: 0;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    min-height: 0;
    border-radius: var(--radius-full, 999px);
    background: linear-gradient(
      to right,
      var(--tc, #c084fc) var(--fill, 50%),
      rgba(255,255,255,.07) var(--fill, 50%)
    );
    box-shadow: inset 0 1px 2px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04);
    outline: none;
    cursor: pointer;
    transition: filter var(--duration-fast, .15s);
  }
  .swe-slider:hover { filter: brightness(1.2); }
  .swe-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--tc, #c084fc) 50%);
    border: 1px solid rgba(0,0,0,.55);
    box-shadow: 0 0 8px var(--tc, #c084fc), 0 1px 3px rgba(0,0,0,.5);
    cursor: grab;
    transition: transform .12s, box-shadow .15s;
  }
  .swe-slider::-webkit-slider-thumb:hover { transform: scale(1.12); }
  .swe-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.25); }
  .swe-slider:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(255,255,255,.22), 0 0 12px var(--tc, #c084fc);
  }
  .swe-slider::-moz-range-track {
    height: 6px;
    border-radius: var(--radius-full, 999px);
    background: rgba(255,255,255,.07);
    box-shadow: inset 0 1px 2px rgba(0,0,0,.4);
  }
  .swe-slider::-moz-range-progress {
    height: 6px;
    border-radius: var(--radius-full, 999px);
    background: var(--tc, #c084fc);
    box-shadow: 0 0 6px var(--tc, #c084fc);
  }
  .swe-slider::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, #fff, var(--tc, #c084fc) 50%);
    border: 1px solid rgba(0,0,0,.55);
    box-shadow: 0 0 8px var(--tc, #c084fc), 0 1px 3px rgba(0,0,0,.5);
    cursor: grab;
  }
  .swe-slider:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 3px rgba(255,255,255,.22), 0 0 12px var(--tc, #c084fc);
  }
  .swe-slider-val, .swe-static {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-weight: var(--weight-extrabold, 800);
    color: var(--sum-accent, #c084fc);
    min-width: 4ch;
    text-align: right;
    white-space: nowrap;
  }
  .swe-cap { color: var(--sum-muted, #a6a2b0); font-weight: var(--weight-semibold, 600); }
  .swe-cap-note {
    font-size: 12px;
    color: var(--sum-muted, #a6a2b0);
  }
  .swe-static-row { flex-wrap: wrap; row-gap: 2px; }
  /* cap ≤ 1: stepper buttons would both be dead ends — static readout only */
  .swe-static { min-width: 2ch; }
</style>
