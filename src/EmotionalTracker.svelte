<!-- EmotionalTracker.svelte -->
<!--
  USAGE trong App.svelte (bên trong perks-grid, sau perk-card của "Emotional"):
  
  import EmotionalTracker from './EmotionalTracker.svelte'
  
  Trong perks-grid block, thay đoạn:
    {#each perkRows as [name, count]}
      <div class="perk-card">...</div>
    {/each}
  
  thành:
    {#each perkRows as [name, count]}
      {@const perk = getPerk(name)}
      <div class="perk-card">
        <div class="perk-row">
          <span class="perk-name">{name} <span class="perk-val">+{Math.round(count * 100) / 100}</span></span>
        </div>
        {#if perk?.description}
          <p class="perk-desc">{perk.description}</p>
        {/if}
        {#if name === 'Emotional'}
          <EmotionalTracker />
        {/if}
      </div>
    {/each}
-->

<script lang="ts">
  type EmotionalState = 'debuff' | 'both' | 'buff'

  let state: EmotionalState = 'buff'

  const SLIDER_MAP: EmotionalState[] = ['debuff', 'both', 'buff']

  const STATE_DATA: Record<EmotionalState, {
    label: string
    color: string
    glow: string
    border: string
    bg: string
    icon: string
  }> = {
    buff: {
      label: 'Only Buffs',
      color: '#4ade80',
      glow: 'rgba(74,222,128,0.4)',
      border: 'rgba(74,222,128,0.3)',
      bg: 'rgba(74,222,128,0.07)',
      icon: '✦',
    },
    debuff: {
      label: 'Only Debuffs',
      color: '#f87171',
      glow: 'rgba(248,113,113,0.4)',
      border: 'rgba(248,113,113,0.3)',
      bg: 'rgba(248,113,113,0.07)',
      icon: '✕',
    },
    both: {
      label: 'Both Buff & Debuff',
      color: '#a78bfa',
      glow: 'rgba(167,139,250,0.4)',
      border: 'rgba(167,139,250,0.3)',
      bg: 'rgba(167,139,250,0.07)',
      icon: '⟳',
    }
  }

  $: cur = STATE_DATA[state]
  $: sliderVal = SLIDER_MAP.indexOf(state)

  function onSlider(e: Event) {
    state = SLIDER_MAP[parseInt((e.target as HTMLInputElement).value)]
  }

  function pick(s: EmotionalState) { state = s }
</script>

<div class="et"
  style="--c:{cur.color};--glow:{cur.glow};--border-c:{cur.border};--bg:{cur.bg}">

  <!-- Header row -->
  <div class="et-head">
    <span class="et-title">Emotional State</span>
    <span class="et-badge">{cur.label}</span>
  </div>

  <!-- 3-button quick select -->
  <div class="et-btns">
    {#each SLIDER_MAP as s}
      <button
        class="et-btn"
        class:et-btn--active={state === s}
        style={state === s
          ? `background:${STATE_DATA[s].bg};border-color:${STATE_DATA[s].border};color:${STATE_DATA[s].color};box-shadow:0 0 8px ${STATE_DATA[s].glow}`
          : ''}
        on:click={() => pick(s)}
      >
        <span class="et-btn-icon">{STATE_DATA[s].icon}</span>
        <span class="et-btn-label">
          {s === 'buff' ? 'Buff' : s === 'debuff' ? 'Debuff' : 'Both'}
        </span>
      </button>
    {/each}
  </div>

  <!-- Slider -->
  <div class="et-track-row">
    <span class="et-tick-label" style="color:#f87171">Debuff</span>

    <div class="et-slider-wrap">
      <!-- Colored segment track behind the input -->
      <div class="et-seg-track">
        <div class="et-seg et-seg--debuff" class:et-seg--active={state === 'debuff'}></div>
        <div class="et-seg et-seg--both"   class:et-seg--active={state === 'both'}></div>
        <div class="et-seg et-seg--buff"   class:et-seg--active={state === 'buff'}></div>
      </div>

      <input
        class="et-slider"
        type="range" min="0" max="2" step="1"
        value={sliderVal}
        on:input={onSlider}
        style="--tc:{cur.color};--tg:{cur.glow}"
      />

      <!-- Tick dots below -->
      <div class="et-dots">
        {#each SLIDER_MAP as s}
          <div class="et-dot"
            class:et-dot--active={state === s}
            style={state === s ? `background:${STATE_DATA[s].color};box-shadow:0 0 5px ${STATE_DATA[s].glow}` : ''}
          ></div>
        {/each}
      </div>
    </div>

    <span class="et-tick-label" style="color:#4ade80">Buff</span>
  </div>

</div>

<style>
  .et {
    margin-top: 8px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-c);
    background: var(--bg);
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.25s, background 0.25s;
    font-family: 'Trebuchet MS','Segoe UI',system-ui,sans-serif;
  }

  /* Header */
  .et-head { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .et-title {
    font-size:.6rem; text-transform:uppercase; letter-spacing:.16em;
    font-weight:700; color:var(--c); opacity:.7;
  }
  .et-badge {
    font-size:.65rem; font-weight:700; padding:2px 9px; border-radius:999px;
    background:var(--bg); border:1px solid var(--border-c); color:var(--c);
    transition:all .25s; white-space:nowrap;
  }

  /* Quick buttons */
  .et-btns { display:flex; gap:5px; }
  .et-btn {
    flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;
    padding:6px 4px; border-radius:7px;
    border:1px solid rgba(255,255,255,0.08);
    background:rgba(255,255,255,0.03);
    color:#6b7066; font-family:inherit;
    cursor:pointer; transition:all .18s;
  }
  .et-btn:hover { border-color:rgba(255,255,255,0.15); color:#a0a89a; }
  .et-btn--active { font-weight:700; }
  .et-btn-icon { font-size:.8rem; }
  .et-btn-label { font-size:.6rem; text-transform:uppercase; letter-spacing:.1em; font-weight:700; }

  /* Slider track row */
  .et-track-row {
    display:flex; align-items:center; gap:8px;
  }
  .et-tick-label {
    font-size:.58rem; font-weight:700; text-transform:uppercase;
    letter-spacing:.1em; flex-shrink:0; opacity:.75;
  }
  .et-slider-wrap {
    flex:1; position:relative; display:flex; flex-direction:column; gap:3px;
  }

  /* Segment visual track */
  .et-seg-track {
    position:absolute; top:50%; transform:translateY(calc(-50% - 5px));
    left:0; right:0; height:6px;
    border-radius:999px; overflow:hidden;
    display:flex; pointer-events:none; z-index:0;
  }
  .et-seg { flex:1; opacity:.18; transition:opacity .2s; }
  .et-seg--active { opacity:.8; }
  .et-seg--debuff { background:#f87171; }
  .et-seg--both   { background:linear-gradient(90deg,#f87171,#a78bfa,#4ade80); }
  .et-seg--buff   { background:#4ade80; }

  /* Range input */
  .et-slider {
    -webkit-appearance:none; appearance:none;
    width:100%; height:6px;
    background:transparent; outline:none; cursor:pointer;
    position:relative; z-index:1;
  }
  .et-slider::-webkit-slider-runnable-track {
    height:6px; border-radius:999px;
    background:rgba(255,255,255,0.05);
    border:1px solid rgba(255,255,255,0.08);
  }
  .et-slider::-moz-range-track {
    height:6px; border-radius:999px;
    background:rgba(255,255,255,0.05);
  }
  .et-slider::-webkit-slider-thumb {
    -webkit-appearance:none;
    width:20px; height:20px; border-radius:50%;
    background:var(--tc,#4ade80);
    border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(74,222,128,0.4)), 0 2px 6px rgba(0,0,0,0.5);
    margin-top:-7px;
    cursor:grab;
    transition:background .2s, box-shadow .2s, transform .1s;
  }
  .et-slider::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.2); }
  .et-slider::-moz-range-thumb {
    width:20px; height:20px; border-radius:50%;
    background:var(--tc,#4ade80);
    border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(74,222,128,0.4));
    cursor:grab;
    transition:background .2s, box-shadow .2s;
  }

  /* Dot ticks */
  .et-dots {
    display:flex; justify-content:space-between;
    padding:0 10px; pointer-events:none;
  }
  .et-dot {
    width:5px; height:5px; border-radius:50%;
    background:rgba(255,255,255,0.12);
    transition:background .2s, transform .2s, box-shadow .2s;
  }
  .et-dot--active { transform:scale(1.5); }
</style>