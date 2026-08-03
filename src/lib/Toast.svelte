<script lang="ts">
  import { toasts, removeToast } from './stores/toast'
  import { fly } from 'svelte/transition'

  let { offsetTop = 16 }: { offsetTop?: number } = $props()

  const typeStyles: Record<string, string> = {
    success: 'border-color: rgba(74,222,128,0.3); background: rgba(74,222,128,0.06); color: var(--accent);',
    error: 'border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.06); color: #f87171;',
    info: 'border-color: rgba(56,189,248,0.25); background: rgba(56,189,248,0.05); color: #38bdf8;',
    warning: 'border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.05); color: #fbbf24;',
  }

  const typeIcons: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  }
</script>

<div class="toast-container" style="top:{offsetTop}px">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      style={typeStyles[toast.type]}
      role="alert"
      aria-live="polite"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <span class="toast-icon">{typeIcons[toast.type]}</span>
      <span class="toast-msg">{toast.message}</span>
      <button class="toast-close" onclick={() => removeToast(toast.id)} aria-label="Dismiss">&times;</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    right: 16px;
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 380px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid;
    font-size: .8rem;
    font-weight: 600;
    line-height: 1.3;
    pointer-events: auto;
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    box-shadow:
      0 4px 20px rgba(0,0,0,0.35),
      0 0 0 1px rgba(255,255,255,0.03);
    transition: all var(--transition-fast);
  }

  .toast:hover {
    transform: translateX(-4px);
  }

  .toast-icon {
    font-size: .85rem;
    font-weight: 800;
    opacity: .8;
    flex-shrink: 0;
  }

  .toast-msg {
    flex: 1;
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    opacity: .4;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity var(--transition-fast);
  }
  .toast-close:hover { opacity: 1; }

  @media (max-width: 640px) {
    .toast-container { left: 16px; right: 16px; max-width: unset; }
  }
</style>