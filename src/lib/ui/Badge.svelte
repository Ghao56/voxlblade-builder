<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'default',
    size = 'md',
    color,
    square = false,
    solid = false,
    mono = false,
    tag = false,
    title,
    class: className,
    children,
  }: {
    variant?: 'default' | 'green' | 'amber' | 'red' | 'purple' | 'blue' | 'teal' | 'muted' | 'draco'
    size?: 'xs' | 'sm' | 'md'
    color?: string
    square?: boolean
    solid?: boolean
    mono?: boolean
    tag?: boolean
    title?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<span
  class="ui-badge {className ?? ''}"
  class:ui-badge--green={variant === 'green'}
  class:ui-badge--amber={variant === 'amber'}
  class:ui-badge--red={variant === 'red'}
  class:ui-badge--purple={variant === 'purple'}
  class:ui-badge--blue={variant === 'blue'}
  class:ui-badge--teal={variant === 'teal'}
  class:ui-badge--muted={variant === 'muted'}
  class:ui-badge--draco={variant === 'draco'}
  class:ui-badge--xs={size === 'xs'}
  class:ui-badge--sm={size === 'sm'}
  class:ui-badge--square={square}
  class:ui-badge--solid={solid}
  class:ui-badge--mono={mono}
  class:ui-badge--tag={tag}
  style:background={color ? (solid ? color : `${color}1e`) : undefined}
  style:border-color={color ? (solid ? 'transparent' : `${color}40`) : undefined}
  style:color={color ? (solid ? '#000' : color) : undefined}
  {title}
>
  {#if children}{@render children()}{/if}
</span>

<style>
  .ui-badge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    gap: var(--space-1);
    padding: var(--space-0-5) var(--space-2);
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    line-height: var(--leading-none);
    white-space: nowrap;
    border: 1px solid var(--border);
    background: var(--surface3);
    color: var(--ink-muted);
    flex-shrink: 0;
    transition: background var(--duration-fast) var(--ease-out),
                border-color var(--duration-fast) var(--ease-out);
  }

  .ui-badge--xs {
    padding: 1px var(--space-1-5);
    font-size: var(--text-2xs);
  }
  .ui-badge--sm {
    padding: 1px var(--space-2);
    font-size: var(--text-2xs);
  }

  .ui-badge--square {
    border-radius: var(--radius-xs);
  }

  .ui-badge--solid {
    border-color: transparent;
  }

  .ui-badge--mono {
    font-family: var(--font-mono);
  }

  .ui-badge--tag {
    border: none;
    padding: 0 var(--space-1);
    font-size: var(--text-3xs, 0.6rem);
    font-weight: var(--weight-semibold, 600);
    opacity: 0.7;
  }

  .ui-badge--green {
    background: rgba(74,222,128,0.12);
    border-color: rgba(74,222,128,0.25);
    color: var(--accent);
  }
  .ui-badge--amber {
    background: rgba(245,158,11,0.12);
    border-color: rgba(245,158,11,0.25);
    color: var(--accent2);
  }
  .ui-badge--red {
    background: rgba(248,113,113,0.12);
    border-color: rgba(248,113,113,0.25);
    color: var(--neg);
  }
  .ui-badge--purple {
    background: rgba(167,139,250,0.12);
    border-color: rgba(167,139,250,0.25);
    color: var(--accent3);
  }
  .ui-badge--blue {
    background: rgba(56,189,248,0.12);
    border-color: rgba(56,189,248,0.25);
    color: var(--infusion);
  }
  .ui-badge--teal {
    background: rgba(52,211,153,0.12);
    border-color: rgba(52,211,153,0.25);
    color: var(--weapon-handle);
  }
  .ui-badge--muted {
    background: rgba(255,255,255,0.04);
    border-color: rgba(255,255,255,0.07);
    color: var(--ink-muted);
  }
  .ui-badge--draco {
    background: rgba(var(--draco-primary-rgb), 0.12);
    border-color: rgba(var(--draco-primary-rgb), 0.25);
    color: var(--draco-text);
  }
</style>
