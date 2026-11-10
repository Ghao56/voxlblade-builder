// share-card capture: render .summary-grid at a fixed 760px desktop layout to PNG,
// then deliver via clipboard (goes straight to Ctrl+V) -> share sheet -> download.
import { addToast } from './stores/toast'

const FILENAME = 'build-summary.png'

// ── render ────────────────────────────────────────────────────────────────────

interface ShareCardOptions {
  scale: number
  backgroundColor: string
}

function isSafari(): boolean {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
}

function buildShareCardOptions(): ShareCardOptions {
  return {
    scale: 2,
    backgroundColor: getComputedStyle(document.body).backgroundColor || '#111318',
  }
}

async function captureElement(el: HTMLElement, opts: ShareCardOptions): Promise<Blob | null> {
  const { snapdom } = await import('@zumer/snapdom')
  // Safari sometimes misses fonts/images on first capture — render twice, keep the second.
  if (isSafari()) {
    await snapdom(el, opts)
  }
  const result = await snapdom(el, opts)
  // toBlob defaults to image/svg+xml — the clipboard and File paths declare image/png.
  return result.toBlob({ format: 'png' })
}

async function renderSnapshot(): Promise<Blob | null> {
  const grid = document.querySelector<HTMLElement>('.summary-grid')
  if (!grid) return null

  const wrapper = document.createElement('div')
  wrapper.className = 'share-card'
  wrapper.style.position = 'absolute'
  wrapper.style.left = '-9999px'
  wrapper.style.top = '0'
  wrapper.style.width = '760px'

  const clone = grid.cloneNode(true) as HTMLElement
  const staleClasses = ['sg-selected', 'sg-valid-target', 'sg-drop-target', 'sg-clone-target']
  for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
    // drop ids/data-slots so live-page querySelectors can't hit the clone
    el.removeAttribute('id')
    el.removeAttribute('data-slot')
    el.removeAttribute('role')
    el.removeAttribute('tabindex')
    for (const cls of staleClasses) el.classList.remove(cls)
  }
  clone.classList.remove('sg-armor-dragging', 'sg-ring-dragging')
  clone.inert = true
  clone.setAttribute('aria-hidden', 'true')
  clone.style.pointerEvents = 'none'
  wrapper.appendChild(clone)
  document.body.appendChild(wrapper)

  try {
    await document.fonts.ready
    return await captureElement(wrapper, buildShareCardOptions())
  } catch (err) {
    console.error('[snap] capture failed:', err)
    return null
  } finally {
    wrapper.remove()
  }
}

// ── cache / scheduling (brief 3.4) ───────────────────────────────────────────

let version = 0
let cachedBlob: Blob | null = null
let inflight: Promise<Blob | null> | null = null
let timer: ReturnType<typeof setTimeout> | undefined

// Called from App.svelte as `$: scheduleSnapRender($build)` — bumps version on every
// build change, then re-renders once 800ms after the last change (debounce), at idle.
export function scheduleSnapRender(_build?: unknown): void {
  version++
  cachedBlob = null
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(() => {
    const run = () => {
      // Renders may overlap after rapid edits; only the latest version gets cached.
      const v = version
      const p = renderSnapshot()
      inflight = p
      p.then(blob => {
        if (inflight === p) inflight = null
        if (blob && v === version) cachedBlob = blob
      })
    }
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run)
    else run()
  }, 800)
}

// ── delivery (brief 3.5) ─────────────────────────────────────────────────────

interface SnapEnv {
  canShare?: (data: { files?: File[] }) => boolean
  share: (data: { files?: File[] }) => Promise<void>
  clipboard?: { write: (items: unknown[]) => Promise<void> }
  hasClipboardItem: boolean
}

function defaultEnv(): SnapEnv {
  const n = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[] }) => Promise<void>
  }
  return {
    canShare: typeof n.canShare === 'function' ? (d: { files?: File[] }) => n.canShare!(d) : undefined,
    share: typeof n.share === 'function' ? (d: { files?: File[] }) => n.share!(d) : () => Promise.reject(new DOMException('unsupported', 'NotSupportedError')),
    clipboard: n.clipboard && typeof n.clipboard.write === 'function' ? (n.clipboard as unknown as SnapEnv['clipboard']) : undefined,
    hasClipboardItem: typeof ClipboardItem !== 'undefined',
  }
}

export function downloadImage(blob: Blob, filename = FILENAME): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

type Delivery = 'shared' | 'copied' | 'downloaded'

export async function deliverSnapshot(
  blob: Blob,
  env: SnapEnv = defaultEnv(),
  downloadFn: (b: Blob) => void = downloadImage
): Promise<Delivery> {
  // clipboard first: on desktop Chrome canShare({files}) is true but the user
  // does NOT want the OS share dialog — go straight to the clipboard.
  try {
    if (!env.clipboard || !env.hasClipboardItem) throw new Error('clipboard not supported')
    await env.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    addToast('Image copied to clipboard — press Ctrl+V', 'success')
    return 'copied'
  } catch (err) {
    console.error('[snap] clipboard failed:', err)
  }
  // clipboard unavailable (mobile Safari/FF) or write rejected — offer the share sheet
  if (typeof env.canShare === 'function') {
    const file = new File([blob], FILENAME, { type: 'image/png' })
    if (env.canShare({ files: [file] })) {
      try {
        await env.share({ files: [file] })
        addToast('Image shared', 'success')
        return 'shared'
      } catch (err) {
        // user cancelled the share sheet — not an error, no fallback
        if (err instanceof DOMException && err.name === 'AbortError') return 'shared'
        console.error('[snap] share failed:', err)
      }
    }
  }
  downloadFn(blob)
  addToast('Clipboard unavailable — image downloaded instead', 'warning')
  return 'downloaded'
}

// ── click handler (brief 3.4: no heavy await before write/share) ─────────────

export async function exportSummaryGrid(_e?: unknown): Promise<void> {
  const env = defaultEnv()
  const hasClipboard = env.hasClipboardItem && !!env.clipboard

  if (cachedBlob) {
    await deliverSnapshot(cachedBlob, env)
    return
  }

  let p = inflight
  if (!p) {
    const v = version
    p = renderSnapshot()
    p.then(blob => {
      if (blob && v === version) cachedBlob = blob
    })
    inflight = p
  }
  // reject instead of null so ClipboardItem's promise can be handed to write as-is
  const blobPromise: Promise<Blob> = p.then(b => {
    if (!b) throw new Error('render failed')
    return b
  })

  if (hasClipboard) {
    try {
      // pass the render *promise* into ClipboardItem (Safari-compatible, no pre-await)
      await env.clipboard!.write([new ClipboardItem({ 'image/png': blobPromise })])
      addToast('Image copied to clipboard — press Ctrl+V', 'success')
    } catch (err) {
      console.error('[snap] promise-clipboard failed:', err)
      try {
        const blob = await blobPromise
        deliverSnapshot(blob, env) // shared/copy may still work, else downloads
      } catch {
        addToast('Could not generate the image — try again', 'error')
      }
    }
    return
  }

  addToast('Image is being prepared — tap again in a second', 'info')
}
