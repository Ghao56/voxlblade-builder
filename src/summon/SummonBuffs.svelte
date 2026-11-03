<script lang="ts">
  // APPLIED BUFFS — own titled block (owner request 2026-11): buff toggles
  // were rendered inside Swarm Total with no header of their own. Same
  // interactive chips: key `source::name` at DamageAnalyzer level, clicked to
  // include/exclude the buff from the damage mult chain. This IS a real
  // control: background + border flip with state, aria-pressed, keyboard
  // focusable (native button).
  import type { SummonPanelVM } from '../lib/summonView'
  import { BUFF_DEFS } from '../data/BuffData'

  export let vm: SummonPanelVM
  /** (buffName) — toggle, key `source::name` handled in DamageAnalyzer */
  export let onToggleBuff: (buffName: string) => void = () => {}

  const colorOf = (name: string): string => BUFF_DEFS[name]?.color ?? 'var(--sum-accent, #c084fc)'
</script>

{#if vm.buffs.length}
  <div class="sbf-buffs">
    <div class="sbf-block-label">Applied Buffs</div>
    <div class="sbf-row">
      {#each vm.buffs as b (vm.source + '::' + b.name)}
        <button
          class="sbf-badge"
          class:sbf-badge--off={!b.active}
          style="--bcolor:{colorOf(b.name)}"
          aria-pressed={b.active}
          title={b.affectsDamage ? 'Feeds the damage mult chain (calcSummonBuffDmgMult)' : 'Display buff, not part of the damage chain'}
          on:click={() => onToggleBuff(b.name)}
        >
          <span class="sbf-name">{b.name}</span>
          <span class="sbf-val">{b.active ? b.value : '—'}</span>
          <span class="sbf-state" aria-hidden="true">{b.active ? 'on' : 'off'}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sbf-buffs { padding: 4px 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .sbf-block-label {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--sum-accent, #c084fc);
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .sbf-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .sbf-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 26px;
    padding: 2px 4px 2px 10px;
    border-radius: var(--radius-full, 999px);
    font-size: 13px;
    font-weight: var(--weight-semibold, 600);
    color: var(--ink, #e8e4da);
    border: 1px solid color-mix(in srgb, var(--bcolor, #c084fc) 45%, transparent);
    background: color-mix(in srgb, var(--bcolor, #c084fc) 12%, transparent);
    cursor: pointer;
    font-family: var(--font-body, inherit);
    transition: border-color var(--duration-fast, .15s), background var(--duration-fast, .15s), opacity var(--duration-fast, .15s);
  }
  .sbf-badge:hover { border-color: color-mix(in srgb, var(--bcolor, #c084fc) 70%, transparent); }
  .sbf-badge:focus-visible {
    outline: 2px solid var(--bcolor, #c084fc);
    outline-offset: 2px;
  }
  /* off: dashed border + dimmed text instead of grayscale filter */
  .sbf-badge--off {
    background: transparent;
    border-style: dashed;
    border-color: color-mix(in srgb, var(--bcolor, #c084fc) 25%, transparent);
    color: var(--sum-muted, #a6a2b0);
  }
  .sbf-name { text-transform: capitalize; }
  .sbf-val { font-weight: var(--weight-extrabold, 800); font-family: var(--font-mono, monospace); font-variant-numeric: tabular-nums; }
  .sbf-state {
    font-size: 12px;
    font-weight: var(--weight-extrabold, 800);
    letter-spacing: .05em;
    text-transform: uppercase;
    padding: 0 7px;
    border-radius: var(--radius-full, 999px);
    background: color-mix(in srgb, var(--bcolor, #c084fc) 25%, transparent);
    color: var(--ink, #e8e4da);
  }
  .sbf-badge--off .sbf-state { background: rgba(255,255,255,.06); color: var(--sum-muted, #a6a2b0); }
</style>
