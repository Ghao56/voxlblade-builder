export interface PerkCDREntry {
  runePct?: number
  waPct?: number

  runeMultiplier?: (perkAmount: number) => number
  waMultiplier?: (perkAmount: number) => number

  runeSetCD?: number
  runeFilter?: string[]
  waFilter?: string[]

  toggleable?: boolean
}

export const CDR_PERK_DATA: Record<string, PerkCDREntry> = {
  "Caster": {
    runePct: 0.2,
    waPct: 0.1,
  },
  "Channeled Weapon": {
    waMultiplier: (perkAmount) => 0.8 - 0.05 * perkAmount,
  },
  "Mage Rage": {
    runePct: 0.1,
  },
  "Poison Acceleration": {
    runePct: 0.2,
    waPct: 0.2,
  },
  "Runic Winds": {
    runePct: 0.1,
  },
  "Wave Rider": {
    waPct: 0.5,
    toggleable: true,
  },
  "Whirlwind": {
    waPct: 0.3,
    runePct: 0.3,
  },
  "Gladiatorial Rage": {
    runeSetCD: 30,
    runeFilter: ['Rage Rune'],
  },
  "Voltaic Body": {
    runeMultiplier: (_perkAmount) => 1.2,
  },
}