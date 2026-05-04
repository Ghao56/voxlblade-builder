<script lang="ts">
  import { build, result } from './lib/store'
  import {
    races, guilds, armors, rings, runes, blades, handles, gloves, essences,
    getGuild, getArmorPart, getRing, getRune, getEnchant, getPerk,
    getBlade, getHandle, getGlove, getEssence,
    formatStat, formatLabel, applyEnchantmentsToSlot, applyInfusion,
    calcWeapon, calcMonkWeapon, isMonkGuild,
    checkHybrid, SHRINE_MULTIPLIERS,
    type CDRResult
} from './lib/engine'
  import EnchantRow from './lib/components/EnchantRow.svelte'
  import type { EnchantSlot, StatMap } from './lib/types'

  $: guildData = getGuild($build.guild)
  $: rankOptions = guildData?.ranks.map(r => ({ value: String(r.rank), label: `${r.rank}` })) ?? []
  $: isMonk = isMonkGuild($build.guild)

  $: statRows = Object.entries($result.stats)
    .filter(([,v]) => v !== 0)
    .sort(([a],[b]) => a.localeCompare(b))

  $: perkRows = Object.entries($result.perks)
    .filter(([,v]) => v > 0)
    .sort(([a],[b]) => a.localeCompare(b))

  $: cdr = $result.cdr
  $: hasRuneCDR = cdr.runeCDR < 1.0 || cdr.runeSetCD != null
  $: hasWaCDR   = cdr.waCDR   < 1.0
    function formatCD(base: number, cdr: CDRResult) {
      const effectiveBase = cdr.runeSetCD ?? base
      return `${Math.floor(effectiveBase * cdr.runeCDR)}s`
    }

  // ── Shrine of Balance ──────────────────────────────────────────────────────
  $: shrineActive = $build.shrineActive

  // ── Standard weapon filters ────────────────────────────────────────────────
  let bladeFilterTier: string = ""
  let bladeFilterType: string = ""
  let handleFilterTier: string = ""
  let handleFilterType: string = ""

  const bladeTiers = [1,2,3,4,5]
  const bladeTypes = ["Small Blade","Medium Blade","Heavy Blade","Hammer Head"]
  const handleTiers = [1,2,3,4,5]
  const handleTypes = ["Medium Handle","Long Handle","Pole"]

  $: filteredBlades = blades.filter(b =>
    (!bladeFilterTier || b.tier === Number(bladeFilterTier)) &&
    (!bladeFilterType || b.bladeType === bladeFilterType)
  )
  $: filteredHandles = handles.filter(h =>
    (!handleFilterTier || h.tier === Number(handleFilterTier)) &&
    (!handleFilterType || h.handleType === handleFilterType)
  )

  // ── Monk weapon filters ────────────────────────────────────────────────────
  let gloveFilterTier: string = ""
  let gloveFilterType: string = ""
  let essenceFilterTier: string = ""

  const gloveTiers = [1,2,3,4,5]
  const gloveTypes = ["Gloves","Shield"]
  const essenceTiers = [1,2,3,4,5]

  $: filteredGloves = gloves.filter(g =>
    (!gloveFilterTier || g.tier === Number(gloveFilterTier)) &&
    (!gloveFilterType || g.gloveType === gloveFilterType)
  )
  $: filteredEssences = essences.filter(e =>
    (!essenceFilterTier || e.tier === Number(essenceFilterTier))
  )

  // ── Weapon result ──────────────────────────────────────────────────────────
  $: weaponResult = isMonk
    ? (($build.monkGlove || $build.monkEssence)
        ? calcMonkWeapon($build.monkGlove, $build.monkEssence, shrineActive)
        : null)
    : (($build.weaponBlade || $build.weaponHandle)
        ? calcWeapon($build.weaponBlade, $build.weaponHandle, shrineActive)
        : null)

  // ── Detail cards ────────────────────────────────────────────────────────────
  interface EnchantInfo { name: string; notes: string | undefined }
  interface DetailCard {
    title: string; label: string; description?: string
    stats: Record<string, number>
    perks: Array<{ name: string; amount: number; fromEnchant: boolean }>
    extras?: string[]
    enchants?: EnchantInfo[]
    isInfusion?: boolean
  }
  interface SlotGroup { main: DetailCard | null; infusion: DetailCard | null }

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
    title: string, label: string, description: string,
    baseStats: StatMap, basePerks: Record<string, number>,
    enchSlot: EnchantSlot, extras?: string[]
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
        name, amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        fromEnchant: basePerks[name] == null
      }))
    return { title, label, description, stats: filteredStats, perks, extras, enchants: getEnchantInfos(enchSlot) }
  }

  function buildInfusionCard(
    title: string, label: string, description: string,
    baseStats: StatMap, basePerks: Record<string, number>
  ): DetailCard {
    const inf = applyInfusion(baseStats, basePerks)
    const filteredStats: Record<string, number> = {}
    for (const [k, v] of Object.entries(inf.stats)) {
      const rounded = Math.round((v + Number.EPSILON) * 100) / 100
      if (rounded !== 0) filteredStats[k] = rounded
    }
    const perks = Object.entries(inf.perks)
      .filter(([, v]) => v !== 0)
      .map(([name, amount]) => ({
        name, amount: Math.round((amount + Number.EPSILON) * 100) / 100,
        fromEnchant: false
      }))
    return { title, label, description, stats: filteredStats, perks, isInfusion: true }
  }

  function buildEnchantLabel(baseName: string, enchSlot: EnchantSlot): string {
    const enchNames = $build.enchantments[enchSlot].filter(Boolean)
    return enchNames.length > 0 ? `${enchNames.join(" ")} ${baseName}` : baseName
  }

  $: identityCards = (() => {
    const cards: DetailCard[] = []
    const race = races.find(r => r.name === $build.race)
    if (race) cards.push({
      title: "Race", label: race.name, description: race.passive,
      stats: (race.statModifiers ?? {}) as Record<string, number>, perks: []
    })
    const guild = getGuild($build.guild)
    const rank = guild?.ranks.find(r => r.rank === $build.guildRank)
    if (guild && rank) cards.push({
      title: "Guild", label: `${guild.name} R${rank.rank}`, description: "",
      stats: (rank.stats ?? {}) as Record<string, number>,
      perks: (rank.perks ?? []).map(p => ({ ...p, fromEnchant: false }))
    })
    return cards
  })()

  $: slotGroups = (() => {
    const groups: SlotGroup[] = []

    {
      const part = $build.helmet ? getArmorPart($build.helmet, "Helmet") : null
      const ip = $build.infusionHelmet ? getArmorPart($build.infusionHelmet, "Helmet") : null
      if (part || ip) {
        const bp: Record<string, number> = part?.perkName ? { [part.perkName]: 1 } : {}
        const main = part
          ? buildSlotCard("Helmet", buildEnchantLabel($build.helmet, "helmet"), part.description, part.stats as StatMap, bp, "helmet")
          : null
        let infusion: DetailCard | null = null
        if (ip) {
          const ibp: Record<string, number> = ip.perkName ? { [ip.perkName]: 1 } : {}
          infusion = buildInfusionCard("Infusion Helmet", $build.infusionHelmet, ip.description, ip.stats as StatMap, ibp)
        }
        groups.push({ main, infusion })
      }
    }

    {
      const part = $build.chestplate ? getArmorPart($build.chestplate, "Chestplate") : null
      const ip = $build.infusionChestplate ? getArmorPart($build.infusionChestplate, "Chestplate") : null
      if (part || ip) {
        const bp: Record<string, number> = part?.perkName ? { [part.perkName]: 1 } : {}
        const main = part
          ? buildSlotCard("Chestplate", buildEnchantLabel($build.chestplate, "chestplate"), part.description, part.stats as StatMap, bp, "chestplate")
          : null
        let infusion: DetailCard | null = null
        if (ip) {
          const ibp: Record<string, number> = ip.perkName ? { [ip.perkName]: 1 } : {}
          infusion = buildInfusionCard("Infusion Chestplate", $build.infusionChestplate, ip.description, ip.stats as StatMap, ibp)
        }
        groups.push({ main, infusion })
      }
    }

    {
      const part = $build.leggings ? getArmorPart($build.leggings, "Leggings") : null
      const ip = $build.infusionLeggings ? getArmorPart($build.infusionLeggings, "Leggings") : null
      if (part || ip) {
        const bp: Record<string, number> = part?.perkName ? { [part.perkName]: 1 } : {}
        const main = part
          ? buildSlotCard("Leggings", buildEnchantLabel($build.leggings, "leggings"), part.description, part.stats as StatMap, bp, "leggings")
          : null
        let infusion: DetailCard | null = null
        if (ip) {
          const ibp: Record<string, number> = ip.perkName ? { [ip.perkName]: 1 } : {}
          infusion = buildInfusionCard("Infusion Leggings", $build.infusionLeggings, ip.description, ip.stats as StatMap, ibp)
        }
        groups.push({ main, infusion })
      }
    }

    {
      const ring = $build.ring ? getRing($build.ring) : null
      const ir = $build.infusionRing ? getRing($build.infusionRing) : null
      if (ring || ir) {
        const bp: Record<string, number> = ring?.perkName ? { [ring.perkName]: ring.perkStacks ?? 1 } : {}
        const main = ring
          ? buildSlotCard("Ring", buildEnchantLabel(ring.name, "ring"), ring.description, ring.stats, bp, "ring")
          : null
        let infusion: DetailCard | null = null
        if (ir) {
          const ibp: Record<string, number> = ir.perkName ? { [ir.perkName]: ir.perkStacks ?? 1 } : {}
          infusion = buildInfusionCard("Infusion Ring", $build.infusionRing, ir.description, ir.stats, ibp)
        }
        groups.push({ main, infusion })
      }
    }

    if ($build.rune) {
      const rune = getRune($build.rune)
      if (rune) {
        const bp: Record<string, number> = rune.perkName ? { [rune.perkName]: rune.perkStacks ?? 1 } : {}
        groups.push({
          main: buildSlotCard("Rune", buildEnchantLabel(rune.name, "rune"), rune.description, rune.stats, bp, "rune", 
            hasRuneCDR 
              ? [`Base CD: ${rune.cooldown}s → ${formatCD(rune.cooldown, cdr)}`]
              : [`Cooldown: ${rune.cooldown}s`]
          ),
          infusion: null
        })
      }
    }

    return groups
  })()

  $: hasDetails = identityCards.length > 0 || slotGroups.length > 0

  // ── Label helpers ──────────────────────────────────────────────────────────
  function formatDmgTypeLabel(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1) + " Type"
  }
  function formatScalingLabel(key: string): string {
    return key.charAt(0).toUpperCase() + key.slice(1) + " Scaling"
  }

  $: summaryWeaponLabel = (() => {
    if (weaponResult?.part1Name && weaponResult?.part2Name && weaponResult.finalWeaponType)
      return weaponResult.finalWeaponType
    return 'None'
  })()

  $: summaryWeaponSub = (() => {
    if (!weaponResult) return ''
    return [weaponResult.part1Name, weaponResult.part2Name].filter(Boolean).join(' + ')
  })()

  // ── Part1 label (Blade / Glove) ────────────────────────────────────────────
  $: part1Label = isMonk ? 'Glove' : 'Blade'
  $: part2Label = isMonk ? 'Essence' : 'Handle'

  // ── Summary cells for weapon ───────────────────────────────────────────────
  $: sgPart1Name = isMonk ? ($build.monkGlove || `No ${part1Label.toLowerCase()}`) : ($build.weaponBlade || `No blade`)
  $: sgPart2Name = isMonk ? ($build.monkEssence || `No ${part2Label.toLowerCase()}`) : ($build.weaponHandle || `No handle`)
  $: sgPart1Empty = isMonk ? !$build.monkGlove : !$build.weaponBlade
  $: sgPart2Empty = isMonk ? !$build.monkEssence : !$build.weaponHandle
