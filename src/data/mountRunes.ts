import type { WeaponHit } from '../lib/types'

export interface MountRuneM1Def {
  getBaseDamage: () => number
  getDmgTypes: () => Record<string, number>
  getScalings: () => Record<string, number>
  healFlat?: number
  note?: string
}

export interface MountRuneWADef {
  getHits: () => WeaponHit[]
  getDmgTypes: () => Record<string, number>
  getScalings: () => Record<string, number>
  guardbreak?: boolean
  setCooldown?: number
  secondaryEffects?: Array<{ label: string; display: string; condition?: string }>
}

export interface MountRuneDef {
  runeName: string
  mountLabel: string
  m1: MountRuneM1Def
  wa: MountRuneWADef
  note?: string
}

export const MOUNT_RUNE_DEFS: MountRuneDef[] = [
  {
    runeName: 'Winter Woof Mount Rune',
    mountLabel: 'Winter Woof',
    m1: {
      getBaseDamage: () => 8,
      getDmgTypes: () => ({ physical: 1.0 }),
      getScalings: () => ({ summon: 0.5 }),
      healFlat: 4,
      note: 'Affected by Attack Speed stat (hit frequency only) but unaffected by attack-speed-related Perks. Not modeled — this calculator only tracks per-hit base damage, not DPS/frequency.',
    },
    wa: {
      getHits: () => [5.5],
      getDmgTypes: () => ({ physical: 1.0 }),
      getScalings: () => ({ summon: 0.5 }),
      guardbreak: true,
      setCooldown: 25,
      secondaryEffects: [
        { label: 'Shatter', display: '0.2 potency · 10s', condition: 'On Weapon Art hit' },
      ],
    },
    note: 'M2 not mentioned in source — assumed unchanged while mounted.',
  },
  {
    runeName: 'Slizard Mount Rune',
    mountLabel: 'Slizard',
    m1: {
      getBaseDamage: () => 15,
      getDmgTypes: () => ({ physical: 1.0 }),
      getScalings: () => ({ summon: 0.5 }),
      note: 'Affected by Attack Speed stat (hit frequency only) but unaffected by attack-speed-related Perks. Not modeled — this calculator only tracks per-hit base damage, not DPS/frequency.',
    },
    wa: {
      getHits: () => [{ n: 1.1, count: 10 }, { n: 4.4, count: 1 }],
      getDmgTypes: () => ({ physical: 1.0 }),
      getScalings: () => ({ summon: 0.5 }),
      guardbreak: true,
      setCooldown: 25,
    },
  },
]

export const MOUNT_RUNE_MAP = Object.fromEntries(MOUNT_RUNE_DEFS.map(d => [d.runeName, d]))
export function getMountRuneDef(runeName: string): MountRuneDef | undefined {
  return MOUNT_RUNE_MAP[runeName]
}