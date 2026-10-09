/** Weapon Art name and granted buff name are the same string. */
export const CRAGBLADE_NAME = 'Cragblade'
export const CRAGBLADE_BUFF_DURATION = 25

export const CRAGBLADE_M1_M2_DMG_PCT = 30
export const CRAGBLADE_POISE_DMG_PCT = 100
export const CRAGBLADE_ATTACK_SPEED_MULT = 0.75
export const CRAGBLADE_ATTACK_SPEED_EXEMPT_SOURCES = ['Delta Drill']

export const CRAGBLADE_M1_M2_DMG_MULT = 1 + CRAGBLADE_M1_M2_DMG_PCT / 100
const CRAGBLADE_POISE_DMG_MULT = 1 + CRAGBLADE_POISE_DMG_PCT / 100

export interface CragbladeTypeConversion {
  /** Weapon type whose M1/M2 damage tables replace the equipped weapon's. */
  type: string
  /** Keep the equipped weapon's M2 while using the converted type's M1. */
  retainM2: boolean
}

const CRAGBLADE_WEAPON_TYPE_MAP: Record<string, CragbladeTypeConversion> = {
  'Dagger':                { type: 'Mallet',                retainM2: false },
  '1-Handed Sword':        { type: 'Mallet',                retainM2: false },
  'Spear':                 { type: 'War Hammer',            retainM2: false },
  'Greatsword':            { type: 'Unbalanced Sword',      retainM2: false },
  'Dual Swords':           { type: 'Dual Unbalanced Swords', retainM2: false },
  'Dual Wielding Daggers': { type: 'Dual Mallets',          retainM2: false },
  'Lance':                 { type: 'Unbalanced Sword',      retainM2: true },
}

export function resolveCragbladeType(weaponType: string): CragbladeTypeConversion | null {
  if (!weaponType) return null
  return CRAGBLADE_WEAPON_TYPE_MAP[weaponType] ?? null
}
