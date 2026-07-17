<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import EmotionalTracker from './EmotionalTracker.svelte';
  import { build } from './lib/store'
  import { addToast } from './lib/stores/toast'
  import type { BuildState } from './lib/types'
  import {
    BUILD_STATE_DEFAULTS as DEFAULTS,
    SAVE_KEY_MAP as KEY_MAP, SAVE_KEY_UNMAP as KEY_UNMAP,
    ENCH_MAP, ENCH_UNMAP,
    MAX_BUILD_SLOTS, CONFIRM_TIMEOUT_MS, STORAGE_KEY_SAVES, IMPORT_SUCCESS_DISPLAY_MS
  } from './lib/constants'

  const MAX_SLOTS = MAX_BUILD_SLOTS
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

  function loadSlots(): (SaveSlot | null)[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return Array(MAX_SLOTS).fill(null)
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return Array(MAX_SLOTS).fill(null)
      const result: (SaveSlot | null)[] = []
      for (let i = 0; i < MAX_SLOTS; i++) result.push(parsed[i] ?? null)
      return result
    } catch { return Array(MAX_SLOTS).fill(null) }
  }

  function persistSlots(s: (SaveSlot | null)[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  }

  let slots: (SaveSlot | null)[] = loadSlots()
  let editingIndex: number | null = null
  let editingName = ''
  let confirmLoad: number | null = null
  let confirmDelete: number | null = null
  let open = false

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

  function saveBuild(i: number) {
    const name = slots[i]?.name ?? `Build ${i + 1}`
    slots[i] = { name, timestamp: Date.now(), state: structuredClone($build) }
    slots = [...slots]
    persistSlots(slots)
    addToast(`Saved to slot ${i + 1}`, 'success')
  }

  function loadBuild(i: number) {
    if (confirmLoad === i) {
      const slot = slots[i]
      if (slot) {
        build.set(structuredClone(slot.state))
        addToast(`Loaded build from slot ${i + 1}`, 'success')
      }
      confirmLoad = null
    } else {
      confirmLoad = i
     
      const timer = window.setTimeout(() => { 
        if (confirmLoad === i) confirmLoad = null 
      }, CONFIRM_TIMEOUT_MS);
      timeouts.push(timer);
    }
  }

  function deleteSlot(i: number) {
    if (confirmDelete === i) {
      slots[i] = null;
      slots = [...slots]; 
      persistSlots(slots); 
      confirmDelete = null
      addToast(`Deleted slot ${i + 1}`, 'info')
    } else {
      confirmDelete = i
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
    if (state.weaponBlade && state.weaponHandle) parts.push(`${state.weaponBlade} + ${state.weaponHandle}`)
    else if (state.monkGlove) parts.push(`Monk: ${state.monkGlove}`)
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

<div class="saves-wrapper"><button class="saves-toggle" on:click={() => open = !open}>
  <svg class="saves-icon" width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
    <rect x="5" y="2" width="6" height="5" rx="1" fill="currentColor" opacity="0.5"/>
    <rect x="4" y="9" width="8" height="4" rx="1" fill="currentColor" opacity="0.6"/>
  </svg>
  <span class="lbl">Builds</span>
  <span class="cnt">{slots.filter(Boolean).length}/{MAX_SLOTS}</span>
  <span class="arr">{open ? '▲' : '▼'}</span>
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="saves-backdrop" on:click={() => open = false}></div>
  <div class="saves-panel">
    <div class="saves-header">
      <div class="drag-handle" aria-hidden="true"></div>
      <span class="saves-title">Saved Builds</span>
      <span class="saves-hint">Click load/delete twice to confirm</span>
      <button class="saves-close" on:click={() => open = false} aria-label="Close saves panel">✕</button>
    </div>
    <div class="saves-list">
      {#each slots as slot, i}
        <div class="save-slot" class:filled={!!slot}>
          <div class="slot-left">
            <div class="slot-num">{i + 1}</div>
            <div class="slot-info">
              {#if slot}
                {#if editingIndex === i}
                  <label for="edit-name-{i}" class="sr-only">Edit Build Name</label>
                  <input 
                    id="edit-name-{i}"
                    class="name-input" 
                    bind:value={editingName} 
                    use:focusOnMount
                    on:blur={() => confirmEdit(i)}
                    on:keydown={e => { 
                      if (e.key === 'Enter') confirmEdit(i);
                      if (e.key === 'Escape') editingIndex = null 
                    }} 
                  />
                {:else}
                  <button class="slot-name" on:click={() => startEdit(i)} aria-label="Rename build {slot.name}">
                    {slot.name}<span class="edit-icon" aria-hidden="true">✎</span>
                  </button>
                {/if}
                <div class="slot-meta">
                  <span class="slot-time">{formatDate(slot.timestamp)}</span>
                  <span class="slot-summary">{getBuildSummary(slot.state)}</span>
                </div>
              {:else}
                <span class="slot-empty">Empty slot</span>
              {/if}
            </div>
          </div>
          <div class="slot-actions">
            <button class="btn btn-save" on:click={() => saveBuild(i)}>
              {slot ? '↑ Save' : '+ Save'}
            </button>
            {#if slot}
              <button class="btn" class:btn-load={confirmLoad !== i} class:btn-confirm={confirmLoad === i}
                on:click={() => loadBuild(i)}>
                {confirmLoad === i ? '✓ Sure?' : '↓ Load'}
              </button>
              <button class="btn btn-share" class:btn-share--active={exportingSlot === i}
                on:click={() => exportSlot(i)} title="Export this build as code" aria-label="Export Slot {i+1}">
                <span>⬆</span>
              </button>
              <button class="btn" class:btn-delete={confirmDelete !== i} class:btn-confirm={confirmDelete === i}
                on:click={() => deleteSlot(i)} aria-label="Delete Slot {i+1}">
                <span>{confirmDelete === i ? '?' : '✕'}</span>
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="share-section">
      <div class="share-row">
        <span class="export-label">Current build:</span>
        <button class="btn btn-share" class:btn-share--active={currentExportCode === '...'} on:click={exportCurrent}>⬆ Export</button>
        {#if currentExportCode && currentExportCode !== '...'}
          <label for="current-build-code" class="sr-only">Current Build Code</label>
          <input id="current-build-code" class="share-code" value={currentExportCode} readonly
            on:click={e => (e.target as HTMLInputElement).select()} />
          <button class="btn btn-copy" on:click={() => navigator.clipboard.writeText(currentExportCode)}>Copy</button>
        {/if}
      </div>

      {#if exportingSlot !== null && shareCode}
        <div class="share-row">
          <span class="export-label">Slot {exportingSlot + 1} code:</span>
          <label for="slot-build-code" class="sr-only">Slot {exportingSlot + 1} Code</label>
          <input id="slot-build-code" class="share-code" value={shareCode} readonly
            on:click={e => (e.target as HTMLInputElement).select()} />
          <button class="btn btn-copy" on:click={copyCode}>Copy</button>
        </div>
      {/if}

      <div class="import-row">
        <label for="import-build-code" class="sr-only">Paste Build Code</label>
        <input id="import-build-code" class="share-code" bind:value={importCode} placeholder="Paste build code here…" />
        <button class="btn btn-paste" on:click={async () => { try { importCode = await navigator.clipboard.readText() } catch {} }} title="Paste from clipboard">📋 Paste</button>
        <button class="btn btn-import" on:click={importBuild}>⬇ Import</button>
      </div>
  {#if importError}<span class="import-err">{importError}</span>{/if}
  {#if importSuccess}<span class="import-ok">✓ Loaded!</span>{/if}
    </div>
  </div>
{/if}

</div>

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
    border-radius:10px;padding:14px;min-width:340px;
    display:flex;flex-direction:column;gap:10px;animation:spOpen .15s ease;
  }
  @keyframes spOpen{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
  .saves-header{display:flex;align-items:baseline;justify-content:space-between;}
  .saves-title{font-size:.7rem;text-transform:uppercase;letter-spacing:.16em;font-weight:700;color:var(--accent);}
  .saves-hint{font-size:.62rem;color:var(--ink-muted);opacity:.5;font-style:italic;}
  .saves-list{display:flex;flex-direction:column;gap:6px;}
  .save-slot{
    display:flex;align-items:center;justify-content:space-between;gap:10px;
    padding:9px 12px;border-radius:8px;
    background:var(--surface2);border:1px solid var(--border);transition:border-color .15s;
  }
  .save-slot.filled{border-color:rgba(74,222,128,.12);}
  .save-slot.filled:hover{border-color:rgba(74,222,128,.25);}
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
    color:var(--ink);cursor:pointer;display:flex;align-items:center;gap:5px;
    font-family:var(--font-body);text-align:left;
  }
  .slot-name:hover .edit-icon{opacity:.7;}
  .edit-icon{font-size:.6rem;color:var(--ink-muted);opacity:0;transition:opacity .15s;}
  .name-input{
    background:var(--surface3);border:1px solid rgba(167,139,250,.4);
    border-radius:5px;color:var(--ink);font-family:var(--font-body);
    font-size:.82rem;font-weight:700;padding:2px 7px;outline:none;width:100%;max-width:200px;
  }
  .slot-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
  .slot-time{font-size:.62rem;color:var(--ink-muted);opacity:.5;}
  .slot-summary{font-size:.62rem;color:var(--ink-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;}
  .slot-empty{font-size:.75rem;color:var(--ink-muted);opacity:.35;font-style:italic;}
  .slot-actions{display:flex;align-items:center;gap:5px;flex-shrink:0;}
  .btn{
    font-size:.68rem;font-weight:700;font-family:var(--font-body);
    padding:4px 9px;border-radius:6px;cursor:pointer;
    transition:all .15s;white-space:nowrap;border:1px solid transparent;
  }
  .btn-save{background:rgba(74,222,128,.1);border-color:rgba(74,222,128,.25);color:var(--accent);}
  .btn-save:hover{background:rgba(74,222,128,.2);border-color:rgba(74,222,128,.5);}
  .btn-load{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.2);color:var(--infusion);}
  .btn-load:hover{background:rgba(56,189,248,.18);border-color:rgba(56,189,248,.45);}
  .btn-delete{
    background:rgba(248,113,113,.07);border-color:rgba(248,113,113,.18);
    color:var(--neg);min-width:28px;display:flex;align-items:center;justify-content:center;padding:4px 6px;
  }
  .btn-delete:hover{background:rgba(248,113,113,.2);border-color:rgba(248,113,113,.45);}
  .btn-confirm{
    background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35);
    color:var(--accent2);animation:pulse .4s ease infinite alternate;
  }
  @keyframes pulse{from{opacity:.8}to{opacity:1}}

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
  .btn-import{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.2);color:var(--infusion);flex-shrink:0;}
  .btn-import:hover{background:rgba(56,189,248,.18);}
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
    .saves-list { flex: 1; overflow-y: auto; }
    .saves-close { display: block; }
    .saves-hint { display: none; }
  }
</style>