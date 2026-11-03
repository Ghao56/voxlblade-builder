<script lang="ts">
  // SCALING — Summon Boost × (1 + Lv/MAX). Số mult đến từ VM (trong đó mult
  // đã qua calcSummonStat(1, boost, level)), panel chỉ format.
  import type { SummonPanelVM } from '../lib/summonView'
  import { fmtSummonNum } from '../lib/summonView'
  import { MAX_LEVEL } from '../lib/constants'

  export let vm: SummonPanelVM

  // level phục hồi ngược từ levelFactor (levelFactor = 1 + level/MAX_LEVEL)
  // — chỉ để THẾ SỐ vào công thức hiển thị, không tính phép mới.
  $: lvl = (vm.scaling.levelFactor - 1) * MAX_LEVEL
</script>

<div class="ssp-scaling" role="rowgroup">
  <div class="ssp-block-label">Scaling</div>
  <div class="ssp-scaling-expr">
    <span class="ssp-chip">(1 + {fmtSummonNum(vm.scaling.boostPct)}% × (1 + {fmtSummonNum(lvl)}/{MAX_LEVEL}))</span>
    <span class="ssp-op">=</span>
    <span class="ssp-mult">×{fmtSummonNum(vm.scaling.mult)}</span>
  </div>
</div>

<style>
  .ssp-scaling { padding: 0 0 var(--space-2, 4px) 0; }
  .ssp-block-label {
    font-size: var(--text-sm-plus, 11px);
    letter-spacing: var(--tracking-widest, .08em);
    text-transform: uppercase;
    color: #c084fc;
    font-weight: var(--weight-semibold, 600);
    margin-bottom: 4px;
  }
  .ssp-scaling-expr { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .ssp-chip {
    font-family: 'Courier New', monospace;
    font-size: var(--text-base-plus, 13px);
    color: var(--ink, #e8e4da);
    background: color-mix(in srgb, #c084fc 12%, transparent);
    border: 1px solid color-mix(in srgb, #c084fc 30%, transparent);
    border-radius: var(--radius-xs, 3px);
    padding: 1px 6px;
  }
  .ssp-op { color: var(--ink-muted, #8a8694); }
  .ssp-mult {
    font-family: 'Courier New', monospace;
    font-size: var(--text-lg, 15px);
    font-weight: var(--weight-extrabold, 800);
    color: #c084fc;
  }
</style>
