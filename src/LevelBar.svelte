<script lang="ts">
  import { tick } from 'svelte'
  import { build } from './lib/store'

  // ── Props ─────────────────────────────────────────────────────────────────
  export let protection: number = 0
  export let hpThreshold: number | undefined = undefined

  const BASE_HP      = 120
  const HP_PER_LEVEL = 0.0125

  // ── Storage keys ─────────────────────────────────────────────────────────
  const STORAGE_KEY = 'voxlbuilder_level'
  const HP_FILL_KEY = 'voxlbuilder_hpfill'

  // ── Single Source of Truth (Reactive States trực tiếp từ Store) ───────────
  $: level = $build.level ?? 80
  $: fillPct = $build.hpFill ?? 100

  let editing  = false
  let inputVal = String(level)
  let inputEl: HTMLInputElement

  function saveLevel(v: number) {
    build.update(s => ({ ...s, level: v }))
    try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
  }

  async function startEdit() {
    editing  = true
    inputVal = String(level)
    await tick()
    inputEl?.select()
  }

  function confirmEdit() {
    const n = parseInt(inputVal)
    if (!isNaN(n) && n >= 0 && n <= 80) saveLevel(n)
    editing = false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter')     confirmEdit()
    if (e.key === 'Escape')    editing = false
    if (e.key === 'ArrowUp')   inputVal = String(Math.min(80, (parseInt(inputVal) || level) + 1))
    if (e.key === 'ArrowDown') inputVal = String(Math.max(0,   (parseInt(inputVal) || level) - 1))
  }

  // ── HP Derived (Tính toán tự động dựa trên phản ứng) ─────────────────────
  $: baseMaxHP = Math.round(BASE_HP * (1 + level * HP_PER_LEVEL))
  $: protRounded = Math.round(protection * 100) / 100
  $: HP_FLOOR = Math.round(baseMaxHP * 0.1)

  $: effectiveMaxHP = protRounded >= 0
    ? baseMaxHP
    : Math.max(HP_FLOOR, baseMaxHP + protRounded)

  $: effectiveProt = protRounded >= 0
    ? protRounded
    : Math.round((-(baseMaxHP - effectiveMaxHP)) * 100) / 100

  $: shieldCount = protRounded > 0 ? protRounded : 0
  $: shieldFrac  = shieldCount > 0 ? Math.min(1, shieldCount / baseMaxHP) : 0
  $: lostFrac    = protRounded < 0 ? Math.min(1, Math.abs(protRounded) / baseMaxHP) : 0

  let dragging = false
  let barEl: HTMLDivElement

  function saveFill(v: number) {
    build.update(s => ({ ...s, hpFill: v }))
    try { localStorage.setItem(HP_FILL_KEY, String(v)) } catch {}
  }

  function calcFillFromMouse(e: MouseEvent): number {
    if (!barEl) return fillPct
    const rect = barEl.getBoundingClientRect()
    const validEnd = rect.left + rect.width * (effectiveMaxHP / baseMaxHP)
    const clampedX = Math.max(rect.left, Math.min(e.clientX, validEnd))
    const frac = (clampedX - rect.left) / (rect.width * (effectiveMaxHP / baseMaxHP))
    return Math.round(Math.max(0, Math.min(1, frac)) * 100)
  }

  function onBarMouseDown(e: MouseEvent) { 
    dragging = true
    saveFill(calcFillFromMouse(e)) 
  }
  function onMouseMove(e: MouseEvent) { 
    if (dragging) saveFill(calcFillFromMouse(e)) 
  }
  function onMouseUp() { 
    dragging = false 
  }

  // ── Display helpers ───────────────────────────────────────────────────────
  $: currentHP = Math.round(effectiveMaxHP * fillPct / 100)
  $: fillFrac  = (effectiveMaxHP / baseMaxHP) * (fillPct / 100)
  $: thumbPos  = fillFrac * 100
  $: thresholdFrac = hpThreshold != null ? (effectiveMaxHP / baseMaxHP) * (hpThreshold / 100) : 0

  // Đưa logic màu sắc/glow thành biến đơn giản để gán vào CSS Variable
  $: barColor = fillPct > 50 ? '#4ade80' : fillPct > 25 ? '#facc15' : '#f87171'
  $: barGlow  = fillPct > 50 ? 'rgba(74,222,128,0.5)' : fillPct > 25 ? 'rgba(250,204,21,0.5)' : 'rgba(248,113,113,0.5)'
