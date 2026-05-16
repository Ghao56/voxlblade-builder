export interface BoostDef {
  sourceName: string
  multiplierPerPerk: number
  condition?: string
  type: 'dmg' | 'heal'
}

export const BOOST_DEFS: BoostDef[] = [
    //Blood Thirsty
    { sourceName: 'Blood Thirsty',   multiplierPerPerk: 0.20, type: 'dmg', condition: 'Hitting an opponent with your Bleed' }
]

export const BOOST_DEF_MAP = new Map(BOOST_DEFS.map(d => [d.sourceName, d]))