<script lang="ts">
  // ⑤ DEBUFF GÂY RA — CHỈ danh sách trạng thái: tên debuff + potency (> 0).
  // KHÔNG hiển thị damage DoT và KHÔNG nhân perk của player — hệ thống
  // DoT/Debuff của summon tách riêng với của player (quyết định chủ dự án).
  import type { SummonPanelVM } from '../lib/summonView'
  import { BUFF_DEFS } from '../data/BuffData'

  export let vm: SummonPanelVM
  const colorOf = (name: string): string => BUFF_DEFS[name]?.color ?? '#9333ea'
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
          [ {d.name} ] <span class="sdb-val" style="color:{colorOf(d.name)}">{d.potency}</span>
          <span class="sdb-state">ON</span>
        </span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .sdb-debuffs { padding: 4px 0; border-top: 1px solid color-mix(in srgb, #c084fc 15%, transparent); }
  .sdb-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .sdb-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .sdb-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 8px;
    border-radius: var(--radius-full, 999px);
    font-size: var(--text-base, 12px);
    font-weight: var(--weight-semibold, 600);
    color: var(--ink, #e8e4da);
    border: 1px solid var(--border-strong, rgba(255,255,255,.25));
  }
  .sdb-val { font-family: 'Courier New', monospace; font-weight: var(--weight-extrabold, 800); }
  .sdb-state {
    font-size: var(--text-2xs, 10px);
    font-weight: var(--weight-extrabold, 800);
    letter-spacing: var(--tracking-wide, .05em);
    padding: 1px 5px;
    border-radius: var(--radius-full, 999px);
    background: rgba(0,0,0,.35);
    border: 1px solid var(--border, rgba(255,255,255,.15));
  }
</style>
