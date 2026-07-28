<script lang="ts">
  import { build } from './lib/store'

  type Element = 'air' | 'fire'
  type BuffMode = 'air' | 'fire' | 'both'

  const ELEMENT_SLIDER: Element[] = ['air', 'fire']
  const BUFFMODE_SLIDER: BuffMode[] = ['air', 'both', 'fire']

  const ELEM_DATA: Record<Element, {
    label: string; color: string; glow: string; border: string; bg: string; icon: string
  }> = {
    air:  { label: 'Air',  color: '#AAFFDB', glow: 'rgba(170,255,219,0.4)', border: 'rgba(170,255,219,0.3)', bg: 'rgba(170,255,219,0.07)', icon: '🌀' },
    fire: { label: 'Fire', color: '#f97316', glow: 'rgba(249,115,22,0.4)', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.07)', icon: '🔥' },
  }

  const BUFF_DATA: Record<BuffMode, {
    label: string; color: string; glow: string; border: string; bg: string; icon: string
  }> = {
    air:  { label: 'Air Only',  color: '#AAFFDB', glow: 'rgba(170,255,219,0.4)', border: 'rgba(170,255,219,0.3)', bg: 'rgba(170,255,219,0.07)', icon: '🌀' },
    fire: { label: 'Fire Only', color: '#f97316', glow: 'rgba(249,115,22,0.4)', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.07)', icon: '🔥' },
    both: { label: 'Both',      color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', border: 'rgba(167,139,250,0.3)', bg: 'rgba(167,139,250,0.07)', icon: '⟳' },
  }

  $: element = ($build.propellingFunElement ?? 'air') as Element
  $: buffMode = ($build.propellingFunBuffMode ?? 'both') as BuffMode
  $: elemCur = ELEM_DATA[element]
  $: buffCur = BUFF_DATA[buffMode]
  $: elemSliderVal = ELEMENT_SLIDER.indexOf(element)
  $: buffSliderVal = BUFFMODE_SLIDER.indexOf(buffMode)

  function updateElement(e: Element) {
    build.update(b => ({ ...b, propellingFunElement: e }))
  }
  function updateBuffMode(m: BuffMode) {
    build.update(b => ({ ...b, propellingFunBuffMode: m }))
  }

  function onElemSlider(ev: Event) {
    updateElement(ELEMENT_SLIDER[parseInt((ev.target as HTMLInputElement).value)])
  }
  function onBuffSlider(ev: Event) {
    updateBuffMode(BUFFMODE_SLIDER[parseInt((ev.target as HTMLInputElement).value)])
  }
</script>

<div class="pf" style="--c:{elemCur.color};--glow:{elemCur.glow};--border-c:{elemCur.border};--bg:{elemCur.bg}">

  <!-- Element row -->
  <div class="pf-head">
    <span class="pf-title">Jump Element</span>
    <span class="pf-badge" style="color:{elemCur.color}">{elemCur.icon} {elemCur.label}</span>
  </div>

  <div class="pf-btns">
    {#each ELEMENT_SLIDER as e}
      <button
        class="pf-btn"
        class:pf-btn--active={element === e}
        style="--btn-bg:{ELEM_DATA[e].bg}; --btn-border:{ELEM_DATA[e].border}; --btn-color:{ELEM_DATA[e].color}; --btn-glow:{ELEM_DATA[e].glow}"
        on:click={() => updateElement(e)}
      >
        <span class="pf-btn-icon">{ELEM_DATA[e].icon}</span>
        <span class="pf-btn-label">{ELEM_DATA[e].label}</span>
      </button>
    {/each}
  </div>

  <div class="pf-track-row">
    <span class="pf-tick-label" style="color:#AAFFDB">Air</span>
    <div class="pf-slider-wrap">
      <div class="pf-seg-track">
        <div class="pf-seg pf-seg--air" class:pf-seg--active={element === 'air'}></div>
        <div class="pf-seg pf-seg--fire" class:pf-seg--active={element === 'fire'}></div>
      </div>
      <input class="pf-slider" type="range" min="0" max="1" step="1" value={elemSliderVal} on:input={onElemSlider}
        style="--tc:{elemCur.color};--tg:{elemCur.glow}" />
      <div class="pf-dots">
        {#each ELEMENT_SLIDER as e}
          <div class="pf-dot" class:pf-dot--active={element === e} style="--dot-color:{ELEM_DATA[e].color}; --dot-glow:{ELEM_DATA[e].glow}"></div>
        {/each}
      </div>
    </div>
    <span class="pf-tick-label" style="color:#f97316">Fire</span>
  </div>

  <!-- Buff mode row -->
  <div class="pf-head" style="margin-top:6px">
    <span class="pf-title">Buff Mode</span>
    <span class="pf-badge" style="color:{buffCur.color}">{buffCur.icon} {buffCur.label}</span>
  </div>

  <div class="pf-btns">
    {#each BUFFMODE_SLIDER as m}
      <button
        class="pf-btn"
        class:pf-btn--active={buffMode === m}
        style="--btn-bg:{BUFF_DATA[m].bg}; --btn-border:{BUFF_DATA[m].border}; --btn-color:{BUFF_DATA[m].color}; --btn-glow:{BUFF_DATA[m].glow}"
        on:click={() => updateBuffMode(m)}
      >
        <span class="pf-btn-icon">{BUFF_DATA[m].icon}</span>
        <span class="pf-btn-label">{BUFF_DATA[m].label}</span>
      </button>
    {/each}
  </div>

  <div class="pf-track-row">
    <span class="pf-tick-label" style="color:#AAFFDB">Air</span>
    <div class="pf-slider-wrap">
      <div class="pf-seg-track">
        <div class="pf-seg pf-seg--air" class:pf-seg--active={buffMode === 'air'}></div>
        <div class="pf-seg pf-seg--both" class:pf-seg--active={buffMode === 'both'}></div>
        <div class="pf-seg pf-seg--fire" class:pf-seg--active={buffMode === 'fire'}></div>
      </div>
      <input class="pf-slider" type="range" min="0" max="2" step="1" value={buffSliderVal} on:input={onBuffSlider}
        style="--tc:{buffCur.color};--tg:{buffCur.glow}" />
      <div class="pf-dots">
        {#each BUFFMODE_SLIDER as m}
          <div class="pf-dot" class:pf-dot--active={buffMode === m} style="--dot-color:{BUFF_DATA[m].color}; --dot-glow:{BUFF_DATA[m].glow}"></div>
        {/each}
      </div>
    </div>
    <span class="pf-tick-label" style="color:#f97316">Fire</span>
  </div>

</div>

<style>
  .pf {
    margin-top: 8px; padding: 10px 12px; border-radius: 8px;
    border: 1px solid var(--border-c); background: var(--bg);
    display: flex; flex-direction: column; gap: 8px;
    transition: border-color 0.25s, background 0.25s;
    font-family: 'Trebuchet MS','Segoe UI',system-ui,sans-serif;
  }
  .pf-head { display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .pf-title { font-size:.6rem; text-transform:uppercase; letter-spacing:.16em; font-weight:700; color:var(--c); opacity:.7; }
  .pf-badge { font-size:.6rem; font-weight:700; }

  .pf-btns { display:flex; gap:5px; }
  .pf-btn {
    flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;
    padding:6px 4px; border-radius:7px;
    border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.03);
    color:#6b7066; font-family:inherit; cursor:pointer; transition:all .18s;
  }
  .pf-btn:hover { border-color:rgba(255,255,255,0.15); color:#a0a89a; }
  .pf-btn--active {
    font-weight:700; background:var(--btn-bg) !important;
    border-color:var(--btn-border) !important; color:var(--btn-color) !important;
    box-shadow: 0 0 8px var(--btn-glow);
  }
  .pf-btn-icon { font-size:.8rem; }
  .pf-btn-label { font-size:.6rem; text-transform:uppercase; letter-spacing:.1em; font-weight:700; }

  .pf-track-row { display:flex; align-items:center; gap:8px; }
  .pf-tick-label { font-size:.58rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; flex-shrink:0; opacity:.75; }
  .pf-slider-wrap { flex:1; position:relative; display:flex; flex-direction:column; gap:3px; }

  .pf-seg-track {
    position:absolute; top:50%; transform:translateY(calc(-50% - 5px));
    left:0; right:0; height:6px; border-radius:999px; overflow:hidden;
    display:flex; pointer-events:none; z-index:0;
  }
  .pf-seg { flex:1; opacity:.18; transition:opacity .2s; }
  .pf-seg--active { opacity:.8; }
  .pf-seg--air  { background:#AAFFDB; }
  .pf-seg--both { background:linear-gradient(90deg,#AAFFDB,#a78bfa,#f97316); }
  .pf-seg--fire { background:#f97316; }

  .pf-slider {
    -webkit-appearance:none; appearance:none;
    width:100%; height:6px; background:transparent; outline:none; cursor:pointer;
    position:relative; z-index:1;
  }
  .pf-slider::-webkit-slider-runnable-track { height:6px; border-radius:999px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); }
  .pf-slider::-moz-range-track { height:6px; border-radius:999px; background:rgba(255,255,255,0.05); }
  .pf-slider::-webkit-slider-thumb {
    -webkit-appearance:none; width:20px; height:20px; border-radius:50%;
    background:var(--tc,#AAFFDB); border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(170,255,219,0.4)), 0 2px 6px rgba(0,0,0,0.5);
    margin-top:-7px; cursor:grab; transition:background .2s, box-shadow .2s, transform .1s;
  }
  .pf-slider::-webkit-slider-thumb:active { cursor:grabbing; transform:scale(1.2); }
  .pf-slider::-moz-range-thumb {
    width:20px; height:20px; border-radius:50%;
    background:var(--tc,#AAFFDB); border:2px solid rgba(0,0,0,0.5);
    box-shadow:0 0 10px var(--tg,rgba(170,255,219,0.4)); cursor:grab; transition:background .2s, box-shadow .2s;
  }

  .pf-dots { display:flex; justify-content:space-between; padding:0 10px; pointer-events:none; }
  .pf-dot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,0.12); transition:background .2s, transform .2s, box-shadow .2s; }
  .pf-dot--active { transform:scale(1.5); background:var(--dot-color) !important; box-shadow: 0 0 5px var(--dot-glow); }
</style>