</script>

<svelte:window on:mousemove={onMouseMove} on:mouseup={onMouseUp} />

<div class="lb-wrap" style="--bar-color: {barColor}; --bar-glow: {barGlow};">

  <div class="lb-lv-block">
    <span class="lb-lv-label">LV</span>
    {#if editing}
      <input
        class="lb-lv-input"
        type="number" min="0" max="80"
        bind:value={inputVal}
        bind:this={inputEl}
        on:blur={confirmEdit}
        on:keydown={onKeydown}
      />
    {:else}
      <button class="lb-lv-num" on:click={startEdit} title="Click to edit level">
        {level}
      </button>
    {/if}
  </div>

  <div class="lb-bar-col">

    <div class="lb-bar-label-row">
      <span class="lb-bar-label">HP</span>
      <span class="lb-hp-nums">
        <span class="lb-hp-cur">{currentHP}</span>
        <span class="lb-hp-sep">/</span>
        <span class="lb-hp-max">{effectiveMaxHP}</span>
        {#if effectiveProt !== 0}
          <span class="lb-prot-badge"
            class:lb-prot-badge--pos={effectiveProt > 0}
            class:lb-prot-badge--neg={effectiveProt < 0}>
            {effectiveProt > 0 ? `🛡 +${effectiveProt}` : `⚠ ${effectiveProt}`}
          </span>
        {/if}
      </span>
    </div>

    <div
      class="lb-bar-track"
      role="slider"
      aria-label="HP Fill Bar"
      aria-valuenow={fillPct}
      aria-valuemin="0"
      aria-valuemax="100"
      bind:this={barEl}
      on:mousedown={onBarMouseDown}
      title="Drag to set current HP · {baseMaxHP} base HP at LV{level}"
      tabindex="0"
    >
      {#if lostFrac > 0}
        <div class="lb-bar-lost" style="width:{lostFrac * 100}%"></div>
      {/if}

      <div class="lb-bar-fill" style="width:{fillFrac * 100}%">
        <div class="lb-bar-shine"></div>
      </div>

      {#if shieldFrac > 0}
        <div class="lb-bar-shield" style="width:{shieldFrac * 100}%">
          <div class="lb-shield-shimmer"></div>
        </div>
      {/if}

      <div class="lb-bar-notches">
        {#each Array(9) as _, i}
          <div class="lb-notch" style="left:{(i + 1) * 10}%"></div>
        {/each}
      </div>

      {#if hpThreshold != null && thresholdFrac > 0 && thresholdFrac < 1}
        <div class="lb-threshold-line" style="left:{thresholdFrac * 100}%" title="HP threshold: {hpThreshold}%"></div>
      {/if}

      {#if fillFrac > 0.01 && fillFrac < 0.99}
        <div class="lb-thumb" style="left:{thumbPos}%"></div>
      {/if}
    </div>
  </div>
</div>

<style>
  .lb-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
  }

  /* ── LV block ── */
  .lb-lv-block {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(74,222,128,0.08);
    border: 1px solid rgba(74,222,128,0.28);
    border-radius: 7px;
    padding: 3px 8px 3px 7px;
    flex-shrink: 0;
  }
  .lb-lv-label {
    font-size: .55rem;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: #4ade80;
    opacity: .7;
  }
  .lb-lv-num {
    font-family: 'Courier New', 'Lucida Console', monospace;
    font-size: .95rem;
    font-weight: 800;
    color: #4ade80;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    min-width: 28px;
    text-align: center;
    line-height: 1;
    letter-spacing: .04em;
    transition: color .12s, text-shadow .12s;
    text-shadow: 0 0 8px rgba(74,222,128,0.6);
  }
  .lb-lv-num:hover {
    color: #86efac;
    text-shadow: 0 0 12px rgba(74,222,128,0.9);
  }
  .lb-lv-input {
    font-family: 'Courier New', monospace;
    font-size: .9rem;
    font-weight: 800;
    color: #4ade80;
    background: rgba(74,222,128,0.1);
    border: 1px solid rgba(74,222,128,0.4);
    border-radius: 4px;
    width: 44px;
    text-align: center;
    padding: 1px 3px;
    outline: none;
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .lb-lv-input::-webkit-inner-spin-button,
  .lb-lv-input::-webkit-outer-spin-button { -webkit-appearance: none; }

  /* ── Bar column ── */
  .lb-bar-col {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 120px;
    max-width: 280px;
  }
  .lb-bar-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .lb-bar-label {
    font-size: .52rem;
    font-weight: 800;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: #8a8d85;
    flex-shrink: 0;
  }
  .lb-hp-nums {
    display: flex;
    align-items: center;
    gap: 3px;
    font-family: 'Courier New', monospace;
    font-size: .68rem;
    font-weight: 800;
  }
  .lb-hp-cur  { 
    color: var(--bar-color);
    transition: color .2s; 
  }
  .lb-hp-sep  { color: rgba(138,141,133,0.35); }
  .lb-hp-max  { color: #8a8d85; }

  .lb-prot-badge {
    font-size: .56rem;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 80px;
    margin-left: 4px;
    white-space: nowrap;
  }
  .lb-prot-badge--pos {
    background: rgba(56,189,248,0.14);
    border: 1px solid rgba(56,189,248,0.35);
    color: #38bdf8;
  }
  .lb-prot-badge--neg {
    background: rgba(248,113,113,0.12);
    border: 1px solid rgba(248,113,113,0.3);
    color: #f87171;
  }

  /* ── Bar track ── */
  .lb-bar-track {
    position: relative;
    height: 14px;
    width: 150px;
    border-radius: 3px;
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.1);
    cursor: ew-resize;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(0,0,0,0.6),
      inset 0 -1px 0 rgba(255,255,255,0.06);
  }

  /* ① Lost zone */
  .lb-bar-lost {
    position: absolute;
    right: 0; top: 0; bottom: 0;
    background: rgb(248 113 113);
    border-left: 1.5px solid rgb(248 113 113);
    z-index: 0;
    overflow: hidden;
  }

  /* ② HP fill — Tối ưu hóa render màu qua biến CSS */
  .lb-bar-fill {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    border-radius: 2px 0 0 2px;
    min-width: 0;
    overflow: hidden;
    z-index: 2;
    filter: saturate(1.15) brightness(1.05);
    background: var(--bar-color);
    box-shadow: 0 0 8px var(--bar-glow), inset 0 1px 0 rgba(255,255,255,0.22);
  }

  /* ③ Shield overlay */
  .lb-bar-shield {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: rgba(56,189,248);
    border-right: 2px solid rgba(56,189,248);
    z-index: 3;
    overflow: hidden;
    pointer-events: none;
  }

  .lb-bar-shine {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(to bottom, rgba(255,255,255,0.26), transparent);
    border-radius: 2px 2px 0 0;
  }
  
  .lb-shield-shimmer {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12), transparent 100%);
    animation: shieldShimmer 2.6s ease-in-out infinite;
  }
  
  @keyframes shieldShimmer {
    0%   { transform: translateX(-100%); }
    55%  { transform: translateX(120%); }
    100% { transform: translateX(120%); }
  }

  /* Notches */
  .lb-bar-notches {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 4;
  }
  .lb-notch {
    position: absolute;
    top: 0; bottom: 0;
    width: 1px;
    background: rgba(0,0,0,0.28);
    transform: translateX(-50%);
  }

  /* Threshold line */
  .lb-threshold-line {
    position: absolute;
    top: 0; bottom: 0;
    width: 2px;
    background: rgba(251,191,36,0.85);
    transform: translateX(-50%);
    z-index: 6;
    pointer-events: none;
    box-shadow: 0 0 6px rgba(251,191,36,0.6);
  }

  /* Drag thumb */
  .lb-thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 20px;
    border-radius: 2px;
    background: rgba(13,15,14,0.92);
    border: 1.5px solid var(--bar-color);
    box-shadow: 0 0 6px var(--bar-glow);
    z-index: 5;
    pointer-events: none;
    transition: box-shadow .2s;
  }
</style>