</script>

<div class="app">
  <header>
    <div class="header-text">
      <h1>Voxl<span class="accent">Builder</span></h1>
    </div>
  </header>

  <div class="workspace">
    <aside class="controls-panel">

      <!-- Core -->
      <section class="control-section">
        <h2>Core</h2>
        <div class="core-stack">
          <label class="field">
            <span>Race</span>
            <select bind:value={$build.race}>
              {#each races as r}
                <option value={r.name}>{r.name}</option>
              {/each}
            </select>
          </label>
          <div class="guild-rank-row">
            <label class="field guild-field">
              <span>Guild</span>
              <select bind:value={$build.guild}
                on:change={() => build.update(s => ({...s, guildRank: 1}))}>
                <option value="">—</option>
                {#each guilds as g}<option value={g.name}>{g.name}</option>{/each}
              </select>
            </label>
            {#if rankOptions.length > 0}
              <label class="field rank-field">
                <span>Rank</span>
                <select
                  value={String($build.guildRank)}
                  on:change={e => build.update(s => ({...s, guildRank: Number((e.target as HTMLSelectElement).value)}))}>
                  {#each rankOptions as opt}
                    <option value={opt.value}>{opt.label}</option>
                  {/each}
                </select>
              </label>
            {/if}
          </div>
        </div>
      </section>

      <!-- Weapon Section — switches between Blade/Handle and Glove/Essence -->
      <section class="control-section weapon-section" class:weapon-section--monk={isMonk}>
        <h2 class:monk-title={isMonk}>
          {#if isMonk}
            Monk Weapon
          {:else}
            Weapon
          {/if}
        </h2>

        <!-- Shrine of Balance toggle -->
        <div class="shrine-toggle-row">
          <button
            class="shrine-btn"
            class:shrine-btn--active={shrineActive}
            on:click={() => build.update(s => ({...s, shrineActive: !s.shrineActive}))}
            title="Increase Scalings and Stat Boosts inversely proportional to weapon part Tier"
          >
            <span class="shrine-icon">⚖</span>
            <span class="shrine-label">Shrine of Balance</span>
            <span class="shrine-state">{shrineActive ? 'ON' : 'OFF'}</span>
          </button>
          {#if shrineActive}
            <div class="shrine-hint">
              T1×3.0 · T2×1.7 · T3×1.4 · T4×1.1 · T5×1.0
            </div>
          {/if}
        </div>

        {#if isMonk}
          <!-- ═══ MONK: Glove + Essence ═══ -->

          <div class="slot-stack">
            <!-- Glove -->
            <div class="slot-block">
              <div class="weapon-part-label">
                <span class="weapon-part-title monk-part-title">Glove</span>
              </div>
              <div class="weapon-filters">
                <label class="field filter-field">
                  <span>Tier</span>
                  <select bind:value={gloveFilterTier}
                    on:change={() => { if (filteredGloves.findIndex(g => g.name === $build.monkGlove) === -1) build.update(s => ({...s, monkGlove: ""})) }}>
                    <option value="">All</option>
                    {#each gloveTiers as t}<option value={String(t)}>Tier {t}</option>{/each}
                  </select>
                </label>
                <label class="field filter-field">
                  <span>Type</span>
                  <select bind:value={gloveFilterType}
                    on:change={() => { if (filteredGloves.findIndex(g => g.name === $build.monkGlove) === -1) build.update(s => ({...s, monkGlove: ""})) }}>
                    <option value="">All</option>
                    {#each gloveTypes as t}<option value={t}>{t}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field">
                <span>Select Glove</span>
                <select bind:value={$build.monkGlove}
                  on:change={e => build.update(s => ({...s, monkGlove: (e.target as HTMLSelectElement).value}))}>
                  <option value="">—</option>
                  {#each filteredGloves as g}
                    <option value={g.name}>[T{g.tier}] {g.name} ({g.gloveType})</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="slot-divider weapon-divider">
              <span class="weapon-divider-text monk-divider-text">+</span>
            </div>

            <!-- Essence -->
            <div class="slot-block">
              <div class="weapon-part-label">
                <span class="weapon-part-title monk-part-title--essence">Essence</span>
              </div>
              <div class="weapon-filters">
                <label class="field filter-field">
                  <span>Tier</span>
                  <select bind:value={essenceFilterTier}
                    on:change={() => { if (filteredEssences.findIndex(e => e.name === $build.monkEssence) === -1) build.update(s => ({...s, monkEssence: ""})) }}>
                    <option value="">All</option>
                    {#each essenceTiers as t}<option value={String(t)}>Tier {t}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field">
                <span>Select Essence</span>
                <select bind:value={$build.monkEssence}
                  on:change={e => build.update(s => ({...s, monkEssence: (e.target as HTMLSelectElement).value}))}>
                  <option value="">—</option>
                  {#each filteredEssences as e}
                    <option value={e.name}>[T{e.tier}] {e.name}</option>
                  {/each}
                </select>
              </label>
            </div>
          </div>

        {:else}
          <!-- ═══ STANDARD: Blade + Handle ═══ -->
          <div class="slot-stack">
            <!-- Blade -->
            <div class="slot-block">
              <div class="weapon-part-label">
                <span class="weapon-part-title">Blade</span>
              </div>
              <div class="weapon-filters">
                <label class="field filter-field">
                  <span>Tier</span>
                  <select bind:value={bladeFilterTier}
                    on:change={() => { if (filteredBlades.findIndex(b => b.name === $build.weaponBlade) === -1) build.update(s => ({...s, weaponBlade: ""})) }}>
                    <option value="">All</option>
                    {#each bladeTiers as t}<option value={String(t)}>Tier {t}</option>{/each}
                  </select>
                </label>
                <label class="field filter-field">
                  <span>Type</span>
                  <select bind:value={bladeFilterType}
                    on:change={() => { if (filteredBlades.findIndex(b => b.name === $build.weaponBlade) === -1) build.update(s => ({...s, weaponBlade: ""})) }}>
                    <option value="">All</option>
                    {#each bladeTypes as t}<option value={t}>{t}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field">
                <span>Select Blade</span>
                <select bind:value={$build.weaponBlade}
                  on:change={e => build.update(s => ({...s, weaponBlade: (e.target as HTMLSelectElement).value}))}>
                  <option value="">—</option>
                  {#each filteredBlades as b}
                    <option value={b.name}>[T{b.tier}] {b.name} ({b.bladeType})</option>
                  {/each}
                </select>
              </label>
            </div>

            <div class="slot-divider weapon-divider">
              <span class="weapon-divider-text">+</span>
            </div>

            <!-- Handle -->
            <div class="slot-block">
              <div class="weapon-part-label">
                <span class="weapon-part-title">Handle</span>
              </div>
              <div class="weapon-filters">
                <label class="field filter-field">
                  <span>Tier</span>
                  <select bind:value={handleFilterTier}
                    on:change={() => { if (filteredHandles.findIndex(h => h.name === $build.weaponHandle) === -1) build.update(s => ({...s, weaponHandle: ""})) }}>
                    <option value="">All</option>
                    {#each handleTiers as t}<option value={String(t)}>Tier {t}</option>{/each}
                  </select>
                </label>
                <label class="field filter-field">
                  <span>Type</span>
                  <select bind:value={handleFilterType}
                    on:change={() => { if (filteredHandles.findIndex(h => h.name === $build.weaponHandle) === -1) build.update(s => ({...s, weaponHandle: ""})) }}>
                    <option value="">All</option>
                    {#each handleTypes as t}<option value={t}>{t}</option>{/each}
                  </select>
                </label>
              </div>
              <label class="field">
                <span>Select Handle</span>
                <select bind:value={$build.weaponHandle}
                  on:change={e => build.update(s => ({...s, weaponHandle: (e.target as HTMLSelectElement).value}))}>
                  <option value="">—</option>
                  {#each filteredHandles as h}
                    <option value={h.name}>[T{h.tier}] {h.name} ({h.handleType})</option>
                  {/each}
                </select>
              </label>
            </div>
          </div>
        {/if}
      </section>

      <!-- Armor -->
      <section class="control-section">
        <h2>Armor</h2>
        <div class="slot-stack">

          <div class="slot-block slot-block--2col">
            <div class="slot-left">
              <label class="field">
                <span>Helmet</span>
                <select bind:value={$build.helmet}>
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
              <label class="field">
                <span class="inf-span">Infusion</span>
                <select bind:value={$build.infusionHelmet} class="infusion-select">
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
            </div>
            <div class="slot-right">
              <EnchantRow slot="helmet" label="Enchant" />
            </div>
          </div>

          <div class="slot-divider"></div>

          <div class="slot-block slot-block--2col">
            <div class="slot-left">
              <label class="field">
                <span>Chestplate</span>
                <select bind:value={$build.chestplate}>
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
              <label class="field">
                <span class="inf-span">Infusion</span>
                <select bind:value={$build.infusionChestplate} class="infusion-select">
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
            </div>
            <div class="slot-right">
              <EnchantRow slot="chestplate" label="Enchant" />
            </div>
          </div>

          <div class="slot-divider"></div>

          <div class="slot-block slot-block--2col">
            <div class="slot-left">
              <label class="field">
                <span>Leggings</span>
                <select bind:value={$build.leggings}>
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
              <label class="field">
                <span class="inf-span">Infusion</span>
                <select bind:value={$build.infusionLeggings} class="infusion-select">
                  <option value="">—</option>
                  {#each armors as a}<option value={a.name}>{a.name}</option>{/each}
                </select>
              </label>
            </div>
            <div class="slot-right">
              <EnchantRow slot="leggings" label="Enchant" />
            </div>
          </div>

        </div>
      </section>

      <!-- Items: Ring + Rune -->
      <section class="control-section">
        <h2>Items</h2>
        <div class="slot-stack">

          <div class="slot-block slot-block--2col">
            <div class="slot-left">
              <label class="field">
                <span>Ring</span>
                <select bind:value={$build.ring}>
                  <option value="">—</option>
                  {#each rings as r}<option value={r.name}>{r.name}</option>{/each}
                </select>
              </label>
              <label class="field">
                <span class="inf-span">Infusion</span>
                <select bind:value={$build.infusionRing} class="infusion-select">
                  <option value="">—</option>
                  {#each rings as r}<option value={r.name}>{r.name}</option>{/each}
                </select>
              </label>
            </div>
            <div class="slot-right">
              <EnchantRow slot="ring" label="Enchant" />
            </div>
          </div>

          <div class="slot-divider"></div>

          <div class="slot-block slot-block--2col">
            <div class="slot-left">
              <label class="field">
                <span>Rune</span>
                <select bind:value={$build.rune}>
                  <option value="">—</option>
                  {#each runes as r}<option value={r.name}>{r.name}</option>{/each}
                </select>
              </label>
              <label class="field">
                <span class="inf-span" style="opacity:0.35">Infusion</span>
                <select disabled class="infusion-select" style="opacity:0.3;cursor:not-allowed">
                  <option value="">Coming soon</option>
                </select>
              </label>
            </div>
            <div class="slot-right">
              <EnchantRow slot="rune" label="Enchant" />
            </div>
          </div>

        </div>
      </section>

    </aside>

    <main class="results">

      <!-- BUILD SUMMARY -->
      <div class="panel summary-panel">
        <h3 class="panel-title summary-title">Build Summary</h3>
        <div class="summary-layout">

          <div class="summary-grid">

            {#if weaponResult}
              <div class="sg-cell sg-weapon sg-span10">
                <span class="sg-label">
                  {isMonk ? 'Monk Weapon Type' : 'Weapon Type'}
                </span>
                <span class="sg-value">{summaryWeaponLabel}</span>
                {#if summaryWeaponSub}
                  <span class="sg-sub">{summaryWeaponSub}</span>
                {/if}
                {#if weaponResult?.attackSpeed != null && weaponResult.part1Name && weaponResult.part2Name}
                  <span class="sg-badge">{weaponResult.attackSpeed}x spd</span>
                {/if}
              </div>
            {/if}

            <!-- Row 1 -->
            <div class="sg-cell sg-infusion sg-span2" class:sg-empty={!$build.infusionHelmet}>
              <span class="sg-label">Inf. Helmet</span>
              <span class="sg-value">{$build.infusionHelmet || 'No infused helmet'}</span>
            </div>
            <div class="sg-cell sg-armor sg-span2" class:sg-empty={!$build.helmet}>
              <span class="sg-label">Helmet</span>
              <span class="sg-value">{$build.helmet || 'No helmet'}</span>
              {#if $build.helmet && $build.enchantments.helmet.some(Boolean)}
                <span class="sg-ench">{$build.enchantments.helmet.filter(Boolean).join(' · ')}</span>
              {/if}
            </div>
            <div class="sg-cell sg-span3"
              class:sg-blade={!isMonk} class:sg-monk-glove={isMonk}
              class:sg-empty={sgPart1Empty}>
              <span class="sg-label">{part1Label}</span>
              <span class="sg-value">{sgPart1Name}</span>
              {#if weaponResult?.part1Type}
                <span class="sg-sub">{weaponResult.part1Type}</span>
              {/if}
            </div>
            <div class="sg-cell sg-span3"
              class:sg-handle={!isMonk} class:sg-monk-essence={isMonk}
              class:sg-empty={sgPart2Empty}>
              <span class="sg-label">{part2Label}</span>
              <span class="sg-value">{sgPart2Name}</span>
              {#if weaponResult?.part2Type}
                <span class="sg-sub">{weaponResult.part2Type}</span>
              {/if}
            </div>

            <!-- Row 2 -->
            <div class="sg-cell sg-infusion sg-span2" class:sg-empty={!$build.infusionChestplate}>
              <span class="sg-label">Inf. Chestplate</span>
              <span class="sg-value">{$build.infusionChestplate || 'No infused chestplate'}</span>
            </div>
            <div class="sg-cell sg-armor sg-span2" class:sg-empty={!$build.chestplate}>
              <span class="sg-label">Chestplate</span>
              <span class="sg-value">{$build.chestplate || 'No chestplate'}</span>
              {#if $build.chestplate && $build.enchantments.chestplate.some(Boolean)}
                <span class="sg-ench">{$build.enchantments.chestplate.filter(Boolean).join(' · ')}</span>
              {/if}
            </div>
            <div class="sg-cell sg-infusion sg-span2" class:sg-empty={!$build.infusionRing}>
              <span class="sg-label">Inf. Ring</span>
              <span class="sg-value">{$build.infusionRing || 'No infused ring'}</span>
            </div>
            <div class="sg-cell sg-item sg-span2" class:sg-empty={!$build.ring}>
              <span class="sg-label">Ring</span>
              <span class="sg-value">{$build.ring || 'No ring'}</span>
              {#if $build.ring && $build.enchantments.ring.some(Boolean)}
                <span class="sg-ench">{$build.enchantments.ring.filter(Boolean).join(' · ')}</span>
              {/if}
            </div>
            <div class="sg-cell sg-race sg-span2">
              <span class="sg-label">Race</span>
              <span class="sg-value">{$build.race || '—'}</span>
              {#if $build.race}
                {@const race = races.find(r => r.name === $build.race)}
                {#if race?.passive}
                  <span class="sg-sub">{race.passive.length > 40 ? race.passive.slice(0,40)+'…' : race.passive}</span>
                {/if}
              {/if}
            </div>

            <!-- Row 3 -->
            <div class="sg-cell sg-infusion sg-span2" class:sg-empty={!$build.infusionLeggings}>
              <span class="sg-label">Inf. Leggings</span>
              <span class="sg-value">{$build.infusionLeggings || 'No infused leggings'}</span>
            </div>
            <div class="sg-cell sg-armor sg-span2" class:sg-empty={!$build.leggings}>
              <span class="sg-label">Leggings</span>
              <span class="sg-value">{$build.leggings || 'No leggings'}</span>
              {#if $build.leggings && $build.enchantments.leggings.some(Boolean)}
                <span class="sg-ench">{$build.enchantments.leggings.filter(Boolean).join(' · ')}</span>
              {/if}
            </div>
            <div class="sg-cell sg-infusion sg-span2" style="opacity:0.3">
              <span class="sg-label">Inf. Rune</span>
              <span class="sg-value">Coming soon</span>
            </div>
            <div class="sg-cell sg-item sg-span2" class:sg-empty={!$build.rune}>
              <span class="sg-label">Rune</span>
              <span class="sg-value">{$build.rune || 'No rune'}</span>
              {#if $build.rune}
                {@const rune = runes.find(r => r.name === $build.rune)}
                {#if rune}
                  {#if hasRuneCDR}
                  <span class="sg-cd-row">
                    <span class="sg-cd-base">{rune.cooldown}s</span>
                    <span class="sg-cd-arrow">→</span>
                    <span class="sg-cd-final">{formatCD(rune.cooldown, cdr)}</span>
                  </span>
                  {:else}
                    <span class="sg-sub">CD: {rune.cooldown}s</span>
                  {/if}
                {/if}


                {#if $build.enchantments.rune.some(Boolean)}
                  <span class="sg-ench">{$build.enchantments.rune.filter(Boolean).join(' · ')}</span>
                {/if}
              {/if}
            </div>
            <div class="sg-cell sg-guild sg-span2" class:sg-empty={!$build.guild}>
              <span class="sg-label">Guild</span>
              <span class="sg-value">{$build.guild || '—'}</span>
              {#if $build.guild}
                <span class="sg-sub">Rank {$build.guildRank}</span>
              {/if}
            </div>

          </div>

          <div class="summary-stats">
            <div class="ss-header">Stats</div>
            {#if statRows.length === 0}
              <p class="empty ss-empty">No stats yet.</p>
            {:else}
              <div class="ss-section">
                {#each statRows as [k, v]}
                  <div class="ss-row">
                    <span class="ss-key">{formatLabel(k)}</span>
                    <span class="ss-val" class:neg={v < 0}>{formatStat(k, v)}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

        </div>
      </div>

      <!-- Perks & Effects -->
      {#if perkRows.length > 0}
        <div class="panel perks-panel">
          <h3 class="panel-title perks-title">Perks &amp; Effects</h3>
          <div class="perks-grid">
            {#each perkRows as [name, count]}
              {@const perk = getPerk(name)}
              <div class="perk-card">
                <div class="perk-row">
                  <span class="perk-name">{name}</span>
                  <span class="perk-val">+{Math.round(count * 100) / 100}</span>
                </div>
                {#if perk?.description}
                  <p class="perk-desc">{perk.description}</p>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Weapon Panel -->
      {#if weaponResult}
        <div class="panel weapon-panel" class:weapon-panel--monk={isMonk}>
          <h3 class="panel-title" class:monk-panel-title={isMonk}>
            {isMonk ? 'Monk Weapon' : 'Weapon'}
          </h3>
          <div class="weapon-result-layout">

            <!-- Part 1: Blade / Glove -->
            {#if weaponResult.part1Name}
              {@const part1Data = isMonk ? getGlove(weaponResult.part1Name) : getBlade(weaponResult.part1Name)}
              <div class="detail-card weapon-card" class:weapon-card--blade={!isMonk} class:weapon-card--glove={isMonk}>
                <div class="detail-head">
                  <span class="detail-type" class:weapon-type-label={!isMonk} class:monk-type-label={isMonk}>
                    {weaponResult.part1TypeLabel} · {weaponResult.part1Type}
                  </span>
                  <span class="detail-name">{weaponResult.part1Name}</span>
                  <div class="weapon-tier-badge" class:monk-tier-badge={isMonk}>T{part1Data?.tier}</div>
                </div>
                {#if part1Data?.attackSpeed != null}
                  <div class="weapon-meta-row">
                    <span class="weapon-meta-label">Attack Speed</span>
                    <span class="weapon-meta-val">{part1Data.attackSpeed}x</span>
                  </div>
                {/if}
                {#if Object.keys(weaponResult.damageTypes).length}
                  <div class="weapon-section-label">Damage Types</div>
                  <div class="damage-type-grid">
                    {#each Object.entries(weaponResult.damageTypes) as [k, v]}
                      <div class="damage-type-pill">
                        <span class="dt-name">{formatDmgTypeLabel(k)}</span>
                        <span class="dt-val">{v}x</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.part1RawScalings).length}
                  <div class="weapon-section-label">Scalings</div>
                  <div class="scaling-grid">
                    {#each Object.entries(weaponResult.part1RawScalings) as [k, rawVal]}
                      {@const finalVal = weaponResult.part1FinalScalings[k] ?? rawVal}
                      {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                      <div class="scaling-pill" class:scaling-pill--boosted={boosted}>
                        <span class="sc-name">{formatScalingLabel(k)}</span>
                        {#if boosted}
                          <span class="sc-val-old">{rawVal}</span>
                          <span class="sc-val sc-val--new">{finalVal}</span>
                        {:else}
                          <span class="sc-val">{rawVal}</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part1Data && Object.keys(part1Data.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(part1Data.stats).filter(([,v]) => v !== 0) as [k, rawVal]}
                      {@const finalVal = (weaponResult.part1FinalStats  as Record<string, number>)[k] ?? rawVal}
                      {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                      <div class="stat-row" class:stat-row--boosted={boosted}>
                        <span>{formatLabel(k)}</span>
                        <div class="stat-val-group">
                          {#if boosted}
                            <span class="stat-val stat-val-ghost" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                            <span class="stat-val stat-val--new" class:neg={finalVal < 0}>{formatStat(k, finalVal as number)}</span>
                          {:else}
                            <span class="stat-val" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part1Data?.perkName}
                  <div class="perk-list">
                    <div class="perk-row">
                      <span>{part1Data.perkName}</span>
                      <span class="perk-val">+{part1Data.perkStacks ?? 1}</span>
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="detail-card weapon-card weapon-card--empty">
                <p class="empty">No {part1Label.toLowerCase()} selected.</p>
              </div>
            {/if}

            <!-- Combine indicator -->
            <div class="weapon-combine">
              <div class="weapon-combine-line"></div>
              <div class="weapon-combine-icon" class:monk-combine-icon={isMonk}>+</div>
              <div class="weapon-combine-line"></div>
            </div>

            <!-- Part 2: Handle / Essence -->
            {#if weaponResult.part2Name}
              {@const part2Data = isMonk ? getEssence(weaponResult.part2Name) : getHandle(weaponResult.part2Name)}
              <div class="detail-card weapon-card" class:weapon-card--handle={!isMonk} class:weapon-card--essence={isMonk}>
                <div class="detail-head">
                  <span class="detail-type" class:weapon-type-label--handle={!isMonk} class:monk-type-label--essence={isMonk}>
                    {weaponResult.part2TypeLabel} · {weaponResult.part2Type}
                  </span>
                  <span class="detail-name">{weaponResult.part2Name}</span>
                  <div class="weapon-tier-badge" class:weapon-tier-badge--handle={!isMonk} class:monk-tier-badge--essence={isMonk}>T{part2Data?.tier}</div>
                </div>
                {#if part2Data?.attackSpeed != null}
                  <div class="weapon-meta-row">
                    <span class="weapon-meta-label">Attack Speed</span>
                    <span class="weapon-meta-val">{part2Data.attackSpeed}x</span>
                  </div>
                {/if}
                {#if Object.keys(weaponResult.part2RawScalings).length}
                  <div class="weapon-section-label">Scalings</div>
                  <div class="scaling-grid">
                    {#each Object.entries(weaponResult.part2RawScalings) as [k, rawVal]}
                      {@const finalVal = weaponResult.part2FinalScalings[k] ?? rawVal}
                      {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                      <div class="scaling-pill" class:scaling-pill--boosted={boosted}>
                        <span class="sc-name">{formatScalingLabel(k)}</span>
                        {#if boosted}
                          <span class="sc-val-old">{rawVal}</span>
                          <span class="sc-val sc-val--new">{finalVal}</span>
                        {:else}
                          <span class="sc-val">{rawVal}</span>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part2Data && Object.keys(part2Data.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(part2Data.stats).filter(([,v]) => v !== 0) as [k, rawVal]}
                      {@const finalVal = (weaponResult.part2FinalStats as Record<string, number>)[k] ?? rawVal}
                      {@const boosted = weaponResult.shrineActive && finalVal !== rawVal}
                      <div class="stat-row" class:stat-row--boosted={boosted}>
                        <span>{formatLabel(k)}</span>
                        <div class="stat-val-group">
                          {#if boosted}
                            <span class="stat-val stat-val-ghost" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                            <span class="stat-val stat-val--new" class:neg={finalVal < 0}>{formatStat(k, finalVal as number)}</span>
                          {:else}
                            <span class="stat-val" class:neg={rawVal < 0}>{formatStat(k, rawVal as number)}</span>
                          {/if}
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if part2Data?.perkName}
                  <div class="perk-list">
                    <div class="perk-row">
                      <span>{part2Data.perkName}</span>
                      <span class="perk-val">+{part2Data.perkStacks ?? 1}</span>
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="detail-card weapon-card weapon-card--empty">
                <p class="empty">No {part2Label.toLowerCase()} selected.</p>
              </div>
            {/if}

            <!-- Arrow separator -->
            {#if weaponResult.part1Name && weaponResult.part2Name}
              <div class="weapon-combine weapon-combine--arrow">
                <div class="weapon-combine-line"></div>
                <div class="weapon-combine-icon">→</div>
                <div class="weapon-combine-line"></div>
              </div>
            {:else}
              <div></div>
            {/if}

            <!-- Combined result card -->
            {#if weaponResult.part1Name && weaponResult.part2Name}
              <div class="weapon-combined-card" class:weapon-combined-card--monk={isMonk}>
                <div class="weapon-combined-header">
                  <div class="weapon-combined-left">
                    <span class="weapon-combined-title" class:monk-combined-title={isMonk}>
                      {isMonk ? 'Combined Fists' : 'Combined Weapon'}
                    </span>
                    {#if weaponResult.finalWeaponType}
                      <span class="weapon-type-badge" class:monk-type-badge={isMonk}>{weaponResult.finalWeaponType}</span>
                    {:else}
                      <span class="weapon-type-badge weapon-type-badge--none">None</span>
                    {/if}
                    {#if weaponResult.weaponModifier}
                      <span class="weapon-modifier-badge">{isMonk ? '' : 'via '}{weaponResult.weaponModifier}</span>
                    {/if}
                    {#if weaponResult.hybridActive}
                      <span class="weapon-modifier-badge weapon-modifier-badge--hybrid" title="Different scalings detected: all scaling values ×1.5">Hybrid</span>
                    {/if}
                  </div>
                  <span class="weapon-combined-speed">{weaponResult.attackSpeed}x Attack Speed</span>
                </div>
                {#if Object.keys(weaponResult.damageTypes).length}
                  <div class="weapon-section-label">Damage Types</div>
                  <div class="damage-type-grid">
                    {#each Object.entries(weaponResult.damageTypes) as [k, v]}
                      <div class="damage-type-pill">
                        <span class="dt-name">{formatDmgTypeLabel(k)}</span>
                        <span class="dt-val">{v}x</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.scalings).length}
                  <div class="weapon-section-label">Scalings</div>
                  <div class="scaling-grid">
                    {#each Object.entries(weaponResult.scalings) as [k, v]}
                      <div class="scaling-pill">
                        <span class="sc-name">{formatScalingLabel(k)}</span>
                        <span class="sc-val">{v}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.stats).length}
                  <div class="stat-list">
                    {#each Object.entries(weaponResult.stats).filter(([,v]) => v !== 0) as [k,v]}
                      <div class="stat-row">
                        <span>{formatLabel(k)}</span>
                        <span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
                {#if Object.keys(weaponResult.perks).length}
                  <div class="perk-list">
                    {#each Object.entries(weaponResult.perks) as [name, amount]}
                      <div class="perk-row">
                        <span>{name}</span>
                        <span class="perk-val">+{amount}</span>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}

          </div>
        </div>
      {/if}

      <!-- Selection Details -->
      <div class="panel">
        <h3 class="panel-title">Selection Details</h3>
        {#if !hasDetails}
          <p class="empty">Pick options to see details.</p>
        {:else}
          <div class="detail-layout">
            {#if identityCards.length > 0}
              <div class="identity-col">
                {#each identityCards as card}
                  <div class="detail-card">
                    <div class="detail-head">
                      <span class="detail-type">{card.title}</span>
                      <span class="detail-name">{card.label}</span>
                    </div>
                    {#if card.description}
                      <p class="detail-desc">{card.description}</p>
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
                          <div class="perk-row">
                            <span>{p.name}</span>
                            <span class="perk-val">+{p.amount}</span>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}

            {#if slotGroups.length > 0}
              <div class="gear-grid">
                {#each slotGroups as group}
                  <div class="slot-col">
                    {#if group.main}
                    <div class="detail-card">
                      <div class="detail-head">
                        <span class="detail-type">{group.main.title}</span>
                        <span class="detail-name">{group.main.label}</span>
                        {#if group.main.enchants && group.main.enchants.length > 0}
                          <div class="detail-enchant-tags">
                            {#each group.main.enchants as enc}
                              <span class="enchant-tag">{enc.name}</span>
                            {/each}
                          </div>
                        {/if}
                      </div>
                      {#if group.main.description}
                        <p class="detail-desc">{group.main.description}</p>
                      {/if}
                      {#if group.main.extras?.length}
                        {#each group.main.extras as ex}
                          <p class="detail-extra">{ex}</p>
                        {/each}
                      {/if}
                      {#if group.main.title === 'Rune' && (hasRuneCDR || cdr.runeSetCD != null)}
                        <div class="cdr-block">
                          <div class="cdr-block-header">
                            <span class="cdr-icon">⏱</span>
                            <span class="cdr-title">Rune CDR Breakdown</span>
                          </div>

                          {#if cdr.runeSetCD != null}
                            <!-- Set CD override -->
                            <div class="cdr-step">
                              <span class="cdr-source">Gladiatorial Rage</span>
                              <span class="cdr-mult">Sets CD = {cdr.runeSetCD}s</span>
                            </div>
                          {/if}

                          {#each cdr.runeBreakdown as step}
                            <div class="cdr-step">
                              <span class="cdr-source">{step.source}</span>
                              <span class="cdr-mult">-{step.pct}%</span>
                            </div>
                          {/each}

                          {#each runes.filter(r => r.name === $build.rune).slice(0,1) as rune}
                            <div class="cdr-result">
                              {#if cdr.runeSetCD != null}
                                <span class="cdr-cd-old">{rune.cooldown}s</span>
                                <span class="cdr-arrow">→</span>
                                <span class="cdr-cd-old">{cdr.runeSetCD}s</span>
                                <span class="cdr-arrow">→</span>
                              {:else}
                                <span class="cdr-cd-old">{rune.cooldown}s</span>
                                <span class="cdr-arrow">→</span>
                              {/if}
                              <span class="cdr-cd-new">{formatCD(rune.cooldown, cdr)}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if Object.keys(group.main.stats).length}
                        <div class="stat-list">
                          {#each Object.entries(group.main.stats).filter(([,v]) => v !== 0) as [k,v]}
                            <div class="stat-row">
                              <span>{formatLabel(k)}</span>
                              <span class="stat-val" class:neg={v < 0}>{formatStat(k, v as number)}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if group.main.perks.length}
                        <div class="perk-list">
                          {#each group.main.perks as p}
                            <div class="perk-row" class:perk-row--enchant={p.fromEnchant}>
                              <span>{p.name}</span>
                              <span class="perk-val" class:perk-val--enchant={p.fromEnchant}>+{p.amount}</span>
                            </div>
                          {/each}
                        </div>
                      {/if}
                      {#if group.main.enchants}
                        {#each group.main.enchants as enc}
                          {#if enc.notes}<p class="detail-extra">{enc.notes}</p>{/if}
                        {/each}
                      {/if}
                    </div>
                    {/if}

                    {#if group.infusion}
                      <div class="inf-bridge">
                        <span class="inf-bridge-line"></span>
                        <span class="inf-bridge-icon">inf</span>
                        <span class="inf-bridge-line"></span>
                      </div>
                      <div class="detail-card detail-card--infusion">
                        <div class="detail-head">
                          <span class="detail-type detail-type--infusion">{group.infusion.title}</span>
                          <span class="detail-name">{group.infusion.label}</span>
                        </div>
                        {#if group.infusion.description}
                          <p class="detail-desc">{group.infusion.description}</p>
                        {/if}
                        {#if Object.keys(group.infusion.stats).length}
                          <div class="stat-list">
                            {#each Object.entries(group.infusion.stats).filter(([,v]) => v !== 0) as [k,v]}
                              <div class="stat-row stat-row--infusion">
                                <span>{formatLabel(k)}</span>
                                <span class="stat-val stat-val--infusion" class:neg={v < 0}>{formatStat(k, v as number)}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        {#if group.infusion.perks.length}
                          <div class="perk-list">
                            {#each group.infusion.perks as p}
                              <div class="perk-row">
                                <span>{p.name}</span>
                                <span class="perk-val">+{p.amount}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                        <div class="infusion-note">Stats x0.5 · Perks full</div>
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
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
    --accent2: #f59e0b;
    --accent3: #a78bfa;
    --infusion: #38bdf8;
    --infusion-border: rgba(56,189,248,0.22);
    --neg: #f87171;
    --weapon-blade: #fb923c;
    --weapon-handle: #34d399;
    --weapon-combined: #fbbf24;
    --monk-glove: #e879f9;
    --monk-essence: #818cf8;
    --monk-combined: #c084fc;
    --radius: 14px;
    --radius-sm: 8px;
    --font-display: 'Georgia', 'Times New Roman', serif;
    --font-body: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: var(--bg); color: var(--ink);
    font-family: var(--font-body); min-height: 100vh;
  }

  .app { max-width: 1500px; margin: 0 auto; padding: 24px clamp(14px,3vw,32px) 60px; }

  header {
    display: flex; align-items: flex-end; gap: 20px;
    padding: 28px 32px; border-radius: 20px;
    background: linear-gradient(135deg, #161a16 0%, #1c201c 100%);
    border: 1px solid var(--border-strong); margin-bottom: 20px;
    position: relative; overflow: hidden;
  }
  header::before {
    content: ""; position: absolute; inset: 0;
    background:
      radial-gradient(ellipse at 90% 0%, rgba(74,222,128,0.07) 0%, transparent 50%),
      radial-gradient(ellipse at 10% 100%, rgba(245,158,11,0.05) 0%, transparent 40%);
    pointer-events: none;
  }

  h1 { font-family: var(--font-display); font-size: clamp(2rem,4vw,3.2rem); font-weight: 400; line-height: 1; letter-spacing: -0.02em; }
  .accent { color: var(--accent); }

  .workspace { display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: start; }
  .controls-panel { position: sticky; top: 16px; display: flex; flex-direction: column; gap: 12px; }

  .control-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; }
  .control-section h2 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.2em; color: var(--ink-muted); font-weight: 700; margin-bottom: 12px; }

  /* Weapon section variants */
  .weapon-section { border-color: rgba(251,146,60,0.18); background: linear-gradient(160deg, var(--surface) 60%, rgba(251,146,60,0.04) 100%); }
  .weapon-section h2 { color: var(--weapon-blade); }
  .weapon-section--monk { border-color: rgba(232,121,249,0.2); background: linear-gradient(160deg, var(--surface) 60%, rgba(232,121,249,0.04) 100%); }
  .weapon-section--monk h2 { color: var(--monk-glove); }
  .monk-title { color: var(--monk-glove) !important; display: flex; align-items: center; gap: 6px; }

  /* Monk notice banner */

  .weapon-part-label { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .weapon-part-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--weapon-blade); font-weight: 700; }
  .monk-part-title { color: var(--monk-glove) !important; }
  .monk-part-title--essence { color: var(--monk-essence) !important; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; }

  .weapon-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px; }
  .filter-field span { font-size: 0.6rem !important; color: var(--ink-muted) !important; }
  .filter-field select { font-size: 0.75rem; padding: 5px 22px 5px 8px; }

  .weapon-divider { display: flex; align-items: center; gap: 8px; height: auto; padding: 4px 0; background: none; }
  .weapon-divider-text { font-size: 1rem; color: var(--weapon-blade); opacity: 0.5; font-weight: 700; flex-shrink: 0; }
  .monk-divider-text { color: var(--monk-glove) !important; }

  .core-stack { display: flex; flex-direction: column; gap: 10px; }
  .guild-rank-row { display: flex; gap: 8px; align-items: flex-end; }
  .guild-field { flex: 1; min-width: 0; }
  .rank-field { flex: 0 0 76px; }

  .field { display: flex; flex-direction: column; gap: 5px; }
  .field span, label span { font-size: 0.67rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-muted); font-weight: 700; }

  select {
    width: 100%; appearance: none;
    background: var(--surface2); border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm); color: var(--ink);
    font-family: var(--font-body); font-size: 0.82rem;
    padding: 8px 28px 8px 10px; cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%234ade80' d='M1 1l5 5 5-5'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    transition: border-color 0.15s;
  }
  select:focus { outline: none; border-color: rgba(74,222,128,0.4); }

  .slot-stack { display: flex; flex-direction: column; }
  .slot-block { display: flex; flex-direction: column; gap: 6px; padding: 10px 0; }
  .slot-block--2col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: start; }
  .slot-left { display: flex; flex-direction: column; gap: 6px; }
  .slot-right { border-left: 1px solid var(--border); padding-left: 10px; }
  .slot-divider { height: 1px; background: var(--border); }

  .inf-span { color: var(--infusion) !important; opacity: 0.9; }
  .infusion-select {
    border-color: var(--infusion-border) !important;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2338bdf8' d='M1 1l5 5 5-5'/%3E%3C/svg%3E") !important;
  }
  .infusion-select:focus { border-color: rgba(56,189,248,0.45) !important; outline: none; }

  .results { display: flex; flex-direction: column; gap: 14px; }

  .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px; }
  .panel-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--ink-muted); font-weight: 700; margin-bottom: 14px; }

  /* Summary */
  .summary-panel { border-color: rgba(74,222,128,0.13); background: linear-gradient(160deg, var(--surface) 60%, rgba(74,222,128,0.03) 100%); }
  .summary-title { color: var(--accent); }
  .summary-layout { display: grid; grid-template-columns: 1fr 240px; gap: 12px; align-items: start; }
  .summary-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; }
  .sg-span10 { grid-column: span 10; }
  .sg-span3  { grid-column: span 3; }
  .sg-span2  { grid-column: span 2; }

  .sg-cell { border-radius: 8px; padding: 9px 11px; display: flex; flex-direction: column; gap: 2px; min-height: 60px; transition: opacity 0.15s; }
  .sg-empty { opacity: 0.38; }

  .sg-weapon { background: linear-gradient(135deg, rgba(251,146,60,0.16), rgba(251,191,36,0.1)); border: 1px solid rgba(251,146,60,0.26); }
  .sg-armor  { background: linear-gradient(135deg, rgba(74,222,128,0.1), rgba(74,222,128,0.05)); border: 1px solid rgba(74,222,128,0.18); }
  .sg-infusion { background: linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.05)); border: 1px solid rgba(56,189,248,0.2); }
  .sg-blade  { background: linear-gradient(135deg, rgba(251,146,60,0.12), rgba(251,146,60,0.06)); border: 1px solid rgba(251,146,60,0.22); }
  .sg-handle { background: linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.06)); border: 1px solid rgba(52,211,153,0.22); }
  .sg-item   { background: linear-gradient(135deg, rgba(167,139,250,0.1), rgba(167,139,250,0.05)); border: 1px solid rgba(167,139,250,0.18); }
  .sg-race   { background: linear-gradient(135deg, rgba(56,189,248,0.1), rgba(56,189,248,0.05)); border: 1px solid rgba(56,189,248,0.18); }
  .sg-guild  { background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06)); border: 1px solid rgba(245,158,11,0.22); }
  /* Monk cells */
  .sg-monk-glove   { background: linear-gradient(135deg, rgba(232,121,249,0.12), rgba(232,121,249,0.06)); border: 1px solid rgba(232,121,249,0.22); }
  .sg-monk-essence { background: linear-gradient(135deg, rgba(129,140,248,0.12), rgba(129,140,248,0.06)); border: 1px solid rgba(129,140,248,0.22); }

  .sg-label { font-size: 0.59rem; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; opacity: 0.6; }
  .sg-weapon .sg-label  { color: var(--weapon-blade); }
  .sg-armor  .sg-label  { color: var(--accent); }
  .sg-infusion .sg-label { color: var(--infusion); }
  .sg-blade  .sg-label  { color: var(--weapon-blade); }
  .sg-handle .sg-label  { color: var(--weapon-handle); }
  .sg-item   .sg-label  { color: var(--accent3); }
  .sg-race   .sg-label  { color: var(--infusion); }
  .sg-guild  .sg-label  { color: var(--accent2); }
  .sg-monk-glove   .sg-label { color: var(--monk-glove); }
  .sg-monk-essence .sg-label { color: var(--monk-essence); }

  .sg-value { font-size: 0.84rem; font-weight: 700; color: var(--ink); line-height: 1.2; }
  .sg-sub { font-size: 0.67rem; color: var(--ink-muted); line-height: 1.3; margin-top: 1px; }
  .sg-ench { font-size: 0.62rem; color: var(--accent3); opacity: 0.75; margin-top: 1px; }
  .sg-badge { display: inline-block; font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.22); color: var(--weapon-combined); margin-top: 3px; width: fit-content; }

  .summary-stats { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; max-height: 400px; overflow-y: auto; }
  .summary-stats::-webkit-scrollbar { width: 4px; }
  .summary-stats::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 2px; }
  .ss-header { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--ink-muted); font-weight: 700; padding-bottom: 6px; border-bottom: 1px solid var(--border); margin-bottom: 2px; }
  .ss-section { display: flex; flex-direction: column; gap: 2px; }
  .ss-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 3px 5px; border-radius: 4px; font-size: 0.75rem; transition: background 0.1s; }
  .ss-row:hover { background: var(--surface3); }
  .ss-key { color: var(--ink-muted); }
  .ss-val { font-weight: 700; color: var(--accent); white-space: nowrap; }
  .ss-val.neg { color: var(--neg); }

  /* Weapon panel */
  .weapon-panel { border-color: rgba(251,146,60,0.18); background: linear-gradient(160deg, var(--surface) 50%, rgba(251,146,60,0.04) 100%); }
  .weapon-panel .panel-title { color: var(--weapon-blade); }
  .weapon-panel--monk { border-color: rgba(232,121,249,0.2); background: linear-gradient(160deg, var(--surface) 50%, rgba(232,121,249,0.04) 100%); }
  .weapon-panel--monk .panel-title { color: var(--monk-glove); }
  .monk-panel-title { color: var(--monk-glove) !important; }

  .weapon-result-layout { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: 10px; align-items: start; }

  /* Combined card variants */
  .weapon-combined-card {
    background: linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(251,146,60,0.06) 100%);
    border: 1px solid rgba(251,191,36,0.22); border-radius: var(--radius-sm); padding: 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .weapon-combined-card--monk {
    background: linear-gradient(135deg, rgba(192,132,252,0.1) 0%, rgba(129,140,248,0.08) 100%);
    border-color: rgba(192,132,252,0.28);
  }
  .weapon-combined-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
  .weapon-combined-left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .weapon-combined-title { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.16em; color: var(--weapon-combined); font-weight: 700; }
  .monk-combined-title { color: var(--monk-combined) !important; }
  .weapon-combined-speed { font-size: 0.8rem; font-weight: 700; color: var(--weapon-combined); background: rgba(251,191,36,0.1); padding: 3px 8px; border-radius: 999px; border: 1px solid rgba(251,191,36,0.2); }

  /* Type badges */
  .weapon-type-badge { font-size: 0.72rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.28); color: var(--weapon-blade); letter-spacing: 0.04em; }
  .weapon-type-badge--none { background: rgba(138,141,133,0.1); border-color: rgba(138,141,133,0.2); color: var(--ink-muted); }
  .monk-type-badge { background: rgba(232,121,249,0.12) !important; border-color: rgba(232,121,249,0.3) !important; color: var(--monk-glove) !important; }
  .weapon-modifier-badge { font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25); color: var(--accent3); letter-spacing: 0.04em; }
  .weapon-modifier-badge--hybrid { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.25); color: #10b981; }

  /* Weapon combine */
  .weapon-combine { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 20px; gap: 6px; }
  .weapon-combine-line { width: 1px; flex: 1; min-height: 20px; background: rgba(251,146,60,0.25); }
  .weapon-combine-icon { font-size: 1rem; color: var(--weapon-blade); opacity: 0.6; flex-shrink: 0; }
  .monk-combine-icon { color: var(--monk-glove) !important; font-size: 0.9rem; opacity: 0.8; }

  /* Weapon cards */
  .weapon-card { display: flex; flex-direction: column; gap: 8px; }
  .weapon-card--blade  { border-color: rgba(251,146,60,0.22); }
  .weapon-card--handle { border-color: rgba(52,211,153,0.22); }
  .weapon-card--glove  { border-color: rgba(232,121,249,0.25); background: linear-gradient(160deg, var(--surface2) 50%, rgba(232,121,249,0.04) 100%); }
  .weapon-card--essence { border-color: rgba(129,140,248,0.25); background: linear-gradient(160deg, var(--surface2) 50%, rgba(129,140,248,0.04) 100%); }
  .weapon-card--empty  { border-style: dashed; opacity: 0.4; }

  .weapon-type-label { color: var(--weapon-blade) !important; }
  .weapon-type-label--handle { color: var(--weapon-handle) !important; }
  .monk-type-label { color: var(--monk-glove) !important; }
  .monk-type-label--essence { color: var(--monk-essence) !important; }

  .weapon-tier-badge { display: inline-block; font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.25); color: var(--weapon-blade); letter-spacing: 0.06em; margin-top: 2px; width: fit-content; }
  .weapon-tier-badge--handle { background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.25); color: var(--weapon-handle); }
  .monk-tier-badge { background: rgba(232,121,249,0.12); border-color: rgba(232,121,249,0.25); color: var(--monk-glove); }
  .monk-tier-badge--essence { background: rgba(129,140,248,0.12); border-color: rgba(129,140,248,0.25); color: var(--monk-essence); }

  .weapon-meta-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 8px; border-radius: 5px; background: var(--surface3); font-size: 0.78rem; }
  .weapon-meta-label { color: var(--ink-muted); }
  .weapon-meta-val   { font-weight: 700; color: var(--accent2); }
  .weapon-section-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--ink-muted); font-weight: 700; margin-top: 2px; }

  .damage-type-grid, .scaling-grid { display: flex; flex-wrap: wrap; gap: 4px; }
  .damage-type-pill { display: flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 999px; background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.2); font-size: 0.7rem; }
  .dt-name { color: var(--ink-muted); }
  .dt-val  { font-weight: 700; color: var(--weapon-blade); }
  .scaling-pill { display: flex; align-items: center; gap: 4px; padding: 3px 7px; border-radius: 999px; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.2); font-size: 0.7rem; }
  .sc-name { color: var(--ink-muted); }
  .sc-val  { font-weight: 700; color: var(--accent3); }
  .sc-val-old { font-size: 0.65rem; opacity: 0.35; text-decoration: line-through; color: var(--ink-muted); margin-right: 2px; }
  .sc-val--new { color: var(--weapon-combined) !important; font-weight: 800; }
  .scaling-pill--boosted { border-color: rgba(251,191,36,0.3); background: rgba(251,191,36,0.08); }

  /* Shrine toggle */
  .shrine-toggle-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .shrine-btn { display: flex; align-items: center; gap: 8px; width: 100%; background: var(--surface2); border: 1px solid rgba(251,146,60,0.2); border-radius: var(--radius-sm); color: var(--ink-muted); font-family: var(--font-body); font-size: 0.8rem; padding: 8px 12px; cursor: pointer; transition: all 0.18s; text-align: left; }
  .shrine-btn:hover { border-color: rgba(251,146,60,0.4); background: rgba(251,146,60,0.06); }
  .shrine-btn--active { background: linear-gradient(135deg, rgba(251,191,36,0.12), rgba(251,146,60,0.08)); border-color: rgba(251,191,36,0.45); color: var(--weapon-combined); }
  .shrine-icon { font-size: 1rem; flex-shrink: 0; opacity: 0.8; }
  .shrine-label { flex: 1; font-weight: 600; letter-spacing: 0.02em; }
  .shrine-state { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.14em; padding: 2px 7px; border-radius: 999px; background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.2); color: var(--weapon-blade); }
  .shrine-btn--active .shrine-state { background: rgba(251,191,36,0.18); border-color: rgba(251,191,36,0.35); color: var(--weapon-combined); }
  .shrine-hint { font-size: 0.65rem; color: var(--weapon-combined); opacity: 0.65; text-align: center; letter-spacing: 0.04em; padding: 0 2px; }

  /* Detail layout */
  .detail-layout { display: flex; gap: 10px; align-items: flex-start; }
  .identity-col { flex: 0 0 200px; display: flex; flex-direction: column; gap: 10px; }
  .gear-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; align-items: start; }
  .slot-col { display: flex; flex-direction: column; }

  .inf-bridge { display: flex; align-items: center; gap: 4px; padding: 2px 12px; }
  .inf-bridge-line { flex: 1; height: 1px; background: var(--infusion-border); }
  .inf-bridge-icon { font-size: 0.6rem; color: var(--infusion); opacity: 0.6; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.1em; }

  .detail-card { background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .detail-card--infusion { border-color: var(--infusion-border); background: linear-gradient(160deg, var(--surface2) 50%, rgba(56,189,248,0.05) 100%); }

  .detail-head { display: flex; flex-direction: column; gap: 2px; }
  .detail-type { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.18em; color: var(--accent); font-weight: 700; }
  .detail-type--infusion { color: var(--infusion); }
  .detail-name { font-size: 0.9rem; font-weight: 600; color: var(--ink); }
  .detail-enchant-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
  .enchant-tag { font-size: 0.65rem; font-weight: 600; padding: 2px 7px; border-radius: 999px; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.25); color: var(--accent3); letter-spacing: 0.04em; }
  .detail-desc  { font-size: 0.78rem; color: var(--ink-muted); line-height: 1.45; }
  .detail-extra { font-size: 0.75rem; color: var(--accent2); }
  .infusion-note { font-size: 0.65rem; color: var(--infusion); opacity: 0.5; letter-spacing: 0.04em; }

  /* Perks panel */
  .perks-panel { border-color: rgba(245,158,11,0.13); background: linear-gradient(160deg, var(--surface) 60%, rgba(245,158,11,0.03) 100%); }
  .perks-title { color: var(--accent2); }
  .perks-grid { display: flex; flex-direction: column; gap: 6px; }

  .stat-list { display: flex; flex-direction: column; gap: 4px; }
  .stat-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: var(--surface3); font-size: 0.8rem; }
  .stat-row--infusion { background: rgba(56,189,248,0.06); }
  .stat-row--boosted { background: rgba(251,191,36,0.05); }
  .stat-val { font-weight: 700; color: var(--accent); white-space: nowrap; }
  .stat-val.neg { color: var(--neg); }
  .stat-val--infusion { color: var(--infusion); }
  .stat-val--infusion.neg { color: var(--neg); }
  .stat-val-group { display: flex; align-items: center; gap: 5px; }
  .stat-val-ghost { font-weight: 400; opacity: 0.35; font-size: 0.72rem; text-decoration: line-through; color: var(--ink-muted) !important; }
  .stat-val--new { color: var(--weapon-combined) !important; font-weight: 800; }

  .perk-list { display: flex; flex-direction: column; gap: 4px; }
  .perk-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; padding: 4px 6px; border-radius: 5px; }
  .perk-row--enchant { background: rgba(167,139,250,0.06); }
  .perk-val { font-weight: 700; color: var(--accent2); white-space: nowrap; }
  .perk-val--enchant { color: var(--accent3); }
  .perk-card { display: flex; flex-direction: column; gap: 2px; padding: 4px 0; border-bottom: 1px solid var(--border); }
  .perk-card:last-child { border-bottom: none; }
  .perk-name { font-weight: 600; }
  .perk-desc { font-size: 0.74rem; color: var(--ink-muted); line-height: 1.4; }
  .empty { color: var(--ink-muted); font-style: italic; font-size: 0.85rem; }

  /* Responsive */
  @media (max-width: 1100px) {
    .workspace { grid-template-columns: 1fr; }
    .controls-panel { position: static; }
  }
  @media (max-width: 1100px) {
    .weapon-result-layout { grid-template-columns: 1fr auto 1fr; }
    .weapon-combined-card { grid-column: 1 / -1; }
    .weapon-combine--arrow { display: none; }
  }
  @media (max-width: 900px) {
    .summary-layout { grid-template-columns: 1fr; }
    .summary-stats { max-height: none; }
  }
  @media (max-width: 700px) {
    .weapon-result-layout { grid-template-columns: 1fr; }
    .weapon-combine { flex-direction: row; padding-top: 0; }
    .weapon-combine-line { width: 40px; height: 1px; min-height: unset; }
    .summary-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .detail-layout { flex-direction: column; }
    .identity-col { flex: none; width: 100%; }
  }
  @media (max-width: 640px) {
    header { flex-direction: column; align-items: flex-start; }
    .summary-grid { grid-template-columns: repeat(2, 1fr); }
  }
  /* ── CDR Display ──────────────────────────────────────────────────── */
  .sg-cd-row { display: flex; align-items: center; gap: 4px; margin-top: 3px; flex-wrap: wrap; }
  .sg-cd-base { font-size: 0.65rem; color: var(--ink-muted); text-decoration: line-through; opacity: 0.45; }
  .sg-cd-arrow { font-size: 0.6rem; color: var(--ink-muted); opacity: 0.35; }
  .sg-cd-final { font-size: 0.8rem; font-weight: 800; color: #34d399; }

  .cdr-block { background: rgba(52,211,153,0.05); border: 1px solid rgba(52,211,153,0.18); border-radius: 7px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px; margin-top: 2px; }
  .cdr-block-header { display: flex; align-items: center; gap: 5px; }
  .cdr-icon { font-size: 0.8rem; }
  .cdr-title { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; color: #34d399; }
  .cdr-step { display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; padding: 2px 4px; }
  .cdr-source { color: var(--ink-muted); }
  .cdr-mult { font-weight: 700; color: #34d399; }
  .cdr-result { display: flex; align-items: center; gap: 7px; padding-top: 6px; border-top: 1px solid rgba(52,211,153,0.15); margin-top: 2px; }
  .cdr-cd-old { font-size: 0.75rem; color: var(--ink-muted); text-decoration: line-through; opacity: 0.4; }
  .cdr-arrow { font-size: 0.7rem; color: var(--ink-muted); opacity: 0.35; }
  .cdr-cd-new { font-size: 0.95rem; font-weight: 800; color: #34d399; }
</style>