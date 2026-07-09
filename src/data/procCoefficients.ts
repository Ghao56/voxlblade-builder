import type { ProcCoefficient } from '../lib/types'

/**
 * M1/M2 proc coefficient per weapon type.
 * User to provide values.
 * Default fallback: 1.0 if not listed.
 */
export const WEAPON_PROC_COEFFS: Record<string, { m1: ProcCoefficient; m2: ProcCoefficient }> = {
  'Fists':                { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Chain Fists':          { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 0.5 } },
  '1-Handed Sword':       { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  '2-Handed Sword':       { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Rapier':               { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Swords':          { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Greatsword':           { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Unbalanced Sword':     { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Unbalanced Swords': { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dagger':               { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Wielding Daggers':{ m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Spear':                { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Great Spear':          { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Mallet':               { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Mallets':         { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'War Hammer':           { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Kamas':           { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Scythe':               { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Lance':                { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Chainsaw':             { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Shield':               { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Artillery Mage':       { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Stratos Winds':        { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Storm Caster':         { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Virulent Core':        { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Cosmic Ray':           { m1: { type: 'noProc' }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Mine':                 { m1: { type: 'noProc' }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Side Gun':             { m1: { type: 'noProc' }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Shotgun':              { m1: { type: 'noProc' }, m2: { type: 'hasCoeff', value: 1.0 } },
  'Dual Guns':            { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 0.5 } },
  'Rifle':                { m1: { type: 'hasCoeff', value: 1.0 }, m2: { type: 'hasCoeff', value: 1.0 } },
}

/** Weapon Art proc coefficients. User to provide values. */
export const WA_PROC_COEFFS: Record<string, ProcCoefficient> = {
  'Lunge':     { type: 'hasCoeff', value: 1.0 },
  'Spin':      { type: 'hasCoeff', value: 1.0 },
  'Rapid Stab':{ type: 'hasCoeff', value: 1.0 },
  'Slam':      { type: 'hasCoeff', value: 1.0 },
  'Laser':     { type: 'hasCoeff', value: 1.0 },
}

/** Rune proc coefficients. User to provide values. */
export const RUNE_PROC_COEFFS: Record<string, ProcCoefficient> = {
  'Fireball':    { type: 'hasCoeff', value: 0.0 },
}

/** Perk-on-hit proc coefficients. User to provide values / adjust. */
export const PERK_PROC_COEFFS: Record<string, ProcCoefficient> = {
  'Springblast':     { type: 'hasCoeff', value: 1.0 },
  'Luminescent':     { type: 'noProc' },
  'Dragon State':    { type: 'hasCoeff', value: 1.0 },
}

/** Default fallback when a weapon/WA/rune is not found in the lookup tables. */
export const DEFAULT_PROC_COEFF: ProcCoefficient = { type: 'hasCoeff', value: 1.0 }

/** Default for incoming rune damage */
export const DEFAULT_RUNE_PROC_COEFF: ProcCoefficient = { type: 'hasCoeff', value: 0.0 }
