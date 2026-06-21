export interface RuneDmgCtx {
  potency: number
}

export interface RuneDmgDef {
  runeName: string
  condition?: string
  getBaseDamage: (ctx: RuneDmgCtx) => number
  dmgTypes: Record<string, number>
  scalings: Record<string, number>
  hits?: number
  getHits?: (ctx: RuneDmgCtx) => number
  maxPotency?: number
  potencyLabel?: string
  note?: string
}

export const RUNE_DMG_DEFS: RuneDmgDef[] = [
  {
    runeName: 'Beenade Rune',
    condition: 'On cast',
    getBaseDamage: () => 11,
    dmgTypes: { magic: 0.5, holy: 0.5 },
    scalings: { magic: 1.0, holy: 1.0 },
    getHits: ({ potency }) => 1 + potency,
    maxPotency: 5,
    potencyLabel: 'Beenades potency',
  },
]