<script lang="ts">
  import { build, result } from './lib/store'
  import Badge from './lib/ui/Badge.svelte'

  const STACK_COLORS = [
    { color: '#6b7280', glow: 'rgba(107,114,128,0.3)' },
    { color: '#a78bfa', glow: 'rgba(167,139,250,0.4)' },
    { color: '#818cf8', glow: 'rgba(129,140,248,0.4)' },
    { color: '#60a5fa', glow: 'rgba(96,165,250,0.4)' },
    { color: '#34d399', glow: 'rgba(52,211,153,0.4)' },
    { color: '#e5e7eb', glow: 'rgba(229,231,235,0.5)' },
  ]

  $: stacks = $build.perfectionStacks ?? 5
  $: amount = $result.perks['Perfection'] ?? 0
  $: potency = stacks * amount
  $: cur = STACK_COLORS[stacks]

  function onSlider(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value)
    build.update(b => ({ ...b, perfectionStacks: val }))
  }
</script>

<div class="pt" style="--c:{cur.color};--glow:{cur.glow}">

  <div class="pt-head">
    <span class="pt-title">Perfection Stacks</span>
    <div class="pt-head-right">
      <Badge color={cur.color} size="sm">{stacks}/5</Badge>
    </div>
  </div>

  <div class="pt-btns">
    {#each [0,1,2,3,4,5] as s}
      <button
        class="pt-btn"
        class:pt-btn--active={stacks === s}
        on:click={() => build.update(b => ({ ...b, perfectionStacks: s }))}
      >
        <span class="pt-btn-label">{s}</span>
      </button>
    {/each}
  </div>

  <div class="pt-track-row">
    <div class="pt-slider-wrap">
      <input
        class="pt-slider"
        type="range" min="0" max="5" step="1"
        value={stacks}
        on:input={onSlider}
        style="--tc:{cur.color};--tg:{cur.glow}"
      />

      <div class="pt-dots">
        {#each [0,1,2,3,4,5] as s}
          <div class="pt-dot"
            class:pt-dot--active={stacks === s}
            style="--dot-color:{STACK_COLORS[s].color}; --dot-glow:{STACK_COLORS[s].glow}"
          ></div>
        {/each}
      </div>
    </div>
  </div>

  <div class="pt-effects">
    <span class="pt-effect">+{potency * 2}% DMG</span>
    <span class="pt-effect">+{potency}% Crit</span>
    <span class="pt-effect">+{potency * 3}% Speed</span>
  </div>

</div>

<style>
  .pt {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(229,231,235,0.15);
    background: rgba(229,231,235,0.04);
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.25s, background 0.25s;
    font-family: 'Trebuchet MS','Segoe UI',system-ui,sans-serif;
  }

  .pt-head { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .pt-head-right { display:flex; align-items:center; gap:6px; }
  .pt-title {
    font-size:.6rem; text-transform:uppercase; letter-spacing:.16em;
    font-weight:700; color:var(--c); opacity:.7;
  }

  .pt-btns { display:flex; gap:4px; }
  .pt-btn {
    flex:1; display:flex; align-items:center; justify-content:center;
    padding:5px 2px; border-radius:6px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.03);
    color:#6b7066; font-family:inherit; font-size:.65rem; font-weight:700;
    cursor:pointer; transition:all .18s;
  }
  .pt-btn:hover { border-color:rgba(255,255,255,0.15); color:#a0a89a; }
  .pt-btn--active {
    background: rgba(229,231,235,0.1) !important;
    border-color: var(--c) !important;
    color: var(--c) !important;
    box-shadow: 0 0 8px var(--glow);
  }

  .pt-track-row { display:flex; align-items:center; gap:8px; }
  .pt-slider-wrap { flex:1; position:relative; display:flex; flex-direction:column; gap:3px; }

  .pt-slider {
    -webkit-appearance:none; appearance:none;
    width:100%; height:6px;
    background:transparent; outline:none; cursor:pointer;
    position:relative; z-index:1;
  }
  .pt-slider::-webkit-slider-runnable-track {
    height:6px; border-radius:999px;
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(255,255,255,0.08);
  }
  .pt-slider::-moz-range-track {
    height:6px; border-radius:999px;
    background:rgba(255,255,255,0.05);
  }
  .pt-slider::-webkit-slider-thumb {
    -webkit-appearance:none;
    width:20px; height:20px; border-radius:50%;
    background:var(--tc,#e5e7eb);
    border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(229,231,235,0.4)), 0 2px 6px rgba(0,0,0,0.5);
    margin-top:-7px;
    cursor:grab;
    transition:background .2s, box-shadow .2s, transform .1s;
  }
  .pt-slider::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.2); }
  .pt-slider::-moz-range-thumb {
    width:20px; height:20px; border-radius:50%;
    background:var(--tc,#e5e7eb);
    border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(229,231,235,0.4));
    cursor:grab;
    transition:background .2s, box-shadow .2s;
  }

  .pt-dots { display:flex; justify-content:space-between; padding:0 10px; pointer-events:none; }
  .pt-dot {
    width:5px; height:5px; border-radius:50%;
    background:rgba(255,255,255,0.12);
    transition:background .2s, transform .2s, box-shadow .2s;
  }
  .pt-dot--active {
    transform:scale(1.5);
    background: var(--dot-color) !important;
    box-shadow: 0 0 5px var(--dot-glow);
  }

  .pt-effects {
    display:flex; gap:8px; justify-content:center;
    font-size:.55rem; font-weight:600; color:var(--c); opacity:.8;
    text-transform:uppercase; letter-spacing:.08em;
  }
  .pt-effect { white-space:nowrap; }
</style>
