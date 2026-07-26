export const WA_PERK_DISPLAY_NAMES: Record<string, Record<string, string>> = {
  'Weighty Slam': { 'Slam': 'Weighty Slam' },
  'Guardian Spin': { 'Spin': 'Guardian Spin' },
  'Wild Bolt': { 'Laser': 'Wild Bolt' },
  'Heat Drill': { 'Lunge': 'Heat Drill', 'Barrage': 'Heat Drill' },
}

export function getWADisplayName(
  baseName: string,
  perks: Record<string, number>,
): string {
  for (const [perkName, waMap] of Object.entries(WA_PERK_DISPLAY_NAMES)) {
    if ((perks[perkName] ?? 0) > 0 && waMap[baseName]) return waMap[baseName]
  }
  return baseName
}
