<script lang="ts">
  import { toasts, removeToast } from './stores/toast'
  import { fly } from 'svelte/transition'

  const typeStyles: Record<string, string> = {
    success: 'border-color: rgba(74,222,128,.35); background: rgba(74,222,128,.08); color: var(--accent);',
    error: 'border-color: rgba(248,113,113,.35); background: rgba(248,113,113,.08); color: #f87171;',
    info: 'border-color: rgba(56,189,248,.3); background: rgba(56,189,248,.06); color: #38bdf8;',
    warning: 'border-color: rgba(251,191,36,.3); background: rgba(251,191,36,.06); color: #fbbf24;',
  }
</script>

<div class="toast-container">
  {#each $toasts as toast (toast.id)}
    <div
      class="toast toast--{toast.type}"
      style={typeStyles[toast.type]}
      role="alert"
      aria-live="polite"
      transition:fly={{ x: 300, duration: 300 }}
    >
      <span class="toast-msg">{toast.message}</span>
      <button class="toast-close" on:click={() => removeToast(toast.id)} aria-label="Dismiss">&times;</button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: var(--z-toast);
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 360px;
    pointer-events: none;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid;
    font-size: .78rem;
    font-weight: 600;
    line-height: 1.3;
    pointer-events: auto;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0,0,0,.3);
  }

  .toast-msg {
    flex: 1;
  }

  .toast-close {
    background: none;
    border: none;
    color: inherit;
    opacity: .5;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0;
    line-height: 1;
    flex-shrink: 0;
  }
  .toast-close:hover { opacity: 1; }

  @media (max-width: 640px) {
    .toast-container { left: 12px; right: 12px; max-width: unset; }
  }
</style>
