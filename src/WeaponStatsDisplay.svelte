<script lang="ts">
  export let stats: Record<string, number> = {}

  function splitWeaponStats(stats: Record<string, number>) {
    const dmgTypes: Array<[string, number]> = []
    const scalings: Array<[string, number]> = []
    const boosts: Array<[string, number]> = []

    for (const [k, v] of Object.entries(stats)) {
      if (k.endsWith('Type')) dmgTypes.push([k, v])
      else if (k.endsWith('Scaling')) scalings.push([k, v])
      else boosts.push([k, v])
    }

    return { dmgTypes, scalings, boosts }
  }

  function prettyKey(key: string, suffix: string): string {
    const base = key.replace(suffix, '')
    return base.charAt(0).toUpperCase() + base.slice(1)
  }

  function formatLabel(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1)
  }

  function formatStat(key: string, value: number): string {
    if (key.includes('Boost') || key.includes('Defense')) {
      return `${value > 0 ? '+' : ''}${value}%`
    }
    return `${value > 0 ? '+' : ''}${value}`
  }

  $: ws = splitWeaponStats(stats)
</script>

{#if ws.dmgTypes.length}
  <div class="modal-stat-group">
    <span class="modal-stat-group-label modal-stat-group-label--dmg">Dmg Type</span>
    <div class="modal-item-stats">
      {#each ws.dmgTypes as [k, v]}
        <span class="modal-stat-pill modal-stat-pill--dmgtype">{prettyKey(k, 'Type')}: {v}×</span>
      {/each}
    </div>
  </div>
{/if}

{#if ws.scalings.length}
  <div class="modal-stat-group">
    <span class="modal-stat-group-label modal-stat-group-label--scaling">Scaling</span>
    <div class="modal-item-stats">
      {#each ws.scalings as [k, v]}
        <span class="modal-stat-pill modal-stat-pill--scaling">{prettyKey(k, 'Scaling')}: {v}</span>
      {/each}
    </div>
  </div>
{/if}

{#if ws.boosts.length}
  <div class="modal-stat-group">
    <span class="modal-stat-group-label">Stats</span>
    <div class="modal-item-stats">
      {#each ws.boosts as [k, v]}
        <span class="modal-stat-pill" class:neg={v < 0}>{formatLabel(k)}: {formatStat(k, v)}</span>
      {/each}
    </div>
  </div>
{/if}

<style>
  .modal-stat-group {
    margin-top: 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .modal-stat-group-label {
    font-size: 0.55rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-muted);
    opacity: 0.7;
  }
  .modal-stat-group-label--dmg {
    color: var(--weapon-blade);
  }
  .modal-stat-group-label--scaling {
    color: var(--accent3);
  }
  .modal-item-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .modal-stat-pill {
    font-size: 0.62rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(74,222,128,.1);
    border: 1px solid rgba(74,222,128,.2);
    color: var(--accent);
  }
  .modal-stat-pill--dmgtype {
    background: rgba(251,146,60,.1);
    border-color: rgba(251,146,60,.25);
    color: var(--weapon-blade);
  }
  .modal-stat-pill--scaling {
    background: rgba(167,139,250,.1);
    border-color: rgba(167,139,250,.22);
    color: var(--accent3);
  }
  .modal-stat-pill.neg {
    color: var(--neg);
  }
</style>
