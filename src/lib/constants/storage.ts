export const STORAGE_KEY_DEFENSES = 'voxlbuilder_defenses_v1'

export const BUILD_STATE_DEFAULTS: Record<string, any> = {
  race: '', guild: '', guildRank: 1, helmet: '', chestplate: '', leggings: '',
  ring: '', rune: '', infusionHelmet: '', infusionChestplate: '', infusionLeggings: '',
  infusionRing: '', weaponBlade: '', weaponHandle: '', monkGlove: '', monkEssence: '',
  shrineActive: false, upgradeHelmet: 0, upgradeChestplate: 0, upgradeLeggings: 0,
  upgradeRing: 0, upgradeRune: 0, selectedWeaponArt: 'Lunge', draconicColor: '',
  draconicRuneInfusion: '', emotionalState: 'buffs',
  level: 80, hpFill: 100, summonCount: 0, buffsConsumed: 0, sporelingsSummoned: 0,
  inDarkness: true, cdrToggles: {},
}

export const SAVE_KEY_MAP: Record<string, string> = {
  race:'ra', guild:'gu', guildRank:'gr', helmet:'he', chestplate:'cp',
  leggings:'le', ring:'ri', rune:'ru', enchantments:'en',
  infusionHelmet:'ih', infusionChestplate:'ic', infusionLeggings:'il', infusionRing:'ir',
  weaponBlade:'wb', weaponHandle:'wh', monkGlove:'mg', monkEssence:'me',
  shrineActive:'sh', upgradeHelmet:'uh', upgradeChestplate:'uc',
  upgradeLeggings:'ul', upgradeRing:'ur', upgradeRune:'uu', selectedWeaponArt:'wa', draconicColor:'dc',
  draconicRuneInfusion:'dri', emotionalState: 'es',
}
export const SAVE_KEY_UNMAP = Object.fromEntries(Object.entries(SAVE_KEY_MAP).map(([k,v])=>[v,k]))

export const ENCH_MAP: Record<string, string> = {
  helmet:'he', chestplate:'cp', leggings:'le', ring:'ri', rune:'ru',
}
export const ENCH_UNMAP = Object.fromEntries(Object.entries(ENCH_MAP).map(([k,v])=>[v,k]))

export const MAX_BUILD_SLOTS = 5
export const CONFIRM_TIMEOUT_MS = 3000
