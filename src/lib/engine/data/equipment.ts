import type { Armor, ArmorPart, Ring, Rune, Enchantment } from '../../types'

import armorsRaw       from '../../../data/armors.json'
import ringsRaw        from '../../../data/rings.json'
import runesRaw        from '../../../data/runes.json'
import enchantmentsRaw from '../../../data/enchantments.json'

export const rings:        Ring[]        = ringsRaw        as Ring[]
export const runes:        Rune[]        = runesRaw        as Rune[]
export const enchantments: Enchantment[] = enchantmentsRaw as Enchantment[]

// Re-exported so enchant.ts can build ENCHANT_EFFECT_PERK_NAMES without re-importing
export { enchantmentsRaw }

const ENCHANT_MAP = Object.fromEntries(enchantments.map(e => [e.name, e]))
const RING_MAP    = Object.fromEntries(rings.map(r => [r.name, r]))
const RUNE_MAP    = Object.fromEntries(runes.map(r => [r.name, r]))

const ARMOR_MAP = Object.fromEntries(armorsRaw.map((a: any) => [
  a.name,
  {
    name: a.name,
    tags: a.tags,
    parts: a.parts.map((p: any) => ({
      type:        p.type,
      description: p.description ?? a.sharedPart?.description ?? "",
      upgrade:     p.upgrade     ?? a.sharedPart?.upgrade     ?? 0,
      stats:       { ...(a.sharedPart?.stats ?? {}), ...(p.stats ?? {}) },
      perkName:    p.perkName    ?? a.sharedPart?.perkName    ?? "",
      perkAmount:  p.perkAmount  ?? a.sharedPart?.perkAmount  ?? 0,
    })),
  } as Armor,
]))

export const armors: Armor[] = Object.values(ARMOR_MAP)

export function getEnchant(name: string) { return ENCHANT_MAP[name] }
export function getRing(name: string)    { return RING_MAP[name]    }
export function getRune(name: string)    { return RUNE_MAP[name]    }

export function getArmorPart(name: string, type: ArmorPart["type"]) {
  const armor = ARMOR_MAP[name]
  if (!armor) return undefined
  for (let i = 0; i < armor.parts.length; i++) {
    if (armor.parts[i].type === type) return armor.parts[i]
  }
  return undefined
}

function getArmorSlotTypes(name: string): Set<ArmorPart["type"]> {
  const armor = ARMOR_MAP[name]
  if (!armor) return new Set()
  return new Set(armor.parts.map((p: ArmorPart) => p.type))
}

export function armorSupportsSlot(name: string, type: ArmorPart["type"]): boolean {
  return getArmorSlotTypes(name).has(type)
}