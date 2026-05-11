<!-- BuildSaves.svelte -->
<script lang="ts">
  import { build } from './lib/store'
  import type { BuildState } from './lib/types'

  const MAX_SLOTS = 5
  const STORAGE_KEY = 'voxlbuilder_saves'

  interface SaveSlot {
    name: string
    timestamp: number
    state: BuildState
  }

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
    slots[i] = { name, timestamp: Date.now(), state: JSON.parse(JSON.stringify($build)) }
    slots = [...slots]
    persistSlots(slots)
  }

  function loadBuild(i: number) {
    if (confirmLoad === i) {
      const slot = slots[i]
      if (slot) build.set(JSON.parse(JSON.stringify(slot.state)))
      confirmLoad = null
    } else {
      confirmLoad = i
      setTimeout(() => { if (confirmLoad === i) confirmLoad = null }, 3000)
    }
  }

  function deleteSlot(i: number) {
    if (confirmDelete === i) {
      slots[i] = null; slots = [...slots]; persistSlots(slots); confirmDelete = null
    } else {
      confirmDelete = i
      setTimeout(() => { if (confirmDelete === i) confirmDelete = null }, 3000)
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

let shareCode = ''
let importCode = ''
let importError = ''
let importSuccess = false
let exportingSlot: number | null = null

function exportSlot(i: number) {
  const slot = slots[i]
  if (!slot) return
  shareCode = btoa(unescape(encodeURIComponent(JSON.stringify(slot.state))))
  exportingSlot = i
  importError = ''
}

function importBuild() {
  try {
    const state = JSON.parse(decodeURIComponent(escape(atob(importCode.trim()))))
    // Validate basic structure
    if (typeof state !== 'object' || !state.race) {
      importError = 'Invalid build data!'
      return
    }
    build.set(state)
    importError = ''
    importSuccess = true
    setTimeout(() => importSuccess = false, 2000)
  } catch {
    importError = 'Invalid code!'
  }
}

function copyCode() {
  navigator.clipboard.writeText(shareCode)
}
</script>

<button class="saves-toggle" on:click={() => open = !open}>
  <span>💾</span>
  <span class="lbl">Builds</span>
  <span class="cnt">{slots.filter(Boolean).length}/{MAX_SLOTS}</span>
  <span class="arr">{open ? '▲' : '▼'}</span>
</button>

{#if open}
  <div class="saves-panel">
    <div class="saves-header">
      <span class="saves-title">Saved Builds</span>
      <span class="saves-hint">Click load/delete twice to confirm</span>
    </div>
    <div class="saves-list">
      {#each slots as slot, i}
        <div class="save-slot" class:filled={!!slot}>
          <div class="slot-left">
            <div class="slot-num">{i + 1}</div>
            <div class="slot-info">
              {#if slot}
                {#if editingIndex === i}
                  <!-- svelte-ignore a11y-autofocus -->
                  <input class="name-input" bind:value={editingName} autofocus
                    on:blur={() => confirmEdit(i)}
                    on:keydown={e => { if (e.key === 'Enter') confirmEdit(i); if (e.key === 'Escape') editingIndex = null }} />
                {:else}
                  <button class="slot-name" on:click={() => startEdit(i)}>
                    {slot.name}<span class="edit-icon">✎</span>
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
                on:click={() => exportSlot(i)} title="Export this build as code">
                ⬆
              </button>
              <button class="btn" class:btn-delete={confirmDelete !== i} class:btn-confirm={confirmDelete === i}
                on:click={() => deleteSlot(i)}>
                {confirmDelete === i ? '?' : '✕'}
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
    <div class="share-section">
      {#if exportingSlot !== null && shareCode}
        <div class="share-row">
          <span class="export-label">Slot {exportingSlot + 1} code:</span>
          <input class="share-code" value={shareCode} readonly
            on:click={e => (e.target as HTMLInputElement).select()} />
          <button class="btn btn-copy" on:click={copyCode}>Copy</button>
        </div>
      {/if}

      <div class="import-row">
        <input class="share-code" bind:value={importCode} placeholder="Paste build code here…" />
        <button class="btn btn-import" on:click={importBuild}>⬇ Import</button>
      </div>
      {#if importError}<span class="import-err">{importError}</span>{/if}
      {#if importSuccess}<span class="import-ok">✓ Loaded!</span>{/if}
    </div>
  </div>
{/if}

<style>
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
  .saves-panel{
    background:var(--surface);border:1px solid rgba(74,222,128,.18);
    border-radius:10px;padding:14px;margin-top:8px;
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
</style>