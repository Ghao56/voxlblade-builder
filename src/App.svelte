<script lang="ts">
  import { build, result } from './lib/store'
  import {
    races, guilds, armors, rings, runes,
    getGuild, getArmorPart, getRing, getRune, getEnchant, getPerk,
    formatStat, formatLabel, applyEnchantmentsToSlot
  } from './lib/engine'
  import EnchantRow from './lib/components/EnchantRow.svelte'
  import type { EnchantSlot, StatMap } from './lib/types'

  // Guild rank options
  $: guildData = getGuild($build.guild)
  $: rankOptions = guildData?.ranks.map(r => ({ value: String(r.rank), label: `Rank ${r.rank}` })) ?? []

  // Stat rows for display
  $: statRows = Object.entries($result.stats)
    .filter(([,v]) => v !== 0)
    .sort(([a],[b]) => a.localeCompare(b))

  $: perkRows = Object.entries($result.perks)
    .filter(([,v]) => v > 0)
    .sort(([a],[b]) => a.localeCompare(b))

  // Summary
  $: armorLabel = (() => {
    const names = [$build.helmet, $build.chestplate, $build.leggings].filter(Boolean)
    if (!names.length) return "None"
    const uniq = [...new Set(names)]
    return uniq.length === 1 ? uniq[0] : "Mixed"
  })()

  $: enchantCount = Object.values($build.enchantments).flat().filter(Boolean).length

  interface EnchantInfo {
    name: string
    notes: string | undefined
  }

  interface DetailCard {
    title: string
    label: string
    description?: string
    stats: Record<string, number>
    perks: Array<{ name: string; amount: number; fromEnchant: boolean }>
    extras?: string[]
    enchants?: EnchantInfo[]
  }

  function getEnchantInfos(slot: EnchantSlot): EnchantInfo[] {
    return $build.enchantments[slot]
      .filter(Boolean)
      .map(name => {
        const e = getEnchant(name)
        if (!e) return null
        return { name, notes: e.additionalNotes }
      })
      .filter((x): x is EnchantInfo => x !== null)
  }

  function buildSlotCard(
    title: string,
    label: string,
    description: string,
    baseStats: StatMap,
    basePerks: Record<string, number>,
    enchSlot: EnchantSlot,
    extras?: string[]
  ): DetailCard {
    const enchNames = $build.enchantments[enchSlot]
    const slotResult = applyEnchantmentsToSlot(baseStats, basePerks, enchNames)

    const filteredStats: Record<string, number> = {}
    for (const [k, v] of Object.entries(slotResult.stats)) {
      const rounded = Math.round((v + Number.EPSILON) * 100) / 100
      if (rounded !== 0) filteredStats[k] = rounded
    }

    const perks = Object.entries(slotResult.perks)
      .filter(([, v]) => v !== 0)
      .map(([name, amount]) => ({
        name,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        fromEnchant: basePerks[name] == null
      }))

    return {
      title,
      label,
      description,
      stats: filteredStats,
      perks,
      extras,
      enchants: getEnchantInfos(enchSlot),
    }
  }

  function buildEnchantLabel(baseName: string, enchSlot: EnchantSlot): string {
    const enchNames = $build.enchantments[enchSlot].filter(Boolean)
    return enchNames.length > 0 ? `${enchNames.join(" ")} ${baseName}` : baseName
  }

  $: detailCards = (() => {
    const cards: DetailCard[] = []

    const race = races.find(r => r.name === $build.race)
    if (race) cards.push({
      title: "Race", label: race.name,
      description: race.passive,
      stats: (race.statModifiers ?? {}) as Record<string, number>,
      perks: []
    })

    const guild = getGuild($build.guild)
    const rank = guild?.ranks.find(r => r.rank === $build.guildRank)
    if (guild && rank) cards.push({
      title: "Guild", label: `${guild.name} R${rank.rank}`,
      description: "",
      stats: (rank.stats ?? {}) as Record<string, number>,
      perks: (rank.perks ?? []).map(p => ({ ...p, fromEnchant: false }))
    })

    const armorDefs: Array<[string, "Helmet" | "Chestplate" | "Leggings", EnchantSlot, string]> = [
      [$build.helmet, "Helmet", "helmet", "Helmet"],
      [$build.chestplate, "Chestplate", "chestplate", "Chestplate"],
      [$build.leggings, "Leggings", "leggings", "Leggings"],
    ]
    for (const [name, type, enchSlot, title] of armorDefs) {
      if (!name) continue
      const part = getArmorPart(name, type)
      if (!part) continue
      const basePerks: Record<string, number> = part.perkName ? { [part.perkName]: 1 } : {}
      cards.push(buildSlotCard(
        title,
        buildEnchantLabel(name, enchSlot),
        part.description,
        part.stats as StatMap,
        basePerks,
        enchSlot
      ))
    }

    const ring = getRing($build.ring)
    if (ring) {
      const basePerks: Record<string, number> = ring.perkName
        ? { [ring.perkName]: ring.perkStacks ?? 1 } : {}
      cards.push(buildSlotCard(
        "Ring",
        buildEnchantLabel(ring.name, "ring"),
        ring.description,
        ring.stats,
        basePerks,
        "ring"
      ))
    }

    const rune = getRune($build.rune)
    if (rune) {
      const basePerks: Record<string, number> = rune.perkName
        ? { [rune.perkName]: rune.perkStacks ?? 1 } : {}
      cards.push(buildSlotCard(
        "Rune",
        buildEnchantLabel(rune.name, "rune"),
        rune.description,
        rune.stats,
        basePerks,
        "rune",
        [`Cooldown: ${rune.cooldown}s`]
      ))
    }

    return cards
  })()
