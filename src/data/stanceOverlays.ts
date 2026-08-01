export interface StanceOverlayResult {
  type: string
  m2Only: boolean
  m2NoLock?: boolean
}

export interface StanceOverlayCtx {
  isFists: boolean
  hasWeaponType: boolean
  blasterCount: number
  hasLockedAndLoaded: boolean
  weaponPerks: Record<string, number>
}

interface StanceOverlayDef {
  id: string
  condition: (ctx: StanceOverlayCtx) => boolean
  resolve: () => StanceOverlayResult
}

const STANCE_OVERLAY_DEFS: StanceOverlayDef[] = [
  {
    id: 'Mine',
    condition: ctx => (ctx.weaponPerks['Mine'] ?? 0) > 0,
    resolve: () => ({ type: 'Mine', m2Only: true, m2NoLock: true }),
  },
  {
    id: 'Cosmic Ray',
    condition: ctx => (ctx.weaponPerks['Cosmic Ray'] ?? 0) > 0,
    resolve: () => ({ type: 'Cosmic Ray', m2Only: true, m2NoLock: true }),
  },
  {
    id: 'Blaster Ring (Fists)',
    condition: ctx => ctx.blasterCount >= 2 && ctx.isFists,
    resolve: () => ({ type: 'Rifle', m2Only: false, m2NoLock: true }),
  },
  {
    id: 'Blaster Ring (Weapon)',
    condition: ctx => ctx.blasterCount >= 2 && !ctx.isFists && ctx.hasWeaponType,
    resolve: () => ({ type: 'Shotgun', m2Only: true }),
  },
  {
    id: 'Locked And Loaded (Fists)',
    condition: ctx => ctx.hasLockedAndLoaded && ctx.isFists,
    resolve: () => ({ type: 'Dual Guns', m2Only: false }),
  },
  {
    id: 'Locked And Loaded (Weapon)',
    condition: ctx => ctx.hasLockedAndLoaded && !ctx.isFists && ctx.hasWeaponType,
    resolve: () => ({ type: 'Side Gun', m2Only: true }),
  },
]

export function resolveStanceOverlay(ctx: StanceOverlayCtx): StanceOverlayResult | null {
  for (const def of STANCE_OVERLAY_DEFS) {
    if (def.condition(ctx)) return def.resolve()
  }
  return null
}
