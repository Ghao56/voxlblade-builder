<script lang="ts">
  // APPLIED DEBUFFS — status list only (name + potency). NO DoT damage shown
  // and NO player perk applied: the summon DoT/Debuff system is SEPARATE from
  // the player's (owner decision, 2026-11). Not a toggle: these apply
  // automatically on hit.
  import type { SummonPanelVM } from '../lib/summonView'
  import { BUFF_DEFS } from '../data/BuffData'

  export let vm: SummonPanelVM
  const colorOf = (name: string): string => BUFF_DEFS[name]?.color ?? 'var(--sum-accent, #c084fc)'
</script>

{#if vm.debuffs.length}
  <div class="sdb-debuffs">
    <div class="sdb-block-label">Applied Debuffs</div>
    <div class="sdb-row">
      {#each vm.debuffs as d (d.name)}
        <span
          class="sdb-badge"
          title="Summon's own status system — not boosted by player DoT perks/buffs"
          style="border-color:color-mix(in srgb,{colorOf(d.name)} 40%,transparent);background:color-mix(in srgb,{colorOf(d.name)} 10%,transparent)"
        >
          <span class="sdb-name">{d.name}</span>
          <span class="sdb-val" style="color:{colorOf(d.name)}" title="Debuff potency">{d.potency}<span class="sdb-unit">potency</span></span>
        </span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sdb-debuffs { padding: 4px 0; border-top: 1px solid color-mix(in srgb, var(--sum-accent, #c084fc) 15%, transparent); }
  .sdb-block-label {
    font-size: 11px;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--sum-accent, #c084fc);
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .sdb-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .sdb-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: var(--radius-full, 999px);
    font-size: 13px;
    font-weight: var(--weight-semibold, 600);
    color: var(--ink, #e8e4da);
    border: 1px solid var(--border-strong, rgba(255,255,255,.25));
  }
  .sdb-name { text-transform: capitalize; }
  .sdb-val {
    font-family: var(--font-mono, monospace);
    font-variant-numeric: tabular-nums;
    font-weight: var(--weight-extrabold, 800);
  }
  .sdb-unit { font-family: var(--font-body, inherit); font-size: 12px; color: var(--sum-muted, #a6a2b0); font-weight: var(--weight-normal, 400); }
</style>
