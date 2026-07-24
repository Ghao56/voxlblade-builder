<script lang="ts">
  import { fly, fade } from 'svelte/transition'
  import { onMount, onDestroy } from 'svelte';
  import EmotionalTracker from './EmotionalTracker.svelte';
  import Modal from './lib/Modal.svelte'
  import { build } from './lib/store'
  import { addToast } from './lib/stores/toast'
  import Button from './lib/ui/Button.svelte'
  import type { BuildState } from './lib/types'
  import {
    BUILD_STATE_DEFAULTS as DEFAULTS,
    SAVE_KEY_MAP as KEY_MAP, SAVE_KEY_UNMAP as KEY_UNMAP,
    ENCH_MAP, ENCH_UNMAP,
    MAX_BUILD_SLOTS, CONFIRM_TIMEOUT_MS, STORAGE_KEY_SAVES, IMPORT_SUCCESS_DISPLAY_MS
  } from './lib/constants'
  import { isMonkGuild } from './lib/engine/data/character'

  const STORAGE_KEY = STORAGE_KEY_SAVES

  interface SaveSlot {
    name: string
    timestamp: number
    state: BuildState
  }

  let timeouts: number[] = [];
  function clearAllTimeouts() {
    timeouts.forEach(clearTimeout);
    timeouts = [];
  }
  onDestroy(clearAllTimeouts);

  function loadSlots(): SaveSlot[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return (parsed as SaveSlot[]).filter(s => s !== null && s !== undefined)
    } catch { return [] }
  }

  function persistSlots(s: SaveSlot[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }

  let slots: SaveSlot[] = loadSlots()
  let editingIndex: number | null = null
  let editingName = ''
  let confirmLoad: number | null = null
  let confirmDelete: number | null = null
  let duplicateModal: { targetIndex: number; duplicates: { slot: SaveSlot; index: number }[] } | null = null
  let open = false
  let searchQuery = ''
  let sortBy: 'slot' | 'name' | 'date' = 'slot'
  let filteredSlots: { slot: SaveSlot; origIndex: number }[] = []
  let draggingFrom: number | null = null
  let dragOverIdx: number | null = null

  // Touch drag state
  let touchDragging = false
  let touchStartIdx: number | null = null
  let touchGhostEl: HTMLDivElement | null = null
  let touchGhostSlotEl: HTMLDivElement | null = null
  let touchStartY = 0
  let touchMoved = false
  const TOUCH_DRAG_THRESHOLD = 8

  $: canDrag = sortBy === 'slot' && !searchQuery.trim()

  function moveSlot(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const [moved] = slots.splice(fromIdx, 1)
    slots.splice(toIdx, 0, moved)
    slots = [...slots]
    persistSlots(slots)
  }

  function handleDragStart(e: DragEvent, idx: number) {
    if (!canDrag) return
    draggingFrom = idx
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
    }
  }

  function handleDragOver(e: DragEvent, idx: number) {
    if (draggingFrom === null || draggingFrom === idx) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dragOverIdx = idx
  }

  function handleDragLeave(idx: number) {
    if (dragOverIdx === idx) dragOverIdx = null
  }

  function handleDrop(e: DragEvent, idx: number) {
    e.preventDefault()
    if (draggingFrom !== null && draggingFrom !== idx) {
      moveSlot(draggingFrom, idx)
    }
    draggingFrom = null
    dragOverIdx = null
  }

  function handleDragEnd() {
    draggingFrom = null
    dragOverIdx = null
  }

  function touchHitTest(y: number): number | null {
    const listEl = document.querySelector('.saves-list')
    if (!listEl) return null
    const slotEls = listEl.querySelectorAll('.save-slot')
    for (const el of slotEls) {
      const r = el.getBoundingClientRect()
      if (y >= r.top && y <= r.bottom) {
        return Number(el.getAttribute('data-slot-idx'))
      }
    }
    return null
  }

  function handleTouchStart(e: TouchEvent, idx: number) {
    if (!canDrag) return
    const touch = e.touches[0]
    touchStartIdx = idx
    touchStartY = touch.clientY
    touchMoved = false
  }

  function handleTouchMove(e: TouchEvent) {
    if (touchStartIdx === null) return
    const touch = e.touches[0]
    const dy = Math.abs(touch.clientY - touchStartY)
    if (!touchMoved && dy < TOUCH_DRAG_THRESHOLD) return

    if (!touchMoved) {
      touchMoved = true
      touchDragging = true
      draggingFrom = touchStartIdx

      const slotEl = (e.currentTarget as HTMLElement).closest('.save-slot') as HTMLDivElement | null
      if (slotEl) {
        touchGhostSlotEl = slotEl
        slotEl.classList.add('dragging-source')

        touchGhostEl = document.createElement('div')
        touchGhostEl.className = 'touch-drag-ghost'
        touchGhostEl.textContent = slots[touchStartIdx]?.name ?? `Build ${touchStartIdx + 1}`
        document.body.appendChild(touchGhostEl)
      }
    }

    if (touchGhostEl) {
      touchGhostEl.style.left = '16px'
      touchGhostEl.style.top = `${touch.clientY - 20}px`
    }

    const hitIdx = touchHitTest(touch.clientY)
    dragOverIdx = hitIdx !== null && hitIdx !== touchStartIdx ? hitIdx : null

    e.preventDefault()
  }

  function handleTouchEnd() {
    if (touchDragging && touchStartIdx !== null && dragOverIdx !== null && dragOverIdx !== touchStartIdx) {
      moveSlot(touchStartIdx, dragOverIdx)
    }
    if (touchGhostSlotEl) {
      touchGhostSlotEl.classList.remove('dragging-source')
      touchGhostSlotEl = null
    }
    if (touchGhostEl) {
      touchGhostEl.remove()
      touchGhostEl = null
    }
    touchDragging = false
    touchStartIdx = null
    draggingFrom = null
    dragOverIdx = null
    touchMoved = false
  }

  $: {
    let indexed = slots.map((s, i) => ({ slot: s, origIndex: i }))
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      indexed = indexed.filter(({ slot }) => {
        const summary = getBuildSummary(slot.state).toLowerCase()
        return slot.name.toLowerCase().includes(q) || summary.includes(q)
      })
    }
    const mode: string = sortBy
    if (mode === 'name') {
      indexed.sort((a, b) => a.slot.name.localeCompare(b.slot.name))
    } else if (mode === 'date') {
      indexed.sort((a, b) => b.slot.timestamp - a.slot.timestamp)
    }
    filteredSlots = indexed
  }

  function startEdit(i: number) {
    editingIndex = i
    editingName = slots[i]?.name ?? `Build ${i + 1}`
  }
  $: if (!open) currentExportCode = ''

  let currentExportCode = ''

  async function exportCurrent() {
    currentExportCode = '...'
    try {
      currentExportCode = await encodeState($build)
    } catch {
      currentExportCode = ''
    }
  }

  function confirmEdit(i: number) {
    if (slots[i] && editingIndex === i) {
      slots[i] = { ...slots[i]!, name: editingName.trim() || `Build ${i + 1}` }
      slots = [...slots]
      persistSlots(slots)
    }
    editingIndex = null
  }

  function findAllDuplicates(state: BuildState, excludeIndex: number): { slot: SaveSlot; index: number }[] {
    const result: { slot: SaveSlot; index: number }[] = []
    for (let i = 0; i < slots.length; i++) {
      if (i === excludeIndex) continue
      if (JSON.stringify(slots[i].state) === JSON.stringify(state)) {
        result.push({ slot: slots[i], index: i })
      }
    }
    return result
  }

  function saveBuild(i: number) {
    const isNew = i >= slots.length
    const dups = findAllDuplicates($build, isNew ? -1 : i)
    if (dups.length > 0) {
      duplicateModal = { targetIndex: i, duplicates: dups }
      return
    }
    doSave(i)
  }

  function doSave(i: number) {
    duplicateModal = null
    const buildClone = structuredClone($build)
    if (i < slots.length) {
      slots[i] = { ...slots[i], timestamp: Date.now(), state: buildClone }
    } else {
      slots.push({ name: `Build ${slots.length + 1}`, timestamp: Date.now(), state: buildClone })
    }
    slots = [...slots]
    persistSlots(slots)
    addToast(`Saved to slot ${i + 1}`, 'success')
    editingIndex = i
    editingName = slots[i].name
  }

  function loadBuild(i: number) {
    if (confirmLoad === i) {
      const slot = slots[i]
      if (slot) {
        build.set(structuredClone(slot.state))
        addToast(`Loaded build from slot ${i + 1}`, 'success')
      }
      confirmLoad = null
      duplicateModal = null
    } else {
      confirmLoad = i
      duplicateModal = null
      
      const timer = window.setTimeout(() => { 
        if (confirmLoad === i) confirmLoad = null 
      }, CONFIRM_TIMEOUT_MS);
      timeouts.push(timer);
    }
  }

  function deleteSlot(i: number) {
    if (confirmDelete === i) {
      slots.splice(i, 1)
      slots = [...slots]
      persistSlots(slots)
      confirmDelete = null
      duplicateModal = null
      addToast(`Deleted slot ${i + 1}`, 'info')
    } else {
      confirmDelete = i
      duplicateModal = null
      const timer = window.setTimeout(() => { 
        if (confirmDelete === i) confirmDelete = null 
      }, CONFIRM_TIMEOUT_MS);
      timeouts.push(timer);
    }
  }

  function formatDate(ts: number) {
    const d = new Date(ts)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  function getBuildSummary(state: BuildState) {
    const parts: string[] = []
    if (state.race) parts.push(state.race)
    if (state.guild) parts.push(`${state.guild} R${state.guildRank}`)
    if (isMonkGuild(state.guild)) {
      if (state.monkGlove || state.monkEssence) parts.push(`Monk: ${state.monkGlove || 'No glove'} + ${state.monkEssence || 'No essence'}`)
    } else if (state.weaponBlade || state.weaponHandle) {
      parts.push(`${state.weaponBlade || 'No blade'} + ${state.weaponHandle || 'No handle'}`)
    }
    if (state.selectedWeaponArt) parts.push(`WA: ${state.selectedWeaponArt}`)
    
    return parts.join(' · ') || 'Empty build'
  }
  async function readStream(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    const chunks: Uint8Array[] = []
    const reader = readable.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }
    } finally {
      reader.releaseLock()
    }

    const total = chunks.reduce((a, c) => a + c.length, 0)
    const merged = new Uint8Array(total)
    let offset = 0
    for (const c of chunks) { 
      merged.set(c, offset)
      offset += c.length 
    }
    return merged
  }

  async function compressToBase64(str: string): Promise<string> {
    const enc = new TextEncoder().encode(str)
    const cs = new CompressionStream('deflate-raw')
    const writer = cs.writable.getWriter()
    
    writer.write(enc)
    writer.close()
    
    const merged = await readStream(cs.readable)
    
    const binString = Array.from(merged, b => String.fromCharCode(b)).join('')
    
    return btoa(binString)
      .replace(/\+/g,'-')
      .replace(/\//g,'_')
      .replace(/=/g,'')
  }

  async function decompressFromBase64(b64: string): Promise<string> {
    const std = b64.replace(/-/g,'+').replace(/_/g,'/')
    const pad = std + '='.repeat((4 - std.length % 4) % 4)
    const bytes = Uint8Array.from(atob(pad), c => c.charCodeAt(0))
    
    const ds = new DecompressionStream('deflate-raw')
    const writer = ds.writable.getWriter()
    writer.write(bytes)
    writer.close()
    
    const merged = await readStream(ds.readable)
    return new TextDecoder().decode(merged)
  }

  function encodeState(state: BuildState): Promise<string> {
    const slim: Record<string, any> = {}
    for (const [k, v] of Object.entries(state)) {
      if (k === 'enchantments') continue
      if (JSON.stringify(v) === JSON.stringify(DEFAULTS[k])) continue
      const sk = KEY_MAP[k] ?? k
      slim[sk] = v
    }
    const enchSlim: Record<string, any> = {}
    for (const [slot, arr] of Object.entries(state.enchantments)) {
      const filtered = (arr as string[]).filter(Boolean)
      if (filtered.length > 0) {
        enchSlim[ENCH_MAP[slot] ?? slot] = filtered.length === 1 ? filtered[0] : filtered
      }
    }
    if (Object.keys(enchSlim).length > 0) slim['en'] = enchSlim
    return compressToBase64(JSON.stringify(slim))
  }

  const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
  const VALID_ENCH_SLOTS = new Set(['helmet', 'chestplate', 'leggings', 'ring', 'rune'])

  function isDangerousKey(k: string): boolean {
    return DANGEROUS_KEYS.has(k)
  }

  function sanitizeField(key: string, value: unknown): { ok: boolean; value?: unknown } {
    if (!(key in DEFAULTS)) return { ok: false }
    const defaultVal = (DEFAULTS as Record<string, unknown>)[key]
    const expectedType = typeof defaultVal

    if (expectedType === 'number') {
      const n = typeof value === 'number' ? value : NaN
      if (!Number.isFinite(n)) return { ok: false }
      return { ok: true, value: n }
    }
    if (expectedType === 'boolean') {
      return typeof value === 'boolean' ? { ok: true, value } : { ok: false }
    }
    if (expectedType === 'string') {
      return typeof value === 'string' ? { ok: true, value } : { ok: false }
    }
    if (expectedType === 'object' && defaultVal !== null) {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return { ok: false }
      const clean: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (isDangerousKey(k)) continue
        clean[k] = v
      }
      return { ok: true, value: clean }
    }
    return { ok: false }
  }

  async function decodeState(code: string): Promise<BuildState> {
    let slim: Record<string, any>
    try {
      const json = await decompressFromBase64(code)
      const parsed = JSON.parse(json)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Malformed payload')
      }
      slim = parsed
    } catch {
      try {
        const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))))
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Malformed payload')
        }
        if (parsed.race !== undefined) {
          slim = parsed
        } else {
          throw new Error('Invalid code')
        }
      } catch {
        throw new Error('Invalid code')
      }
    }

    const full: Record<string, any> = { ...DEFAULTS }
    for (const [rawKey, v] of Object.entries(slim)) {
      if (rawKey === 'en') continue
      if (isDangerousKey(rawKey)) continue
      const key = KEY_UNMAP[rawKey] ?? rawKey
      if (isDangerousKey(key)) continue
      const result = sanitizeField(key, v)
      if (result.ok) full[key] = result.value
    }

    const enchFull: Record<string, [string,string,string]> = {
      helmet:['','',''], chestplate:['','',''], leggings:['','',''],
      ring:['','',''], rune:['','','']
    }
    if (slim['en'] && typeof slim['en'] === 'object' && !Array.isArray(slim['en'])) {
      for (const [sk, v] of Object.entries(slim['en'] as Record<string,any>)) {
        if (isDangerousKey(sk)) continue
        const slot = ENCH_UNMAP[sk] ?? sk
        if (!VALID_ENCH_SLOTS.has(slot)) continue
        if (typeof v === 'string') {
          enchFull[slot] = [v, '', '']
        } else if (Array.isArray(v)) {
          const safe = v.filter(x => typeof x === 'string').slice(0, 3)
          enchFull[slot] = [safe[0] ?? '', safe[1] ?? '', safe[2] ?? ''] as [string,string,string]
        }
      }
    }
    full['enchantments'] = enchFull
    return full as BuildState
  }

  let shareCode = ''
  let importCode = ''
  let importError = ''
  let importSuccess = false
  let exportingSlot: number | null = null

  async function exportSlot(i: number) {
    const slot = slots[i]
    if (!slot) return
    exportingSlot = i
    importError = ''
    shareCode = '...'
    try {
      shareCode = await encodeState(slot.state)
    } catch {
      shareCode = ''
      importError = 'Export failed!'
    }
  }

  async function importBuild() {
    try {
      const state = await decodeState(importCode.trim())
      if (!state.race && !state.helmet && !state.weaponBlade) {
        importError = 'Invalid build data!'
        addToast('Invalid build data', 'error')
        return
      }
      build.set(state)
      importError = ''
      importSuccess = true
      setTimeout(() => importSuccess = false, IMPORT_SUCCESS_DISPLAY_MS)
      addToast('Build imported', 'success')
    } catch {
      importError = 'Invalid code!'
      addToast('Invalid import code', 'error')
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(shareCode)
    addToast('Code copied', 'success')
  }
  function focusOnMount(node: HTMLInputElement) {
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }
</script>

<div class="saves-wrapper"><button class="saves-toggle" onclick={() => open = !open}>
  <svg class="saves-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <rect x="5" y="2" width="6" height="5" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="4" y="9" width="8" height="4" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>
  <span class="lbl">Builds</span>
  <span class="cnt">{slots.length} saved</span>
  <span class="arr">{open ? '▲' : '▼'}</span>
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="saves-backdrop" transition:fade={{ duration: 150 }} onclick={() => open = false}></div>
  <div class="saves-panel" transition:fly={{ y: -8, duration: 200 }}>
    <div class="saves-header">
      <div class="drag-handle" aria-hidden="true"></div>
      <span class="saves-title">Saved Builds</span>
      <span class="saves-hint">Click load/delete twice to confirm</span>
      <button class="saves-close" onclick={() => open = false} aria-label="Close saves panel"><i class="fa fa-times"></i></button>
    </div>
    <div class="saves-toolbar">
      <div class="search-wrap">
        <span class="search-icon" aria-hidden="true"><i class="fa fa-search"></i></span>
        <input
          class="search-input"
          type="text"
          placeholder="Search builds…"
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button class="search-clear" onclick={() => searchQuery = ''} aria-label="Clear search"><i class="fa fa-times"></i></button>
        {/if}
      </div>
      <div class="sort-group">
        <button class="sort-btn" class:active={sortBy === 'slot'} onclick={() => sortBy = 'slot'} title="Sort by slot"><i class="fa fa-list-ol"></i></button>
        <button class="sort-btn" class:active={sortBy === 'name'} onclick={() => sortBy = 'name'} title="Sort by name"><i class="fa fa-font"></i></button>
        <button class="sort-btn" class:active={sortBy === 'date'} onclick={() => sortBy = 'date'} title="Sort by date"><i class="fa fa-calendar"></i></button>
      </div>
    </div>
    {#if !canDrag}
      <div class="drag-disabled-hint">Reorder disabled while sorted or filtered</div>
    {/if}
    <div class="saves-list">
      {#if filteredSlots.length === 0}
        <div class="saves-empty">
          {#if searchQuery}
            <span class="empty-icon"><i class="fa fa-search"></i></span>
            <span>No builds matching "{searchQuery}"</span>
          {:else}
            <span class="empty-icon"><i class="fa fa-inbox"></i></span>
            <span>No saved builds yet</span>
          {/if}
        </div>
      {/if}
      {#each filteredSlots as { slot, origIndex: i } (i)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="save-slot filled"
          class:drag-over={dragOverIdx === i}
          class:dragging-source={draggingFrom === i}
          draggable={canDrag}
          data-slot-idx={i}
          ondragstart={(e) => handleDragStart(e, i)}
          ondragover={(e) => handleDragOver(e, i)}
          ondragleave={() => handleDragLeave(i)}
          ondrop={(e) => handleDrop(e, i)}
          ondragend={handleDragEnd}
        >
          <div class="slot-left">
            {#if canDrag}
              <div class="slot-drag-handle" aria-hidden="true"
                ontouchstart={(e) => handleTouchStart(e, i)}
                ontouchmove={(e) => handleTouchMove(e)}
                ontouchend={handleTouchEnd}
                ontouchcancel={handleTouchEnd}>
                <i class="fa fa-grip-vertical"></i>
              </div>
            {/if}
            <div class="slot-num">{i + 1}</div>
            <div class="slot-info">
              {#if editingIndex === i}
                <label for="edit-name-{i}" class="sr-only">Edit Build Name</label>
                <input 
                  id="edit-name-{i}"
                  class="name-input" 
                  bind:value={editingName} 
                  use:focusOnMount
                  onblur={() => confirmEdit(i)}
                  onkeydown={e => { 
                    if (e.key === 'Enter') confirmEdit(i);
                    if (e.key === 'Escape') editingIndex = null 
                  }} 
                />
              {:else}
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <span class="slot-name" role="button" tabindex="0" onclick={() => startEdit(i)} onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') startEdit(i) }} aria-label="Rename build {slot.name}">
                  {slot.name}<span class="edit-icon" aria-hidden="true"><i class="fa fa-pencil"></i></span>
                </span>
              {/if}
              <div class="slot-meta">
                <span class="slot-time">{formatDate(slot.timestamp)}</span>
                <span class="slot-summary">{getBuildSummary(slot.state)}</span>
              </div>
            </div>
          </div>
          <div class="slot-actions">
            <Button variant="positive" size="sm" onclick={() => saveBuild(i)}>
              <i class="fa fa-arrow-up"></i> Save
            </Button>
            <Button variant={confirmLoad === i ? 'warning' : 'info'} size="sm" onclick={() => loadBuild(i)}>
              {@html confirmLoad === i ? '<i class="fa fa-check"></i> Sure?' : '<i class="fa fa-arrow-down"></i> Load'}
            </Button>
            <button class="btn btn-share" class:btn-share--active={exportingSlot === i}
              onclick={() => exportSlot(i)} title="Export this build as code" aria-label="Export Slot {i+1}">
              <i class="fa fa-upload"></i>
            </button>
            <Button variant={confirmDelete === i ? 'warning' : 'negative'} size="sm" onclick={() => deleteSlot(i)} disabled={false}>
              {@html confirmDelete === i ? '<i class="fa fa-exclamation-triangle"></i> Sure?' : '<i class="fa fa-times"></i>'}
            </Button>
          </div>
        </div>
      {/each}
      <button class="add-slot-btn" onclick={() => saveBuild(slots.length)}>
        <i class="fa fa-plus"></i> Save Current Build
      </button>
    </div>

    <div class="share-section">
      <div class="share-row">
        <span class="export-label">Current build:</span>
        <button class="btn btn-share" class:btn-share--active={currentExportCode === '...'} onclick={exportCurrent}><i class="fa fa-upload"></i> Export</button>
        {#if currentExportCode && currentExportCode !== '...'}
          <label for="current-build-code" class="sr-only">Current Build Code</label>
          <input id="current-build-code" class="share-code" value={currentExportCode} readonly
            onclick={e => (e.target as HTMLInputElement).select()} />
          <button class="btn btn-copy" onclick={() => navigator.clipboard.writeText(currentExportCode)}>Copy</button>
        {/if}
      </div>

      {#if exportingSlot !== null && shareCode}
        <div class="share-row">
          <span class="export-label">Slot {exportingSlot + 1} code:</span>
          <label for="slot-build-code" class="sr-only">Slot {exportingSlot + 1} Code</label>
          <input id="slot-build-code" class="share-code" value={shareCode} readonly
            onclick={e => (e.target as HTMLInputElement).select()} />
          <button class="btn btn-copy" onclick={copyCode}>Copy</button>
        </div>
      {/if}

      <div class="import-row">
        <label for="import-build-code" class="sr-only">Paste Build Code</label>
        <input id="import-build-code" class="share-code" bind:value={importCode} placeholder="Paste build code here…" />
        <button class="btn btn-paste" onclick={async () => { try { importCode = await navigator.clipboard.readText() } catch {} }} title="Paste from clipboard"><i class="fa fa-clipboard"></i> Paste</button>
        <Button variant="info" size="sm" onclick={importBuild}><i class="fa fa-download"></i> Import</Button>
      </div>
  {#if importError}<span class="import-err">{importError}</span>{/if}
  {#if importSuccess}<span class="import-ok"><i class="fa fa-check"></i> Loaded!</span>{/if}
    </div>
  </div>
{/if}

</div>

{#if duplicateModal}
  <Modal onclose={() => { duplicateModal = null }}>
    <div class="dup-modal">
      <div class="dup-modal-icon"><i class="fa fa-exclamation-triangle"></i></div>
      <h3 class="dup-modal-title">Duplicate Build{duplicateModal.duplicates.length > 1 ? 's' : ''} Detected</h3>
      <p class="dup-modal-msg">
        This build is identical to {duplicateModal.duplicates.length} existing slot{duplicateModal.duplicates.length > 1 ? 's' : ''}:
      </p>
      <div class="dup-modal-list">
        {#each duplicateModal.duplicates as dup}
          <div class="dup-modal-item">
            <span class="dup-modal-slot">Slot {dup.index + 1}</span>
            <span class="dup-modal-name">{dup.slot.name}</span>
          </div>
        {/each}
      </div>
      <p class="dup-modal-msg dup-modal-msg--sub">
        Save to <strong>Slot {duplicateModal.targetIndex + 1}</strong> anyway?
      </p>
      {#if duplicateModal.duplicates.length >= 2}
        <p class="dup-modal-msg dup-modal-msg--sub" style="opacity:.6">
          {duplicateModal.duplicates.length} duplicate{duplicateModal.duplicates.length > 1 ? 's' : ''} can be cleaned up now or later from the saves panel.
        </p>
      {/if}
      <div class="dup-modal-actions">
        <Button variant="neutral" onclick={() => { duplicateModal = null }}>
          <i class="fa fa-times"></i> Cancel
        </Button>
        {#if duplicateModal.duplicates.length >= 2}
          <Button variant="warning" onclick={() => {
            const dups = duplicateModal!.duplicates
            const indicesToRemove = dups.map(d => d.index).sort((a, b) => b - a)
            let adjustedTarget = duplicateModal!.targetIndex
            for (const idx of indicesToRemove) {
              slots.splice(idx, 1)
              if (idx < adjustedTarget) adjustedTarget--
            }
            slots = [...slots]
            persistSlots(slots)
            doSave(adjustedTarget)
            addToast(`Deleted ${dups.length} duplicate${dups.length > 1 ? 's' : ''}`, 'info')
          }}>
            <i class="fa fa-trash"></i> Delete {duplicateModal.duplicates.length} Duplicates & Save
          </Button>
        {/if}
        <Button variant="positive" onclick={() => doSave(duplicateModal!.targetIndex)}>
          <i class="fa fa-check"></i> Save Anyway
        </Button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .sr-only {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; 
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }

  .saves-toggle {
    display:flex;align-items:center;gap:7px;padding:8px 14px;
    background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);
    border-radius:8px;color:var(--accent);font-family:var(--font-body);
    font-size:.78rem;font-weight:700;cursor:pointer;transition:all .15s;
  }
  .saves-toggle:hover{background:rgba(74,222,128,.14);border-color:rgba(74,222,128,.4);}
  .lbl{letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;}
  .cnt{font-size:.62rem;background:rgba(74,222,128,.15);border:1px solid rgba(74,222,128,.25);border-radius:999px;padding:1px 6px;}
  .arr{font-size:.6rem;opacity:.5;}
  .saves-wrapper{position:relative;}
  .saves-panel{
    position:absolute;top:calc(100% + 4px);left:0;z-index:var(--z-dropdown);
    background:var(--surface);border:1px solid rgba(74,222,128,.18);
    border-radius:10px;padding:14px;min-width:420px;
    display:flex;flex-direction:column;gap:10px;
  }
  .saves-header{display:flex;align-items:baseline;justify-content:space-between;}
  .saves-title{font-size:.7rem;text-transform:uppercase;letter-spacing:.16em;font-weight:700;color:var(--accent);}
  .saves-hint{font-size:.62rem;color:var(--ink-muted);opacity:.5;font-style:italic;}
  .drag-disabled-hint{
    font-size:.6rem;color:var(--accent2);opacity:.6;font-style:italic;
    padding:0 2px;line-height:1;
  }
  .saves-toolbar{display:flex;gap:6px;align-items:center;}
  .search-wrap{flex:1;position:relative;display:flex;align-items:center;}
  .search-icon{position:absolute;left:8px;font-size:.7rem;pointer-events:none;opacity:.4;color:var(--ink-muted);}
  .search-input{
    width:100%;padding:5px 24px 5px 24px;border-radius:6px;border:1px solid var(--border);
    background:var(--surface2);color:var(--ink);font-size:.72rem;font-family:var(--font-body);
    outline:none;transition:border-color .15s;
  }
  .search-input:focus{border-color:rgba(74,222,128,.4);}
  .search-input::placeholder{color:var(--ink-muted);opacity:.4;}
  .search-clear{
    position:absolute;right:4px;background:none;border:none;color:var(--ink-muted);
    font-size:.7rem;cursor:pointer;padding:2px 4px;border-radius:3px;line-height:1;
  }
  .search-clear:hover{background:var(--surface3);color:var(--ink);}
  .sort-group{display:flex;gap:2px;flex-shrink:0;}
  .sort-btn{
    padding:4px 6px;border-radius:5px;border:1px solid var(--border);background:var(--surface2);
    color:var(--ink-muted);font-size:.6rem;font-weight:700;cursor:pointer;
    transition:all .15s;line-height:1;
  }
  .sort-btn:hover{background:var(--surface3);color:var(--ink);}
  .sort-btn.active{background:rgba(74,222,128,.12);border-color:rgba(74,222,128,.3);color:var(--accent);}
  .saves-empty{
    display:flex;flex-direction:column;align-items:center;gap:4px;
    padding:16px 8px;color:var(--ink-muted);font-size:.72rem;opacity:.5;text-align:center;
  }
  .empty-icon{font-size:1.2rem;}
  .saves-list{display:flex;flex-direction:column;gap:6px;max-height:420px;overflow-y:auto;
    scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.08) transparent;}
  .saves-list::-webkit-scrollbar{width:5px;}
  .saves-list::-webkit-scrollbar-track{background:transparent;}
  .saves-list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:3px;}
  .add-slot-btn{
    display:flex;align-items:center;justify-content:center;gap:6px;
    width:100%;padding:8px 12px;border-radius:8px;
    background:transparent;border:1px dashed var(--border);
    color:var(--ink-muted);font-family:var(--font-body);font-size:.75rem;font-weight:600;
    cursor:pointer;transition:all var(--duration-fast) var(--ease-out);
  }
  .add-slot-btn:hover{background:rgba(74,222,128,.08);border-color:rgba(74,222,128,.3);color:var(--accent);}
  .add-slot-btn i{font-size:.7rem;}
  .save-slot{
    display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:9px 12px;border-radius:8px;
    background:var(--surface2);border:1px solid var(--border);
    transition: border-color var(--duration-fast) var(--ease-out),
                background var(--duration-fast) var(--ease-out),
                box-shadow var(--duration-normal) var(--ease-out),
                transform .15s var(--ease-out),
                opacity .15s var(--ease-out);
  }
  .save-slot.filled{border-color:rgba(74,222,128,.12);}
  .save-slot.filled:hover{border-color:rgba(74,222,128,.25);}
  .save-slot[draggable="true"]{cursor:grab;}
  .save-slot[draggable="true"]:active{cursor:grabbing;}
  .save-slot.drag-over{
    border-color:rgba(74,222,128,.6)!important;
    box-shadow:0 0 0 2px rgba(74,222,128,.15);
    background:rgba(74,222,128,.06);
    transform:scale(1.01);
  }
  .save-slot.dragging-source{opacity:.35;pointer-events:none;transform:scale(.98);}
  .slot-drag-handle{
    display:flex;align-items:center;justify-content:center;
    width:18px;flex-shrink:0;color:var(--ink-muted);opacity:.45;
    cursor:grab;font-size:.72rem;transition:opacity .15s,background .15s;
    user-select:none;-webkit-user-select:none;
    border-radius:4px;padding:2px;
    touch-action:none;-webkit-touch-callout:none;
  }
  .slot-drag-handle:hover{opacity:.85;background:rgba(255,255,255,.06);}
  .slot-drag-handle:active{cursor:grabbing;}
  .slot-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0;}
  .slot-num{
    width:22px;height:22px;border-radius:5px;flex-shrink:0;
    background:var(--surface3);border:1px solid var(--border);
    display:flex;align-items:center;justify-content:center;
    font-size:.62rem;font-weight:800;color:var(--ink-muted);
  }
  .slot-info{display:flex;flex-direction:column;gap:2px;min-width:0;}
  .slot-name{
    background:none;border:none;padding:0;font-size:.82rem;font-weight:700;
    color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:5px;
    font-family:var(--font-body);text-align:left;outline:none;width:fit-content;
  }
  .slot-name:focus-visible{box-shadow:0 0 0 2px rgba(74,222,128,.4);border-radius:4px;}
  .slot-name:hover .edit-icon{opacity:.7;}
  .edit-icon{font-size:.6rem;color:var(--ink-muted);opacity:0;transition:opacity .15s;}
  .name-input{
    background:var(--surface3);border:1px solid rgba(167,139,250,.4);
    border-radius:5px;color:var(--ink);font-family:var(--font-body);
    font-size:.82rem;font-weight:700;padding:2px 7px;outline:none;width:100%;max-width:200px;
  }
  .slot-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .slot-time{font-size:.62rem;color:var(--ink-muted);opacity:.5;}
  .slot-summary{font-size:.62rem;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px;}
  .slot-actions{display:flex;align-items:center;gap:5px;flex-shrink:0;}
  .btn{
    font-size:.68rem;font-weight:700;font-family:var(--font-body);
    padding:4px 9px;border-radius:6px;cursor:pointer;
    transition:all .15s;white-space:nowrap;border:1px solid transparent;
  }


  .share-section{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--border);}
  .share-row,.import-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
  .share-code{
    flex:1;min-width:0;background:var(--surface3);border:1px solid var(--border-strong);
    border-radius:6px;color:var(--ink);font-family:monospace;font-size:.7rem;
    padding:5px 9px;outline:none;
  }
  .share-code:focus{border-color:rgba(167,139,250,.4);}
  .btn-share{background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.25);color:var(--accent3);}
  .btn-share:hover{background:rgba(167,139,250,.2);border-color:rgba(167,139,250,.5);}
  .btn-copy{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.25);color:var(--accent);flex-shrink:0;}
  .btn-copy:hover{background:rgba(74,222,128,.2);}
  .import-err{font-size:.7rem;color:var(--neg);}
  .import-ok{font-size:.7rem;color:var(--accent);}
  .export-label{font-size:.62rem;color:var(--ink-muted);white-space:nowrap;flex-shrink:0;}
  .btn-share--active{background:rgba(167,139,250,.25);border-color:rgba(167,139,250,.6);}
  .saves-icon { color: currentColor; flex-shrink: 0; }
  .btn-paste {
    background: rgba(251,191,36,.08); border-color: rgba(251,191,36,.22);
    color: var(--accent2); flex-shrink: 0;
  }
  .btn-paste:hover { background: rgba(251,191,36,.18); }

  .saves-backdrop { display: none; }
  .drag-handle { display: none; }
  .saves-close {
    display:none; background:none; border:none; color:var(--ink-muted);
    font-size:1.1rem; cursor:pointer; padding:2px 6px; border-radius:4px;
    line-height:1; margin-left:auto;
  }
  .saves-close:hover{background:var(--surface3);color:var(--ink);}

  @media (max-width:640px) {
    .saves-backdrop {
      display: block; position: fixed; inset: 0; z-index: var(--z-modal-backdrop);
      background: rgba(0,0,0,.45);
      animation: bdFadeIn .25s ease;
    }
    @keyframes bdFadeIn { from { opacity: 0; } to { opacity: 1; } }

    .saves-panel {
      position: fixed; left: 0; right: 0; bottom: 0; top: auto; z-index: var(--z-modal);
      border-radius: 14px 14px 0 0; min-width: unset; padding: 8px 16px 20px;
      max-height: min(85vh, 560px); display: flex; flex-direction: column;
      animation: bdSlideUp .3s cubic-bezier(.32,.72,0,1);
      box-shadow: 0 -8px 30px rgba(0,0,0,.4);
    }
    @keyframes bdSlideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

    .drag-handle {
      display: block; width: 32px; height: 4px; border-radius: 2px;
      background: var(--ink-muted); opacity: .25; margin: 0 auto 8px;
      flex-shrink: 0;
    }

    .saves-header { flex-shrink: 0; flex-wrap: wrap; }
    .saves-toolbar { flex-wrap: wrap; }
    .saves-list { flex: 1; overflow-y: auto; }
    .saves-close { display: block; }
    .saves-hint { display: none; }
  }

  .dup-modal { text-align: center; padding: 8px 0; }
  .dup-modal-icon {
    font-size: 2rem; color: var(--accent2); margin-bottom: 12px;
    animation: dupPulse 1.5s ease-in-out infinite;
  }
  @keyframes dupPulse { 0%,100% { opacity:.8; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
  .dup-modal-title {
    font-family: var(--font-display); font-size: 1.1rem; font-weight: 600;
    color: var(--ink); margin: 0 0 8px;
  }
  .dup-modal-msg {
    font-size: .85rem; color: var(--ink-muted); margin: 0 0 20px; line-height: 1.5;
  }
  .dup-modal-msg strong { color: var(--ink); }
  .dup-modal-msg--sub { font-size: .8rem; margin-bottom: 12px; }
  .dup-modal-list {
    display: flex; flex-direction: column; gap: 6px;
    max-height: 200px; overflow-y: auto;
    margin-bottom: 16px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent;
  }
  .dup-modal-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 6px;
    background: var(--surface2); border: 1px solid var(--border);
  }
  .dup-modal-slot {
    font-size: .72rem; font-weight: 700; color: var(--accent2);
    white-space: nowrap;
  }
  .dup-modal-name {
    font-size: .82rem; color: var(--ink); overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap;
  }
  .dup-modal-actions { display: flex; justify-content: center; gap: 12px; }

  :global(.touch-drag-ghost) {
    position: fixed; z-index: 9999; pointer-events: none;
    padding: 6px 14px; border-radius: 8px;
    background: var(--surface); border: 1px solid rgba(74,222,128,.4);
    box-shadow: 0 4px 16px rgba(0,0,0,.4);
    font-size: .75rem; font-weight: 700; color: var(--ink);
    white-space: nowrap; max-width: 260px; overflow: hidden; text-overflow: ellipsis;
  }
</style>