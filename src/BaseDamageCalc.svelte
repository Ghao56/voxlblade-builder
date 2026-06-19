<script lang="ts">
  import CritIcon from './CritIcon.svelte'
  export let boosts: any
  export let crit: any
  export let stats: any
  export let disabledBoosts: Set<string> = new Set(['Thief Training (would-crit bonus)'])
  export let activeFinalMult: number = 1
  export let showCritValues: boolean = false
  export let showCritToggle: boolean = false

  boosts
  disabledBoosts
  activeFinalMult

  export let weaponHits: Array<{
    group: string;
    index: number; count: number
    base: number; scalingMult: number; combatMult: number;
    isFinisher: boolean
    dmgTypes: Record<string, number>
    label?: string
  }> = []
  export let rageMult: number = 1
  export let rageAffectedTypes: Set<string> = new Set()

  const DMG_TYPES = [
    { id: 'physical', label: 'Physical', color: '#fb923c' },
    { id: 'magic',    label: 'Magic',    color: '#818cf8' },
    { id: 'fire',     label: 'Fire',     color: '#f97316' },
    { id: 'water',    label: 'Water',    color: '#38bdf8' },
    { id: 'earth',    label: 'Earth',    color: '#a3e635' },
    { id: 'air',      label: 'Air',      color: '#AAFFDB' },
    { id: 'hex',      label: 'Hex',      color: '#e879f9' },
    { id: 'holy',     label: 'Holy',     color: '#facc15' },
    { id: 'true',     label: 'True',     color: '#f87171' },
    { id: 'summon',   label: 'Summon',   color: '#c084fc' },
  ]
  const DMG_TYPE_MAP = new Map(DMG_TYPES.map(t => [t.id, t]))

  const DEF_TYPE_IDS = ['physical','magic','fire','water','earth','air','hex','holy']
  let defenses: Record<string, number> = Object.fromEntries(DEF_TYPE_IDS.map(t => [t, 0]))

  // ── Armor pen ─────────────────────────────────────────────────────────────
  $: armorPen   = (stats as any)?.armorPenetration ?? 0
  $: penDecimal = armorPen / 100

  function calcArmorMult(defPct: number, pen: number): { mult: number; branch: 'low'|'high' } {
    const def = defPct / 100
    if (def <= pen + 0.2) {
      const am = def - pen
      return { mult: am > 0 ? 1 / (1 + am) : 1 - am, branch: 'low' }
    } else {
      const am = def / (1 + 5 * pen)
      return { mult: 1 / (1 + am), branch: 'high' }
    }
  }

  function fmt(n: number) {
    const r = Math.round(n * 100) / 100
    return Number.isInteger(r) ? String(r) : r.toFixed(2).replace(/\.?0+$/, '')
  }

  function fmtMult(n: number) {
    const r = Math.round(n * 10000) / 10000
    return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, '')
  }

  // ── Compute every hit × every damage type up front (no manual selection) ───
  interface ComputedType {
    key: string;
    label: string; color: string
    typeBase: number; scalingMult: number; combatMult: number
    rageApplied: boolean;
    rageMultUsed: number
    defMult: number; enemyDefPct: number
    raw: number;
    critVal: number
  }
  interface ComputedHit {
    group: string; index: number; count: number; isFinisher: boolean;
    label?: string
    types: ComputedType[]
  }

  $: critChance  = crit?.effectiveCritChance ?? 0
  $: critDmgMult = crit?.critDamageMultiplier ?? 100

  $: computedHits = weaponHits.map((hit): ComputedHit => {
    const types: ComputedType[] = Object.entries(hit.dmgTypes ?? {}).map(([k, mult]) => {
      const info = DMG_TYPE_MAP.get(k) ?? { label: k, color: '#e8e4da' }
      const rageApplied  = rageMult > 1 && rageAffectedTypes.has(k)
      const rageMultUsed = rageApplied ? rageMult : 1
      const enemyDefPct  = (k === 'true' || k === 'summon') ? 0 : (defenses[k] ?? 0)
      const defMult      = Math.round(calcArmorMult(enemyDefPct, penDecimal).mult * 10000) / 10000
      const typeBase     = Math.round(hit.base * mult * 100) / 100
      const raw          = Math.round(typeBase * hit.scalingMult * rageMultUsed * hit.combatMult * defMult * 100) / 100
      const critVal      = Math.round(raw * critDmgMult / 100 * 100) / 100
      return {
        key: k, 
        label: info.label, color: info.color,
        typeBase, scalingMult: hit.scalingMult, combatMult: hit.combatMult,
        rageApplied, rageMultUsed, defMult, enemyDefPct,
        raw, critVal,
      }
    })
    return { group: hit.group, index: hit.index, count: hit.count, isFinisher: hit.isFinisher, label: hit.label, types }
  })

  $: m1Hits   = computedHits.filter(h => h.group === 'M1')
  $: m2Hits   = computedHits.filter(h => h.group === 'M2')
  $: waHits   = computedHits.filter(h => h.group === 'WA')
  $: perkHits = computedHits.filter(h => h.group !== 'M1' && h.group !== 'M2' && h.group !== 'WA')

  $: hitGroups = [
    { label: 'M1', list: m1Hits },
    { label: 'M2', list: m2Hits },
    { label: 'WA', list: waHits },
    ...(perkHits.length > 0 ? [{ label: 'Perk', list: perkHits }] : [])
  ]

  // ── Totals ────────────────────────────────────────────────────────────────
  function hitTypeSum(hit: ComputedHit, useCrit: boolean): number {
    return Math.round(hit.types.reduce((s, t) => s + (useCrit ? t.critVal : t.raw), 0) * 100) / 100
  }
  function groupTotalSum(list: ComputedHit[], useCrit: boolean): number {
    return Math.round(list.reduce((s, h) => s + hitTypeSum(h, useCrit) * h.count, 0) * 100) / 100
  }
