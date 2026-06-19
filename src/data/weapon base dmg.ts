import type { WeaponBaseDmg } from '../lib/types';

  export const WEAPON_BASE_DMG: WeaponBaseDmg[] = [
    { type: 'Fists',                m1: [5.5, 5.5, {n:2.7,count:3}],    m2: [15.5] },
    { type: 'Chain Fists',          m1: [{n:2.5,count:2},{n:2.5,count:2},{n:2.5,count:2}], m2: [{n:3,count:7}] },
    { type: '1-Handed Sword',       m1: [6, 6, 6],                      m2: [9] },
    { type: '2-Handed Sword',       m1: [5.5, 5.5, 5.5],                m2: [12] },
    { type: 'Rapier',               m1: [4.5, 4.5, {n:1.5,count:4}],    m2: [7.5] },
    { type: 'Dual Swords',          m1: [{n:3,count:2},{n:3,count:2},6],m2: [8] },
    { type: 'Greatsword',           m1: [9, 4, 9],                      m2: [11] },
    { type: 'Unbalanced Sword',     m1: [7.5, 12],                      m2: [16] },
    { type: 'Dual Unbalanced Swords',m1: [12, 12],   m1Finisher: false, m2: [{n:8,count:2},12] },
    { type: 'Dagger',               m1: [4.5, 4.5, 4.5],                m2: [5.5] },
    { type: 'Dual Wielding Daggers',m1: [4, {n:1.4,count:5},{n:1.4,count:5}], m2: [11] },
    { type: 'Spear',                m1: [6, 6, 6],                      m2: [10] },
    { type: 'Great Spear',          m1: [9, 14],                        m2: [{n:5,count:3}] },
    { type: 'Mallet',               m1: [6, 6, 6],                      m2: [18] },
    { type: 'Dual Mallets',         m1: [5, {n:1,count:5}, 5.5],        m2: [18.5] },
    { type: 'War Hammer',           m1: [6, 6, 14],                     m2: [{n:8,count:2}] },
    { type: 'Dual Kamas',           m1: [4, 4, {n:3,count:3}],          m2: [5.5] },
    { type: 'Scythe',               m1: [7.5, 7.5, 7.5],                m2: [{n:5,count:3}] },
    { type: 'Lance',                m1: [6, 6, 6],                      m2: [6.8, 14] },
    { type: 'Chainsaw',             m1: [{n:4,count:2},{n:4,count:2},{n:4,count:2}], m2: [{n:1.7,count:10}] },
    { type: 'Shield',               m1: [5, 5, 10],                     m2: [5] },

    { type: 'Artillery Mage',       m1: [5.5, 5.5],  m1Finisher: false, m2: [8.5] },
    { type: 'Stratos Winds',        m1: [5, 5],  m1Finisher: false,     m2: [8] },
    { type: 'Storm Caster',         m1: [5, 5],  m1Finisher: false,     m2: [{n:2.75,count:5}] },
    { type: 'Virulent Core',        m1: [4.5, 4.5],  m1Finisher: false, m2: [	12] },
    { type: 'Cosmic Ray',           m1: null,                           m2: [18.5] },
    { type: 'Mine',                 m1: null,                           m2: [5, 10, 15] },
    { type: 'Side Gun',             m1: null,                           m2: [7] },
    { type: 'Shotgun',              m1: null,                           m2: [{n:4.5,count:3}] },
    { type: 'Dual Guns',            m1: [4, 4],  m1Finisher: false,     m2: [{n:1.6,count:8}] },
    { type: 'Rifle',                m1: [5, 5, 18],                     m2: [17],

  m2Charge: {
    enabled: true,
    label: 'Rifle Charge',
    max: 100,
    formula: (base:number,charge:number) =>base *(1 + (5 / 3) * (charge / 100))
  }},]