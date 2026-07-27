<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte'
  import BuildSaves from '../BuildSaves.svelte'

  export let activeAppTab: 'overview' | 'analyze' = 'overview'

  const dispatch = createEventDispatcher<{ switchTab: 'overview' | 'analyze' }>()

  let tabOverview: HTMLButtonElement
  let tabAnalyze: HTMLButtonElement
  let bubbleEl: HTMLDivElement
  let bubbleX = 0
  let bubbleW = 0

  async function updateBubble(animated = true) {
    await tick()
    const target = activeAppTab === 'overview' ? tabOverview : tabAnalyze
    if (!target) return
    const parentRect = target.parentElement!.getBoundingClientRect()
    const rect = target.getBoundingClientRect()
    bubbleX = rect.left - parentRect.left
    bubbleW = rect.width
    if (animated && bubbleEl) {
      bubbleEl.classList.add('is-moving')
      bubbleEl.addEventListener('transitionend', () => {
        bubbleEl.classList.remove('is-moving')
      }, { once: true })
    }
  }

  import { onMount, onDestroy } from 'svelte'
  let cleanupKeydown: (() => void) | undefined
  onMount(() => {
    updateBubble(false)
    window.addEventListener('resize', () => updateBubble(false))
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        e.preventDefault()
        dispatch('switchTab', activeAppTab === 'overview' ? 'analyze' : 'overview')
      }
    }
    window.addEventListener('keydown', handleKeydown)
    cleanupKeydown = () => window.removeEventListener('keydown', handleKeydown)
  })
  onDestroy(() => { cleanupKeydown?.() })

  $: if (activeAppTab) updateBubble(true)
</script>

<header>
  <div class="header-bg"></div>
  <div class="header-content">
    <h1>Voxl<span class="accent">Builder</span></h1>
    <div class="header-right">
      <span class="header-hint">Click any cell to edit · Click ✦ to enchant</span>
    </div>
  </div>
</header>

<BuildSaves />

<div class="app-tabs">
  <div bind:this={bubbleEl} class="tab-bubble" class:tab-bubble--analyze={activeAppTab === 'analyze'} style="transform: translateX({bubbleX}px); width: {bubbleW}px;"></div>
  <button bind:this={tabOverview} class="app-tab" class:app-tab--active={activeAppTab === 'overview'} on:click={() => dispatch('switchTab', 'overview')}>Overview</button>
  <button bind:this={tabAnalyze} class="app-tab app-tab--analyze" class:app-tab--active={activeAppTab === 'analyze'} on:click={() => dispatch('switchTab', 'analyze')}>Analyze</button>
</div>

<style>
  header {
    position: relative;
    border-radius: 20px;
    border: 1px solid var(--glass-border);
    margin-bottom: 16px;
    overflow: hidden;
  }
  .header-bg {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, #0d100e 0%, #141815 50%, #0f1310 100%);
  }
  .header-bg::before {
    content: "";
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 85% -10%, rgba(74,222,128,0.08) 0%, transparent 55%),
      radial-gradient(ellipse at 15% 110%, rgba(245,158,11,0.05) 0%, transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(167,139,250,0.03) 0%, transparent 70%);
    pointer-events: none;
  }
  .header-bg::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 50%);
    pointer-events: none;
  }
  .header-content {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 24px 32px;
    z-index: 1;
  }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(1.8rem, 4vw, 3rem);
    font-weight: 400;
    letter-spacing: -.02em;
    margin: 0;
    color: var(--ink);
  }
  .accent {
    color: var(--accent);
    text-shadow: 0 0 30px rgba(74,222,128,0.2);
  }
  .header-hint {
    font-size: .72rem;
    color: var(--ink-muted);
    letter-spacing: .1em;
    text-transform: uppercase;
    opacity: .5;
  }

  .app-tabs {
    position: relative;
    display: flex;
    padding: 4px;
    border-radius: 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    width: fit-content;
    overflow: hidden;
  }
  .tab-bubble {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 0;
    border-radius: 8px;
    z-index: 0;
    pointer-events: none;
    border: 1px solid rgba(74,222,128,0.22);
    background: linear-gradient(180deg, rgba(74,222,128,0.12), rgba(74,222,128,0.05));
    box-shadow: 0 0 16px rgba(74,222,128,0.12), inset 0 1px 0 rgba(255,255,255,0.04);
    transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1), width 0.42s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .tab-bubble--analyze {
    border-color: rgba(226,178,3,0.28);
    background: linear-gradient(180deg, rgba(226,178,3,0.12), rgba(226,178,3,0.05));
    box-shadow: 0 0 16px rgba(226,178,3,0.1), inset 0 1px 0 rgba(255,255,255,0.04);
  }
  .app-tab {
    position: relative;
    z-index: 1;
    border: none;
    background: transparent;
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
    color: var(--ink-muted);
    font-size: .78rem;
    font-weight: 700;
    letter-spacing: .05em;
    text-transform: uppercase;
    transition: color var(--transition-fast), transform var(--transition-fast);
  }
  .app-tab:hover { color: var(--ink); transform: translateY(-1px); }
  .app-tab--active { color: var(--accent); }
  .app-tab--analyze.app-tab--active { color: #e2b203; }

  @keyframes bubbleSquish {
    0% { scale: 1 1; }
    50% { scale: 0.82 1.08; }
    100% { scale: 1 1; }
  }

  @media (max-width:640px) {
    .header-content { flex-direction: column; align-items: flex-start; gap: 6px; padding: 18px 22px; }
    .header-hint { display: none; }
    .app-tab { padding: 8px 16px; font-size: .75rem; min-height: 40px; }
  }
  @media (max-width:480px) {
    h1 { font-size: 1.5rem; }
    .header-content { padding: 16px 20px; }
    .app-tab { padding: 7px 14px; font-size: .72rem; min-height: 38px; }
  }
</style>