</script>

<div class="bdc-root da-section">
  <div class="da-section-title">Damage Calculator</div>

  <div class="bdc-layout">

    <div class="bdc-dummy-col">
      <div class="bdc-dummy-wrap">
        <svg viewBox="0 0 54 67" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" class="bdc-svg">
          <defs>
            <linearGradient id="bdc-khaki" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#d4b35e"/>
              <stop offset="100%" stop-color="#b3924a"/>
            </linearGradient>
            <linearGradient id="bdc-armGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#8a6f56"/>
              <stop offset="50%" stop-color="#f0935f"/>
              <stop offset="100%" stop-color="#8a6f56"/>
            </linearGradient>
            <linearGradient id="bdc-torsoGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#c7a657"/>
              <stop offset="100%" stop-color="#a98c4c"/>
            </linearGradient>
          </defs>
          <rect x="11" y="57" width="32" height="10" fill="url(#bdc-khaki)" stroke="#1a1208" stroke-width="1.2"/>
          <rect x="21" y="47" width="12" height="11" fill="#7a5f47" stroke="#1a1208" stroke-width="1.2"/>
          <rect x="0"  y="19" width="54" height="9"  fill="url(#bdc-armGrad)" stroke="#1a1208" stroke-width="1.2"/>
          <rect x="11" y="17" width="32" height="2"  fill="#8a6f56" stroke="#1a1208" stroke-width="1"/>
          <rect x="17" y="17" width="20" height="31" fill="url(#bdc-torsoGrad)" stroke="#1a1208" stroke-width="1.2"/>
          <rect x="17" y="13" width="20" height="4"  fill="#6b6256" stroke="#1a1208" stroke-width="1"/>
          <rect x="19" y="0"  width="16" height="14" fill="url(#bdc-khaki)" stroke="#1a1208" stroke-width="1.2"/>
          <rect x="19" y="26" width="16" height="16" fill="#c81d10" stroke="#1a1208" stroke-width="0.8"/>
          <rect x="22.5" y="29.5" width="9" height="9" fill="#ffe3da"/>
          <rect x="25"   y="32"   width="4" height="4" fill="#8e2418"/>
        </svg>

        <div class="bdc-dummy-label">Training Dummy</div>
        <div class="bdc-no-hp">∞ No HP</div>
        {#if armorPen > 0}
          <div class="bdc-pen-badge">🗡 {fmt(armorPen)} Pen</div>
        {/if}
      </div>

      <div class="bdc-def-grid">
        {#each DMG_TYPES.filter(t => t.id !== 'true' && t.id !== 'summon') as t}
          <div class="bdc-def-row" style="--tc:{t.color}">
            <span class="bdc-def-type">{t.label}</span>
            <input
              class="bdc-def-input"
              type="number"
              min="-200"
              max="1000"
              step="1"
              value={defenses[t.id]}
              on:input={e => { defenses[t.id] = parseFloat((e.target as HTMLInputElement).value) || 0 }}
            />
            <span class="bdc-def-pct">%</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="bdc-calc-col">
      {#if showCritToggle}
        <div class="bdc-crit-toggle-row">
          <button
            class="bdc-crit-toggle"
            class:bdc-crit-toggle--on={showCritValues}
            on:click={() => showCritValues = !showCritValues}
          >
            <CritIcon size={12}/> {showCritValues ? 'Crit ON' : 'Crit OFF'}
          </button>
        </div>
      {/if}

      {#if hitGroups.every(g => g.list.length === 0)}
        <p class="bdc-empty">No weapon hits available.</p>
      {:else}
        <div class="bdc-hit-list">
          {#each hitGroups as grp}
            {#if grp.list.length > 0}
              {@const gTotal = groupTotalSum(grp.list, showCritValues)}
              <div class="bdc-hit-list-grp">
                <div class="bdc-grp-head">
                  <span class="bdc-hit-grp-label">{grp.label}</span>
                  {#if grp.label !== 'Perk'}
                    <span class="bdc-grp-total" class:bdc-grp-total--crit={showCritValues}>
                      {#if showCritValues}<CritIcon size={10}/>{/if}
                      {fmt(gTotal)}
                    </span>
                  {/if}
                </div>
                <div class="bdc-hit-list-rows">
                  {#each grp.list as hit}
                    {@const hSum = hitTypeSum(hit, showCritValues)}
                    {@const multiType = hit.types.length > 1}
                    <div class="bdc-hit-row" class:bdc-hit-row--finisher={hit.isFinisher}>
                      {#if hit.label != null}
                        <span class="bdc-hit-row-label">{hit.label}</span>
                      {/if}
                      <div class="bdc-hit-row-types">
                        {#each hit.types as t, ti}
                          {#if ti > 0}<span class="bdc-hit-plus">+</span>{/if}
                          <div class="bdc-hit-type-chunk" style="--tc:{t.color}" class:bdc-hit-type-chunk--rage={t.rageApplied} class:bdc-hit-type-chunk--crit={showCritValues}>
                            <div class="bdc-hit-type-top">
                              {#if showCritValues}
                                <span class="bdc-crit-inline-icon">
                                  <CritIcon size={12} />
                                </span>
                              {/if}
                              <span class="bdc-hit-type-val">{fmt(showCritValues ? t.critVal : t.raw)}</span>
                              <span class="bdc-hit-type-label">{t.label}</span>
                            </div>
                            <div class="bdc-hit-type-formula">
                              <span class="bdc-mini-num">{fmt(t.typeBase)}</span>
                              {#if t.scalingMult !== 1}
                                <span class="bdc-mini-op">×</span>
                                <span class="bdc-mini-chip bdc-mini-chip--scaling" title="Scaling">{fmtMult(t.scalingMult)}</span>
                              {/if}
                              {#if t.rageApplied}
                                <span class="bdc-mini-op">×</span>
                                <span class="bdc-mini-chip bdc-mini-chip--rage" title="Rage">{fmtMult(t.rageMultUsed)}</span>
                              {/if}
                              {#if t.combatMult !== 1}
                                <span class="bdc-mini-op">×</span>
                                <span class="bdc-mini-chip bdc-mini-chip--combat" title="Combat multipliers">{fmtMult(t.combatMult)}</span>
                              {/if}
                              {#if t.defMult !== 1}
                                <span class="bdc-mini-op">×</span>
                                <span class="bdc-mini-chip bdc-mini-chip--def" class:bdc-mini-chip--amplify={t.defMult > 1} title={`Enemy def ${fmt(t.enemyDefPct)}% vs pen ${fmt(armorPen)}`}>{fmtMult(t.defMult)}</span>
                              {/if}
                              <span class="bdc-mini-op">=</span>
                              <span class="bdc-mini-result" style="--tc:{t.color}">{fmt(t.raw)}</span>
                              {#if showCritValues}
                                <span class="bdc-mini-op">×</span>
                                <span class="bdc-mini-chip bdc-mini-chip--crit" title="Crit damage multiplier">
                                  <CritIcon size={9}/>{fmtMult(critDmgMult / 100)}
                                </span>
                                <span class="bdc-mini-op">=</span>
                                <span class="bdc-mini-result bdc-mini-result--crit" style="--tc:{t.color}">{fmt(t.critVal)}</span>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                      <div class="bdc-hit-row-end">
                        {#if hit.count > 1}<span class="bdc-hit-cnt">×{hit.count}</span>{/if}
                        
                        <span class="bdc-hit-type-sum-sep">=</span>
                        <span class="bdc-hit-type-sum" class:bdc-hit-type-sum--crit={showCritValues}>
                          {#if showCritValues}<CritIcon size={11}/>{/if}
                          {fmt(hSum * hit.count)}
                        </span>
                        
                        {#if hit.isFinisher}<span class="bdc-hit-fin">✦</span>{/if}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
.bdc-root {
  border-color: rgba(204,153,88,.2) !important;
  background: linear-gradient(160deg, var(--surface, #141715) 60%, rgba(204,153,88,.04) 100%) !important;
}

.bdc-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

/* ── Dummy column ── */
.bdc-dummy-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.bdc-dummy-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bdc-svg {
  width: 72px;
  height: auto;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 8px rgba(201,29,16,.25));
}

.bdc-dummy-label {
  font-size: .6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: #b3924a;
  opacity: .8;
}

.bdc-no-hp {
  font-size: .58rem;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(248,113,113,.1);
  border: 1px solid rgba(248,113,113,.2);
  color: #f87171;
  letter-spacing: .08em;
}

.bdc-pen-badge {
  font-size: .6rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(229,229,229,.1);
  border: 1px solid rgba(229,229,229,.25);
  color: #e5e5e5;
  letter-spacing: .06em;
  white-space: nowrap;
}

/* Defense grid */
.bdc-def-grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.bdc-def-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--surface2, #1a1d1b);
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: background .1s, border-color .1s;
  width: 100%;
  min-width: 140px;
}
.bdc-def-row:hover { background: var(--surface3, #212420); }

.bdc-def-type {
  font-size: .62rem;
  font-weight: 700;
  color: var(--tc, #e8e4da);
  width: 50px;
  text-align: left;
  flex-shrink: 0;
}

.bdc-def-input {
  font-family: 'Courier New', monospace;
  font-size: .82rem;
  font-weight: 700;
  color: var(--ink, #e8e4da);
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 4px;
  width: 52px;
  text-align: right;
  padding: 1px 4px;
  -moz-appearance: textfield;
  appearance: textfield;
  flex-shrink: 0;
}
.bdc-def-input::-webkit-inner-spin-button,
.bdc-def-input::-webkit-outer-spin-button { -webkit-appearance: none; }
.bdc-def-input:focus { outline: none; border-color: var(--tc, rgba(255,255,255,.25)); }

.bdc-def-pct {
  font-size: .65rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .5;
}

/* ── Calc column ── */
.bdc-calc-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Crit Toggle Row */
.bdc-crit-toggle-row {
  display: flex;
  justify-content: flex-end;
}
.bdc-crit-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: .62rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(226,178,3,.25);
  background: var(--surface2, #1a1d1b);
  color: var(--ink-muted, #8a8d85);
  cursor: pointer;
  font-family: inherit;
  transition: all .12s;
}
.bdc-crit-toggle--on {
  border-color: rgba(226,178,3,.6);
  background: rgba(226,178,3,.12);
  color: #e2b203;
  box-shadow: 0 0 8px rgba(226,178,3,.2);
}

@media (max-width: 600px) {
  .bdc-layout { flex-direction: column; }
  .bdc-dummy-col { flex-direction: row; align-items: flex-start; width: 100%; }
  .bdc-dummy-wrap { flex-shrink: 0; }
  .bdc-def-grid { flex: 1; }
}

.bdc-hit-grp-label {
  font-size: .52rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .14em;
  color: var(--ink-muted, #8a8d85);
  opacity: .5;
  min-width: 20px;
}

.bdc-hit-cnt {
  font-family: 'Courier New', monospace;
  font-size: .95rem;
  font-weight: 900;
  color: #fbbf24;
  background: rgba(251,191,36,.12);
  border: 1px solid rgba(251,191,36,.3);
  border-radius: 999px;
  padding: 3px 11px;
  letter-spacing: -.01em;
  flex-shrink: 0;
}

/* ── Group header with total ── */
.bdc-grp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 3px;
}

.bdc-grp-total {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: .95rem;
  font-weight: 900;
  color: var(--ink-muted, #8a8d85);
  opacity: .55;
  letter-spacing: -.01em;
}

.bdc-grp-total--crit {
  color: #e2b203;
  opacity: .85;
}

/* ── Per-hit type sum (multi-type only) ── */
.bdc-hit-type-sum-sep {
  font-size: .7rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .35;
  font-weight: 700;
  margin: 0 2px;
  flex-shrink: 0;
}

.bdc-hit-type-sum {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-family: 'Courier New', monospace;
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--ink, #e8e4da);
  padding: 4px 10px;
  border-radius: 7px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.12);
  letter-spacing: -.01em;
  min-width: 58px;
}

.bdc-hit-type-sum--crit {
  color: #e2b203;
  background: rgba(226,178,3,.1);
  border-color: rgba(226,178,3,.25);
}

/* ── Full hit list (no selection needed) ── */
.bdc-empty {
  font-size: .78rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .5;
  font-style: italic;
}
.bdc-hit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bdc-hit-list-grp {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bdc-hit-list-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bdc-hit-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--surface2, #1a1d1b);
  border: 1px solid rgba(255,255,255,.07);
}
.bdc-hit-row--finisher {
  border-color: rgba(250,204,21,.4);
  background: linear-gradient(135deg, rgba(20,20,20,.6), rgba(250,204,21,.07));
}
.bdc-hit-row-label {
  font-size: .72rem;
  font-weight: 700;
  color: var(--ink-muted, #8a8d85);
  flex-shrink: 0;
}
.bdc-hit-row-types {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.bdc-hit-row-end {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
  padding-left: 8px;
}
.bdc-hit-type-chunk {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 4px 9px;
  border-radius: 9px;
  background: color-mix(in srgb, var(--tc) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--tc) 25%, transparent);
}
.bdc-hit-type-chunk--rage {
  box-shadow: 0 0 8px color-mix(in srgb, var(--tc) 50%, #f70201);
}
.bdc-hit-type-val {
  font-family: 'Courier New', monospace;
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--tc, #e8e4da);
  text-shadow: 0 0 12px color-mix(in srgb, var(--tc) 55%, transparent);
  letter-spacing: -.02em;
  line-height: 1;
}
.bdc-hit-type-label {
  font-size: .55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--tc, #e8e4da);
  opacity: .65;
}
.bdc-hit-plus {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .35;
}

.bdc-hit-type-top {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.bdc-hit-type-formula {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 3px;
  padding-top: 3px;
  border-top: 1px dashed color-mix(in srgb, var(--tc) 25%, transparent);
}
.bdc-mini-num {
  font-family: 'Courier New', monospace;
  font-size: .68rem;
  font-weight: 700;
  color: var(--ink-muted, #8a8d85);
  opacity: .75;
}
.bdc-mini-op {
  font-size: .6rem;
  color: var(--ink-muted, #8a8d85);
  opacity: .4;
}
.bdc-mini-chip {
  font-family: 'Courier New', monospace;
  font-size: .65rem;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(255,255,255,.05);
  border: 1px solid rgba(255,255,255,.08);
  color: var(--ink, #e8e4da);
}
.bdc-mini-chip--scaling { color: #34d399; border-color: rgba(52,211,153,.25); background: rgba(52,211,153,.06); }
.bdc-mini-chip--rage    { color: #f70201; border-color: rgba(247,2,1,.3);    background: rgba(247,2,1,.07); }
.bdc-mini-chip--combat  { color: #34d399; border-color: rgba(52,211,153,.25); background: rgba(52,211,153,.06); }
.bdc-mini-chip--def     { color: #f87171; border-color: rgba(248,113,113,.25); background: rgba(248,113,113,.06); }
.bdc-mini-chip--amplify { color: #fbbf24; border-color: rgba(251,191,36,.3); background: rgba(251,191,36,.07); }
.bdc-mini-chip--crit    {
  display: inline-flex; align-items: center; gap: 3px;
  color: #e2b203; border-color: rgba(226,178,3,.3); background: rgba(226,178,3,.1);
}
.bdc-mini-result {
  font-family: 'Courier New', monospace;
  font-size: .72rem;
  font-weight: 900;
  color: var(--tc, #e8e4da);
}
.bdc-mini-result--crit {
  color: #e2b203;
  font-size: .78rem;
  text-shadow: 0 0 8px rgba(226,178,3,.4);
}
.bdc-hit-fin { font-size: .65rem; color: #facc15; }
.bdc-crit-inline-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 2px;
  animation: bdc-pop 0.2s ease-out;
}

.bdc-hit-type-chunk--crit .bdc-hit-type-val {
  font-weight: 900;
  text-shadow: 0 0 4px rgba(216, 75, 85, 0.4);
  filter: hue-rotate(-15deg) saturate(1.8) brightness(1.2);
}

.bdc-hit-type-chunk--crit {
  border-color: color-mix(in srgb, var(--tc) 50%, #d84b55) !important;
  box-shadow: inset 0 0 4px color-mix(in srgb, var(--tc) 20%, #ff9a42);
}

@keyframes bdc-pop {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>