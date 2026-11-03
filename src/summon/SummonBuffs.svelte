<script lang="ts">
  // APPLIED BUFFS — own titled block (owner request 2026-11): buff toggles
  // were rendered inside Swarm Total with no header of their own. Same
  // interactive chips: key `source::name` at DamageAnalyzer level, clicked to
  // include/exclude the buff from the damage mult chain.
  import type { SummonPanelVM } from '../lib/summonView'
  import { BUFF_DEFS } from '../data/BuffData'

  export let vm: SummonPanelVM
  /** (buffName) — toggle, key `source::name` handled in DamageAnalyzer */
  export let onToggleBuff: (buffName: string) => void = () => {}

  const colorOf = (name: string): string => BUFF_DEFS[name]?.color ?? '#c084fc'
</script>

{#if vm.buffs.length}
  <div class="sbf-buffs">
    <div class="sbf-block-label">Applied Buffs</div>
    <div class="sbf-row">
      {#each vm.buffs as b (vm.source + '::' + b.name)}
        <button
          class="sbf-badge"
          class:sbf-badge--off={!b.active}
          aria-pressed={b.active}
          title={b.affectsDamage ? 'Feeds the damage mult chain (calcSummonBuffDmgMult)' : 'Display buff, not part of the damage chain'}
          on:click={() => onToggleBuff(b.name)}
        >
          [ {b.name} ] <span class="sbf-val" style="color:{colorOf(b.name)}">{b.active ? b.value : '—'}</span>
          <span class="sbf-state">{b.active ? 'ON' : 'OFF'}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sbf-buffs { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .sbf-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .sbf-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .sbf-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: var(--radius-full, 999px);
    font-size: var(--text-base, 12px);
    font-weight: var(--weight-semibold, 600);
    color: var(--ink, #e8e4da);
    border: 1px solid var(--border-strong, rgba(255,255,255,.25));
    background: color-mix(in srgb, #c084fc 10%, transparent);
    cursor: pointer;
    font-family: var(--font-body, inherit);
  }
  .sbf-badge--off {
    opacity: .45;
    filter: grayscale(.6);
    border-style: dashed;
  }
  .sbf-val { font-weight: var(--weight-extrabold, 800); font-family: 'Courier New', monospace; }
  .sbf-state {
    font-size: var(--text-2xs, 10px);
    font-weight: var(--weight-extrabold, 800);
    letter-spacing: var(--tracking-wide, .05em);
    padding: 1px 5px;
    border-radius: var(--radius-full, 999px);
    background: rgba(0,0,0,.35);
    border: 1px solid var(--border, rgba(255,255,255,.15));
  }
</style>
