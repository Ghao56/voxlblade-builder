<script lang="ts">
  import { fade, fly } from 'svelte/transition'

  export let onclose: () => void

  function trapFocus(e: KeyboardEvent) {
    if (e.key !== 'Tab') return
    const box = e.currentTarget as HTMLElement
    const focusable = box.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) { e.preventDefault(); return }
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus()
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div class="modal-overlay" transition:fade={{ duration: 200 }} on:click|self={onclose}>
  <!-- svelte-ignore a11y-autofocus -->
  <div class="modal-box" transition:fly={{ y: 16, duration: 250, easing: t => 1 - Math.pow(1 - t, 3) }} role="dialog" aria-modal="true" tabindex="-1" on:keydown={trapFocus} use:focusOnOpen>
    <button class="modal-close" on:click={onclose} aria-label="Close modal">✕</button>
    <slot />
  </div>
</div>

<script context="module">
  function focusOnOpen(node) {
    requestAnimationFrame(() => {
      const first = node.querySelector<HTMLElement>('button:not(.modal-close), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      first?.focus()
    })
  }
</script>

<style>
  .modal-overlay {
    position:fixed; inset:0;
    background:rgba(0,0,0,0.6);
    backdrop-filter: blur(12px) saturate(1.3);
    -webkit-backdrop-filter: blur(12px) saturate(1.3);
    z-index:var(--z-modal-backdrop);
    display:flex; align-items:center; justify-content:center;
    padding:16px;
  }
  .modal-box {
    background: linear-gradient(180deg, var(--surface2) 0%, var(--surface) 100%);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius);
    padding: 24px;
    width: min(680px, 100%);
    position: relative;
    max-height: 90vh;
    overflow-y: auto;
    overflow-x: hidden;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.03),
      0 8px 40px rgba(0,0,0,0.5),
      0 0 80px rgba(74,222,128,0.03);
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }
  .modal-box::-webkit-scrollbar { width: 5px; }
  .modal-box::-webkit-scrollbar-track { background: transparent; }
  .modal-box::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
  .modal-box::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
  .modal-close {
    position:absolute; top:14px; right:14px;
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: var(--radius-xs);
    color: var(--ink-muted);
    font-size: .8rem;
    width: 28px; height: 28px;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all var(--transition-fast);
    z-index: 2;
  }
  .modal-close:hover {
    background: rgba(248,113,113,0.12);
    color: var(--neg);
    border-color: rgba(248,113,113,0.3);
  }

  :global(.modal-list) {
    display: flex; flex-direction: column; gap: 6px;
    max-height: 500px; overflow-y: auto;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.08) transparent;
  }
  :global(.modal-list::-webkit-scrollbar) { width: 4px; }
  :global(.modal-list::-webkit-scrollbar-track) { background: transparent; }
  :global(.modal-list::-webkit-scrollbar-thumb) { background: rgba(255,255,255,0.08); border-radius: 2px; }
  :global(.modal-list--compact) { gap: 5px; }
  :global(.modal-item) {
    width: 100%; text-align: left;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--ink);
    font-family: var(--font-body);
    padding: 12px 14px;
    cursor: pointer;
    display: flex; flex-direction: column; gap: 4px;
    transition: all var(--transition-fast);
  }
  :global(.modal-item:hover) {
    background: var(--surface3);
    border-color: var(--border-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }
  :global(.modal-item--active) {
    border-color: var(--accent);
    background: rgba(74,222,128,0.06);
    box-shadow: 0 0 0 1px rgba(74,222,128,0.12);
  }
  :global(.modal-item--sm) { padding: 9px 12px; }
  :global(.modal-item--inf) { border-color: var(--infusion-border); }
  :global(.modal-item--blade.modal-item--active) {
    border-color: var(--weapon-blade);
    background: rgba(251,146,60,0.06);
    box-shadow: 0 0 0 1px rgba(251,146,60,0.12);
  }
  :global(.modal-item--handle.modal-item--active) {
    border-color: var(--weapon-handle);
    background: rgba(52,211,153,0.06);
    box-shadow: 0 0 0 1px rgba(52,211,153,0.12);
  }
  :global(.modal-item--glove.modal-item--active) {
    border-color: var(--monk-glove);
    background: rgba(232,121,249,0.06);
    box-shadow: 0 0 0 1px rgba(232,121,249,0.12);
  }
  :global(.modal-item-head) { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  :global(.modal-item-name) { font-size:.88rem; font-weight:600; color:var(--ink); }
  :global(.modal-item-desc) { font-size:.76rem; color:var(--ink-muted); line-height:1.4; }
  :global(.modal-item-stats) { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
  :global(.modal-stat-pill) {
    font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px;
    background:rgba(74,222,128,0.08); border:1px solid rgba(74,222,128,0.15);
    color:var(--accent);
    transition: all var(--transition-fast);
  }
  :global(.modal-stat-pill:hover) {
    background: rgba(74,222,128,0.14);
    border-color: rgba(74,222,128,0.25);
  }
  :global(.modal-stat-pill.neg) {
    background: rgba(248,113,113,0.08); border-color: rgba(248,113,113,0.15); color: var(--neg);
  }
  :global(.modal-stat-pill--inf) {
    background: rgba(56,189,248,0.08); border-color: rgba(56,189,248,0.15); color: var(--infusion);
  }
  :global(.modal-perk-tag) {
    font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px;
    background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.18);
    color:var(--accent2); width:fit-content;
  }
  :global(.modal-rank-row) { display:flex; gap:6px; margin-top:4px; }
  :global(.rank-btn) {
    padding:4px 12px; border-radius:var(--radius-xs);
    border:1px solid var(--border); background:var(--surface3);
    color:var(--ink-muted); font-size:.75rem; font-weight:600;
    cursor:pointer; transition:all var(--transition-fast);
  }
  :global(.rank-btn:hover) { border-color:rgba(74,222,128,0.3); color:var(--accent); }
  :global(.rank-btn--active) {
    border-color:var(--accent); background:rgba(74,222,128,0.1);
    color:var(--accent);
  }
  :global(.modal-filters) { display:flex; gap:8px; margin-bottom:12px; }
  :global(.modal-filter-sel) {
    flex:1; appearance:none;
    background:var(--surface2); border:1px solid var(--border-strong);
    border-radius:var(--radius-sm); color:var(--ink);
    font-family:var(--font-body);
    font-size:.8rem; padding:7px 26px 7px 10px; cursor:pointer;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 8px center;
  }
  :global(.modal-filter-sel:focus) {
    border-color: rgba(74,222,128,0.4);
    box-shadow: 0 0 0 2px rgba(74,222,128,0.08);
    outline: none;
  }
  :global(.inf-label) { font-size:.6rem; color:var(--infusion); font-weight:600; opacity:.7; }

  @media (max-width: 640px) {
    :global(.modal-box) { padding: 16px; max-height: 94vh; }
    :global(.modal-list) { max-height: 60vh; }
    :global(.modal-item) { padding: 10px 12px; }
    :global(.modal-item-name) { font-size: .82rem; }
    :global(.modal-filters) { flex-direction: column; gap: 6px; }
  }
</style>