</script>

<div class="app">
  <header>
    <div class="header-text">
      <h1>Voxl<span class="accent">Builder</span></h1>
    </div>
  </header>

  <div class="workspace">
    <!-- ── LEFT PANEL: Controls ── -->
    <aside class="controls-panel">

      <section class="control-section">
        <h2>Core</h2>
        <div class="grid-2">
          <label class="field">
            <span>Race</span>
            <select bind:value={$build.race}>
              {#each races as r}
                <option value={r.name}>{r.name}</option>
              {/each}
            </select>
          </label>
          <label class="field">
            <span>Guild</span>
            <select bind:value={$build.guild}
              on:change={() => build.update(s => ({...s, guildRank: 1}))}>
              {#each guilds as g}
                <option value={g.name}>{g.name}</option>
              {/each}
            </select>
          </label>
          <label class="field full-width">
            <span>Guild Rank</span>
            <select
              value={String($build.guildRank)}
              on:change={e => build.update(s => ({...s, guildRank: Number((e.target as HTMLSelectElement).value)}))}>
              {#each rankOptions as opt}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
          </label>
        </div>
      </section>

      <section class="control-section">
        <h2>Armor</h2>
        <div class="grid-3">
          <label class="field">
            <span>Helmet</span>
            <select bind:value={$build.helmet}>
              <option value="">—</option>
              {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Chest</span>
            <select bind:value={$build.chestplate}>
              <option value="">—</option>
              {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Legs</span>
            <select bind:value={$build.leggings}>
              <option value="">—</option>
              {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
            </select>
          </label>
        </div>
      </section>

      <section class="control-section">
        <h2>Items</h2>
        <div class="grid-2">
          <label class="field">
            <span>Ring</span>
            <select bind:value={$build.ring}>
              <option value="">—</option>
              {#each rings as r}<option value={r.name}>{r.name}</option>{/each}
            </select>
          </label>
          <label class="field">
            <span>Rune</span>
            <select bind:value={$build.rune}>
              <option value="">—</option>
              {#each runes as r}<option value={r.name}>{r.name}</option>{/each}
            </select>
          </label>
        </div>
      </section>

      <section class="control-section">
        <h2>Enchantments</h2>
        <div class="enchant-stack">
          <EnchantRow slot="helmet" label="Helmet" />
          <EnchantRow slot="chestplate" label="Chest" />
          <EnchantRow slot="leggings" label="Legs" />
          <EnchantRow slot="ring" label="Ring" />
          <EnchantRow slot="rune" label="Rune" />
        </div>
      </section>

    </aside>

    <!-- ── RIGHT PANEL: Results ── -->
    <main class="results">
      <!-- Details grid -->
      <div class="panel">
        <h3 class="panel-title">Selection Details</h3>
        {#if detailCards.length === 0}
          <p class="empty">Pick options to see details.</p>
        {:else}
          <div class="detail-grid">
            {#each detailCards as card}
              <div class="detail-card">
                <div class="detail-head">
                  <span class="detail-type">{card.title}</span>
                  <span class="detail-name">{card.label}</span>
                  {#if card.enchants && card.enchants.length > 0}
                    <div class="detail-enchant-tags">
                      {#each card.enchants as enc}
                        <span class="enchant-tag">{enc.name}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
                {#if card.description}
                  <p class="detail-desc">{card.description}</p>
                {/if}
                {#if card.extras?.length}
                  {#each card.extras as ex}
                    <p class="detail-extra">{ex}</p>
                  {/each}
                {/if}
                {#if Object.keys(card.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(card.stats).filter(([,v]) => v !== 0) as [k,v]}
                      <div class="stat-row">
                        <span>{formatLabel(k)}</span>
                        <span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if card.perks.length}
                  <div class="perk-list">
                    {#each card.perks as p}
                      <div class="perk-row" class:perk-row--enchant={p.fromEnchant}>
                        <span>{p.name}</span>
                        <span class="perk-val" class:perk-val--enchant={p.fromEnchant}>
                          +{p.amount}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if card.enchants}
                  {#each card.enchants as enc}
                    {#if enc.notes}
                      <p class="detail-extra">{enc.notes}</p>
                    {/if}
                  {/each}
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Stats + Perks -->
      <div class="two-col">
        <div class="panel">
          <h3 class="panel-title">Combined Stats</h3>
          {#if statRows.length === 0}
            <p class="empty">No stats yet.</p>
          {:else}
            <div class="stat-list">
              {#each statRows as [k,v]}
                <div class="stat-row">
                  <span>{formatLabel(k)}</span>
                  <span class="stat-val" class:neg={v < 0}>{formatStat(k, v)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="panel">
          <h3 class="panel-title">Perks &amp; Effects</h3>
          {#if perkRows.length === 0}
            <p class="empty">No perks yet.</p>
          {:else}
            <div class="perk-list">
              {#each perkRows as [name, count]}
                {@const perk = getPerk(name)}
                <div class="perk-card">
                  <div class="perk-row">
                    <span class="perk-name">{name}</span>
                    <span class="perk-val">+{Math.round(count * 100) / 100}</span>
                  </div>
                  {#if perk}
                    <p class="perk-desc">{perk.description}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    </main>
  </div>
</div>

<style>
  :root {
    --bg: #0d0f0e;
    --surface: #141715;
    --surface2: #1a1d1b;
    --surface3: #212420;
    --border: rgba(255,255,255,0.06);
    --border-strong: rgba(255,255,255,0.1);
    --ink: #e8e4da;
    --ink-muted: #8a8d85;
    --accent: #4ade80;
    --accent-dim: rgba(74,222,128,0.12);
    --accent2: #f59e0b;
    --accent2-dim: rgba(245,158,11,0.12);
    --accent3: #a78bfa;
    --neg: #f87171;
    --radius: 14px;
    --radius-sm: 8px;
    --font-display: 'Georgia', 'Times New Roman', serif;
    --font-body: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    background: var(--bg);
    color: var(--ink);
    font-family: var(--font-body);
    min-height: 100vh;
  }

  .app {
    max-width: 1500px;
    margin: 0 auto;
    padding: 24px clamp(14px, 3vw, 32px) 60px;
  }

  header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    padding: 28px 32px;
    border-radius: 20px;
    background: linear-gradient(135deg, #161a16 0%, #1c201c 100%);
    border: 1px solid var(--border-strong);
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }

  header::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 90% 0%, rgba(74,222,128,0.07) 0%, transparent 50%),
      radial-gradient(ellipse at 10% 100%, rgba(245,158,11,0.05) 0%, transparent 40%);
    pointer-events: none;
  }


  h1 {
    font-family: var(--font-display);
    font-size: clamp(2rem, 4vw, 3.2rem);
    font-weight: 400;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .accent { color: var(--accent); }


  .workspace {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 16px;
    align-items: start;
  }

  .controls-panel {
    position: sticky;
    top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .control-section {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
  }

  .control-section h2 {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--ink-muted);
    font-weight: 700;
    margin-bottom: 12px;
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .full-width { grid-column: 1/-1; }

  .field { display: flex; flex-direction: column; gap: 5px; }

  .field span, label span {
    font-size: 0.67rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-muted);
    font-weight: 700;
  }

  select {
    width: 100%;
    appearance: none;
    background: var(--surface2);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 0.82rem;
    padding: 8px 28px 8px 10px;
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234ade80' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    transition: border-color 0.15s;
  }

  select:focus { outline: none; border-color: rgba(74,222,128,0.4); }

  .enchant-stack { display: flex; flex-direction: column; gap: 8px; }

  .results { display: flex; flex-direction: column; gap: 14px; }



  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px;
  }

  .panel-title {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--ink-muted);
    font-weight: 700;
    margin-bottom: 14px;
  }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 10px;
  }

  .detail-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-head { display: flex; flex-direction: column; gap: 2px; }

  .detail-type {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: var(--accent);
    font-weight: 700;
  }

  .detail-name { font-size: 0.9rem; font-weight: 600; color: var(--ink); }

  .detail-enchant-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

  .enchant-tag {
    font-size: 0.65rem;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(167,139,250,0.12);
    border: 1px solid rgba(167,139,250,0.25);
    color: var(--accent3);
    letter-spacing: 0.04em;
  }

  .detail-desc { font-size: 0.78rem; color: var(--ink-muted); line-height: 1.45; }
  .detail-extra { font-size: 0.75rem; color: var(--accent2); }

  .stat-list { display: flex; flex-direction: column; gap: 4px; }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--surface3);
    font-size: 0.8rem;
  }

  .stat-val { font-weight: 700; color: var(--accent); white-space: nowrap; }
  .stat-val.neg { color: var(--neg); }

  .perk-list { display: flex; flex-direction: column; gap: 4px; }

  .perk-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.82rem;
    padding: 4px 6px;
    border-radius: 5px;
  }

  .perk-row--enchant { background: rgba(167,139,250,0.06); }

  .perk-val { font-weight: 700; color: var(--accent2); white-space: nowrap; }
  .perk-val--enchant { color: var(--accent3); }

  .perk-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .perk-name { font-weight: 600; }
  .perk-desc { font-size: 0.74rem; color: var(--ink-muted); line-height: 1.4; }
  .empty { color: var(--ink-muted); font-style: italic; font-size: 0.85rem; }

  @media (max-width: 1100px) {
    .workspace { grid-template-columns: 1fr; }
    .controls-panel { position: static; }
  }

  @media (max-width: 640px) {
    .two-col { grid-template-columns: 1fr; }
    .grid-3 { grid-template-columns: 1fr 1fr; }
    header { flex-direction: column; align-items: flex-start; }
  }
</style>