export interface Potion {
  name: string
  description: string
  color: string
}

export const POTIONS: Potion[] = [
  {
    name: 'Rage Potion',
    description: 'Gives Rage at 0.4 potency for 15 seconds',
    color: '#f70201',
  },
  {
    name: 'Poison Potion',
    description: 'Gains Poison at 0 Potency for 10 seconds',
    color: '#d900ff',
  },
]

export const POTION_MAP: Record<string, Potion> = Object.fromEntries(
  POTIONS.map(p => [p.name, p])
)
