<script lang="ts">
  // SURVIVAL — draggable HP bar + decay. HP/decay from the instance (locked at
  // spawn); base decay from the VM (lifetime.baseDecay). The bar is a slider:
  // drag/keys set the summon's current HP (% of max) via onSummonHpChange —
  // the component never owns the value, DamageAnalyzer stores it per summon.
  // Blood Rush (lifetime.rage): threshold marker + Rage chip while active.
  import type { SummonPanelVM } from '../lib/summonView'
  import { fmtSummonNum, fmtSummonDuration } from '../lib/summonView'

  export let vm: SummonPanelVM
  /** Current HP as % of max (0–100) — owned by the caller (DamageAnalyzer). */
  export let hpPct = 100
  /** (pct:number) — bar drag / arrow keys; caller clamps and stores it. */
  export let onSummonHpChange: (pct: number) => void = () => {}

  $: pct = Math.max(0, Math.min(100, hpPct))
  $: hp = (vm.lifetime.maxHp * pct) / 100
  $: barColor = pct >= 50 ? 'var(--sum-ok, #4ade80)' : pct >= 25 ? 'var(--sum-warn, #facc15)' : 'var(--sum-bad, #f87171)'
  // vm.lifetime.seconds is the remaining survival at the CURRENT hp (VM does
  // the pct math) — ∞ when there is no decay.
  $: secondsText = vm.lifetime.seconds === null ? '∞' : '~' + fmtSummonDuration(vm.lifetime.seconds)
  // decay 0 → neutral "No decay" chip; red only when actually decaying.
  $: noDecay = vm.lifetime.decayPerSec <= 0
  $: rage = vm.lifetime.rage

  // Drag = pointer capture on the track; click-to-set comes free from
  // pointerdown. Keys: arrows ±1, shift ±10 (slider semantics).
  let dragging = false
  function pctFromEvent(e: PointerEvent): number {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * 100
  }
  function onDragDown(e: PointerEvent) {
    dragging = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    onSummonHpChange(pctFromEvent(e))
  }
  function onDragMove(e: PointerEvent) {
    if (dragging) onSummonHpChange(pctFromEvent(e))
  }
  function onDragUp() {
    dragging = false
  }
  function onKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 10 : 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      onSummonHpChange(Math.max(0, pct - step))
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      onSummonHpChange(Math.min(100, pct + step))
    }
  }
</script>

<div class="slt-lifetime">
  <div class="slt-block-label">Survival</div>
  <div class="slt-bar-row">
    <div
      class="slt-bar"
      role="slider"
      tabindex="0"
      aria-label="Summon HP"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${fmtSummonNum(hp)} / ${fmtSummonNum(vm.lifetime.maxHp)} HP`}
      on:pointerdown={onDragDown}
      on:pointermove={onDragMove}
      on:pointerup={onDragUp}
      on:keydown={onKey}
    >
      <div class="slt-fill" style="--fill:{pct}%; --bc:{barColor}"></div>
      <div class="slt-thumb" style="left:{pct}%; --bc:{barColor}"></div>
      {#if rage.thresholdPct !== null}
        <!-- Blood Rush low-HP threshold — Rage triggers at/below this line -->
        <div
          class="slt-rage-marker"
          class:slt-rage-marker--armed={rage.active}
          style="left:{rage.thresholdPct}%"
          title={`Blood Rush — Rage ${rage.potency} triggers at ≤ ${rage.thresholdPct}% HP`}
        ></div>
      {/if}
    </div>
    <span class="slt-hp" style="color:{barColor}">{fmtSummonNum(hp)}<span class="slt-hp-max">/{fmtSummonNum(vm.lifetime.maxHp)}</span></span>
  </div>
  <div class="slt-detail">
    {#if noDecay}
      <span class="slt-nodecay">No decay</span>
    {:else}
      <span
        class="slt-decay"
        title={vm.lifetime.baseDecay !== null
          ? `Base decay ${fmtSummonNum(vm.lifetime.baseDecay)}% HP/s — reduced by Summon Boost (calcSummonDecayPercent, SummonData)`
          : undefined}
      >−{fmtSummonNum(vm.lifetime.decayPerSec)}% HP/s</span>
    {/if}
    <span class="slt-lifetime-val" title={noDecay ? 'No decay — lives until killed' : 'Estimated time until HP runs out'}>{secondsText}</span>
  </div>
</div>

<style>
  .slt-lifetime { padding: 4px 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .slt-block-label { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: var(--sum-accent, #c084fc); font-weight: var(--weight-semibold, 600); margin-bottom: 4px; }
  .slt-bar-row { display: flex; align-items: center; gap: 8px; }
  .slt-bar {
    position: relative;
    flex: 1;
    height: 10px;
    border-radius: var(--radius-full, 999px);
    background: var(--surface, #26232e);
    overflow: hidden;
    cursor: grab;
  }
  .slt-bar:active { cursor: grabbing; }
  .slt-bar {
    transition: box-shadow .15s ease;
  }
  .slt-bar:hover {
    box-shadow: 0 0 9px color-mix(in srgb, var(--sum-accent, #c084fc) 40%, transparent);
  }
  .slt-bar:active {
    /* pressed — inset shadow reads as lifted track */
    box-shadow: inset 0 2px 3px rgba(0,0,0,0.5);
  }
  .slt-thumb {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 6px;
    transform: translateX(-50%);
    border-radius: 2px;
    background: rgba(12,11,16,0.55);
    border: 1px solid var(--bc, var(--sum-accent, #c084fc));
    box-shadow: 0 0 4px color-mix(in srgb, var(--bc, var(--sum-accent, #c084fc)) 45%, transparent);
    z-index: 2;
    pointer-events: none;
    transition: transform .15s ease, box-shadow .15s ease;
  }
  /* grip dots ⠿ — vertical grip inside the thumb */
  .slt-thumb::after {
    content: '';
    position: absolute;
    inset: 1px;
    background-image: radial-gradient(circle, rgba(255,255,255,0.6) 0.7px, transparent 1px);
    background-size: 100% 3px;
    background-repeat: repeat-y;
    background-position: center top;
  }
  .slt-bar:hover .slt-thumb {
    transform: translateX(-50%) scaleY(1.15);
    box-shadow: 0 0 7px color-mix(in srgb, var(--bc, var(--sum-accent, #c084fc)) 60%, transparent);
  }
  .slt-bar:active .slt-thumb { transform: translateX(-50%); }
  .slt-fill {
    height: 100%;
    width: var(--fill);
    background: var(--bc);
    border-radius: inherit;
    transition: width var(--duration-fast, .15s) var(--ease-out, ease);
  }
  .slt-rage-marker {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-1px);
    background: var(--sum-accent, #c084fc);
    opacity: .55;
  }
  .slt-rage-marker--armed { opacity: 1; box-shadow: 0 0 6px var(--sum-accent, #c084fc); }
  .slt-hp {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-size: 13px;
    font-weight: var(--weight-extrabold, 800);
    white-space: nowrap;
  }
  .slt-hp-max { color: var(--sum-muted, #a6a2b0); font-weight: var(--weight-semibold, 600); }
  .slt-detail {
    display: flex; justify-content: space-between; align-items: center; gap: 8px;
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
