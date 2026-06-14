export interface PerkDmgCtx {
  perkAmount: number
  /** Total number of hits in the current finisher event (M2 hit count) */
  finisherHits?: number
  m1FinisherHits?: number
}

export interface PerkDmgDef {
  perkName: string
  /** Short display label if different from perkName */
  label?: string
  /** Trigger / activation condition */
  condition?: string
  /**
   * Returns base damage per single proc.
   * For multi-hit entries (hits > 1), this is the per-hit value.
   */
  getBaseDamage: (ctx: PerkDmgCtx) => number
  /**
   * Static hit count for display (e.g. Basic Spirit = 3).
   * Undefined = single proc/hit.
   */
  hits?: number
  /**
   * 'weapon' → inherit current weapon's damage types.
   * 'fixed'  → use dmgTypes below.
   */
  dmgTypeMode: 'weapon' | 'fixed'
  dmgTypes?: Record<string, number>
  /**
   * 'weapon' → inherit current weapon's scalings.
   * 'fixed'  → use scalings below.
   * 'none'   → no scaling contribution.
   */
  scalingMode: 'weapon' | 'fixed' | 'none'
  scalings?: Record<string, number>
  /** Attack classification tags for display badges */
  isM1?: boolean
  isM2?: boolean
  isFinisher?: boolean
  isWA?: boolean
  isRune?: boolean
  guardbreak?: boolean
  /** Extra per-instance note shown under the card */
  note?: string
}

export const PERK_DMG_DEFS: PerkDmgDef[] = [
  // ── Springblast ────────────────────────────────────────────────────────────
  {
    perkName: 'Springblast',
    condition: 'On Finisher while Bounce active',
    getBaseDamage: ({ perkAmount, finisherHits = 1 }) =>
      Math.round(
        ((6 + 2 * perkAmount) * (1 + 0.1 * perkAmount)) /
          (0.5 + finisherHits / 2) * 1000
      ) / 1000,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical: 1.0 },
    guardbreak: true,
    note: 'Per proc (÷ by finisher hit count).',
  },
  // ── Basic Spirit ───────────────────────────────────────────────────────────
  {
    perkName: 'Basic Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 9,
    hits: 3,
    dmgTypeMode: 'weapon',
    scalingMode: 'weapon',
    isM2: true,
    isFinisher: true,
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects.',
  },
  // ── Mageling Spirit ────────────────────────────────────────────────────────
  {
    perkName: 'Mageling Spirit',
    condition: 'On WA or Rune use (Monk)',
    getBaseDamage: () => 27.5,
    dmgTypeMode: 'fixed',
    dmgTypes: { magic: 1.0 },
    scalingMode: 'fixed',
    scalings: { magic: 1.0 },
    isRune: true,
    guardbreak: true,
    note: 'Resets cooldown of the activating WA/Rune. Counts as rune damage.',
  },
  // ── Toadzerker Spirit ────────────────────────────────────────────────────────
  {
    perkName: 'Toadzerker Spirit',
    condition: 'On RMB (Monk)',
    getBaseDamage: () => 30,
    dmgTypeMode: 'fixed',
    dmgTypes: { physical: 1.0 },
    scalingMode: 'fixed',
    scalings: { physical : 1.0},
    guardbreak: true,
    note: 'Each hit counts as individual M1/M2 and procs related effects.',
  },
]