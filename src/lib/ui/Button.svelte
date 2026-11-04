<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'default',
    size = 'md',
    active = false,
    disabled = false,
    onclick,
    children,
  }: {
    variant?: 'default' | 'positive' | 'negative' | 'warning' | 'info' | 'neutral'
    size?: 'sm' | 'md' | 'lg'
    active?: boolean
    disabled?: boolean
    onclick?: () => void
    children?: Snippet
  } = $props()
</script>

<button
  class="ui-btn"
  class:ui-btn--positive={variant === 'positive'}
  class:ui-btn--negative={variant === 'negative'}
  class:ui-btn--warning={variant === 'warning'}
  class:ui-btn--info={variant === 'info'}
  class:ui-btn--neutral={variant === 'neutral'}
  class:ui-btn--sm={size === 'sm'}
  class:ui-btn--lg={size === 'lg'}
  class:ui-btn--active={active}
  {disabled}
  onclick={() => onclick?.()}
>
  {#if children}{@render children()}{/if}
</button>

<style>
  .ui-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface3);
    color: var(--ink-muted);
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: var(--weight-bold);
    letter-spacing: 0.02em;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color var(--duration-fast) var(--ease-out), border-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out), opacity var(--duration-fast) var(--ease-out);
  }
  .ui-btn:hover {
    background: var(--surface4);
    border-color: var(--border-hover);
    color: var(--ink);
  }
  .ui-btn:active {
    transform: scale(0.97);
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-btn:active { transform: none; }
  }
  .ui-btn:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .ui-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Sizes */
  .ui-btn--sm {
    padding: var(--space-0-5) var(--space-2);
    font-size: var(--text-2xs);
  }
  .ui-btn--lg {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm-plus);
  }

  /* Variants */
  .ui-btn--positive {
    background: rgba(74,222,128,0.08);
    border-color: rgba(74,222,128,0.25);
    color: var(--accent);
  }
  .ui-btn--positive:hover {
    background: rgba(74,222,128,0.18);
    border-color: rgba(74,222,128,0.5);
  }
  .ui-btn--positive.ui-btn--active {
    background: rgba(74,222,128,0.18);
    border-color: rgba(74,222,128,0.55);
  }

  .ui-btn--negative {
    background: rgba(248,113,113,0.08);
    border-color: rgba(248,113,113,0.25);
    color: var(--neg);
  }
  .ui-btn--negative:hover {
    background: rgba(248,113,113,0.18);
    border-color: rgba(248,113,113,0.5);
  }
  .ui-btn--negative.ui-btn--active {
    background: rgba(248,113,113,0.18);
    border-color: rgba(248,113,113,0.55);
  }

  .ui-btn--warning {
    background: rgba(245,158,11,0.08);
    border-color: rgba(245,158,11,0.25);
    color: var(--accent2);
  }
  .ui-btn--warning:hover {
    background: rgba(245,158,11,0.18);
    border-color: rgba(245,158,11,0.5);
  }
  .ui-btn--warning.ui-btn--active {
    background: rgba(245,158,11,0.18);
    border-color: rgba(245,158,11,0.55);
  }

  .ui-btn--info {
    background: rgba(56,189,248,0.08);
    border-color: rgba(56,189,248,0.2);
    color: var(--infusion);
  }
  .ui-btn--info:hover {
    background: rgba(56,189,248,0.18);
    border-color: rgba(56,189,248,0.45);
  }
  .ui-btn--info.ui-btn--active {
    background: rgba(56,189,248,0.18);
    border-color: rgba(56,189,248,0.55);
  }

  .ui-btn--neutral {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.12);
    color: var(--ink-muted);
  }
  .ui-btn--neutral:hover {
    background: rgba(255,255,255,0.1);
    border-color: rgba(255,255,255,0.2);
    color: var(--ink);
  }
</style>
