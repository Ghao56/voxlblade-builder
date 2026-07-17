<script lang="ts">
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
<div class="modal-overlay" on:click|self={onclose}>
  <!-- svelte-ignore a11y-autofocus -->
  <div class="modal-box" role="dialog" aria-modal="true" tabindex="-1" on:keydown={trapFocus} use:focusOnOpen>
    <button class="modal-close" on:click={onclose} aria-label="Close modal">✕</button>
    <slot />
  </div>
</div>

<script context="module">
  function focusOnOpen(node) {
    requestAnimationFrame(() => {
      const first = node.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      first?.focus()
    })
  }
</script>

<style>
  .modal-overlay {
    position:fixed; inset:0; background:rgba(0,0,0,.72); z-index:var(--z-modal-backdrop);
    display:flex; align-items:center; justify-content:center;
    padding:16px; backdrop-filter:blur(4px);
    animation: fadeIn .15s ease;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .modal-box {
    background:var(--surface); border:1px solid var(--border-strong);
    border-radius:var(--radius); padding:24px; width:min(680px,100%);
    position:relative;
    animation: slideUp .18s ease;  max-height: 90vh;
    overflow-y: auto;
    scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent;
  }
  @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:translateY(0);opacity:1} }
  .modal-box::-webkit-scrollbar { width:5px; }
  .modal-box::-webkit-scrollbar-thumb { background:var(--border-strong); border-radius:3px; }
  .modal-close {
    position:absolute; top:14px; right:14px;
    background:var(--surface3); border:1px solid var(--border); border-radius:6px;
    color:var(--ink-muted); font-size:.8rem; width:28px; height:28px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:background .15s,color .15s;
  }
  .modal-close:hover { background:rgba(248,113,113,.15); color:var(--neg); }

  :global(.modal-list) { display:flex; flex-direction:column; gap:6px; max-height:500px; overflow-y:auto; padding-right:4px; scrollbar-width:thin; scrollbar-color:var(--border-strong) transparent; }
  :global(.modal-list::-webkit-scrollbar) { width:4px; }
  :global(.modal-list::-webkit-scrollbar-thumb) { background:var(--border-strong); border-radius:2px; }
  :global(.modal-list--compact) { gap:5px; }
  :global(.modal-item) {
    width:100%; text-align:left; background:var(--surface2);
    border:1px solid var(--border); border-radius:var(--radius-sm);
    color:var(--ink); font-family:var(--font-body); padding:12px 14px;
    cursor:pointer; display:flex; flex-direction:column; gap:4px;
    transition:background .12s,border-color .12s;
  }
  :global(.modal-item:hover) { background:var(--surface3); border-color:var(--border-strong); }
  :global(.modal-item--active) { border-color:var(--accent); background:rgba(74,222,128,.07); }
  :global(.modal-item--sm) { padding:9px 12px; }
  :global(.modal-item--inf) { border-color:var(--infusion-border); }
  :global(.modal-item--blade.modal-item--active) { border-color:var(--weapon-blade); background:rgba(251,146,60,.08); }
  :global(.modal-item--handle.modal-item--active) { border-color:var(--weapon-handle); background:rgba(52,211,153,.08); }
  :global(.modal-item--glove.modal-item--active) { border-color:var(--monk-glove); background:rgba(232,121,249,.08); }
  :global(.modal-item-head) { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
  :global(.modal-item-name) { font-size:.88rem; font-weight:600; color:var(--ink); }
  :global(.modal-item-desc) { font-size:.76rem; color:var(--ink-muted); line-height:1.4; }
  :global(.modal-item-stats) { display:flex; flex-wrap:wrap; gap:4px; margin-top:2px; }
  :global(.modal-stat-pill) { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.2); color:var(--accent); }
  :global(.modal-stat-pill.neg) { background:rgba(248,113,113,.1); border-color:rgba(248,113,113,.2); color:var(--neg); }
  :global(.modal-stat-pill--inf) { background:rgba(56,189,248,.1); border-color:rgba(56,189,248,.2); color:var(--infusion); }
  :global(.modal-perk-tag) { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.22); color:var(--accent2); width:fit-content; }
  :global(.modal-cd-badge) { font-size:.67rem; font-weight:700; padding:2px 7px; border-radius:999px; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.22); color:var(--weapon-handle); width:fit-content; }
  :global(.modal-tier-badge) { font-size:.62rem; font-weight:800; padding:2px 6px; border-radius:4px; background:rgba(251,146,60,.12); border:1px solid rgba(251,146,60,.25); color:var(--weapon-blade); }
  :global(.modal-tier-badge--handle) { background:rgba(52,211,153,.12); border-color:rgba(52,211,153,.25); color:var(--weapon-handle); }
  :global(.modal-tier-badge--glove) { background:rgba(232,121,249,.12); border-color:rgba(232,121,249,.25); color:var(--monk-glove); }
  :global(.modal-type-badge) { font-size:.62rem; padding:2px 6px; border-radius:4px; background:var(--surface3); color:var(--ink-muted); border:1px solid var(--border); }
  :global(.modal-type-badge--blade) { color:var(--weapon-blade); }
  :global(.modal-type-badge--handle) { color:var(--weapon-handle); }
  :global(.modal-rank-row) { display:flex; gap:6px; margin-top:4px; }
  :global(.rank-btn) { padding:4px 12px; border-radius:6px; border:1px solid var(--border); background:var(--surface3); color:var(--ink-muted); font-size:.75rem; font-weight:600; cursor:pointer; transition:all .12s; }
  :global(.rank-btn:hover) { border-color:rgba(74,222,128,.35); color:var(--accent); }
  :global(.rank-btn--active) { border-color:var(--accent); background:rgba(74,222,128,.12); color:var(--accent); }
  :global(.modal-filters) { display:flex; gap:8px; margin-bottom:12px; }
  :global(.modal-filter-sel) {
    flex:1; appearance:none; background:var(--surface2); border:1px solid var(--border-strong);
    border-radius:var(--radius-sm); color:var(--ink); font-family:var(--font-body);
    font-size:.8rem; padding:7px 26px 7px 10px; cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%234ade80' d='M1 1l4 4 4-4'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 8px center;
  }
  :global(.inf-label) { font-size:.6rem; color:var(--infusion); font-weight:600; opacity:.7; }

  @media (max-width: 640px) {
    :global(.modal-box) { padding:16px; max-height:94vh; }
    :global(.modal-list) { max-height:60vh; }
    :global(.modal-item) { padding:10px 12px; }
    :global(.modal-item-name) { font-size:.82rem; }
    :global(.modal-filters) { flex-direction:column; gap:6px; }
  }
</style>
