export interface PerkCDREntry {
  runePct?: number
  waPct?: number

  runeMultiplier?: (perkAmount: number) => number
  waMultiplier?: (perkAmount: number) => number

  runeSetCD?: number
  runeFilter?: string[]
  waFilter?: string[]
}

export const CDR_PERK_DATA: Record<string, PerkCDREntry> = {
  "Caster": {
    runePct: 0.15,
    waPct: 0.15,
  },
  "Channeled Weapon": {
    waMultiplier: (perkAmount) => 0.8 - 0.05 * perkAmount,
  },
  //Mage Rage
  "Mage Rage": {
    runePct: 0.1,
  },
  //Poison Acceleration
  "Poison Acceleration": {
    runePct: 0.2,
    waPct: 0.2,
  },
  //Runic Winds
  "Runic Winds": {
    runePct: 0.1,
  },
  //Wave Rider
  "Wave Rider": {
    waPct: 0.5,
  },
  //Whirlwind
  "Whirlwind": {
    waPct: 0.3,
    runePct: 0.3,
  },
  //Gladiatorial Rage
  "Gladiatorial Rage": {
    runeSetCD: 30,
    runeFilter: ['Rage Rune'],
  },
  "Voltaic Body": {
    runeMultiplier: (_perkAmount) => 1.2,
  },
}