const POTION_CHUGGER_POTENCY_MULT_PER_STACK = 0.20

export const LUMINESCENT_PCT_PER_STACK = 0.05

export const SPIRIT_WINDS_PCT_PER_STACK = 0.10

export const DARK_MAGIC_PCT_PER_STACK = 0.20

export const WIND_WALKER_PEN_PER_STACK = 10

export const REAPER_PCT_PER_DEBUFF_PER_STACK = 0.05

export const EXTINGUISH_MULT_PER_STACK = 0.5

export const EXPLOSIVE_CHARGE_PCT = 1.0

export const BLUB_BLUB_PCT_PER_STACK = 0.15
export const BLUB_BLUB_HIT_COUNT = 2
export const BLUB_BLUB_PROC_CHANCE = 0.5
export const BLUB_BLUB_DMG_TYPES = { water: 1.0 } as const

export const WILD_BOLT_DMG_REDUCTION = 0.75

export const LIGHTNING_CLOAK_FRACTION = 1 / 3

export const CURSE_RIP_DIVISOR = 60
export const CURSE_RIP_DMG_BOOST_CONST = 10
export const CURSE_RIP_DMG_BOOST_PER_DEBUFF = 5

export const TRUE_BALANCE_DMG_DIVISOR = 800
export const TRUE_BALANCE_HEAL_DIVISOR = 1500

export const EMOTIONAL_PCT_PER_STACK = 0.10

export const TOXIN_TRANSFER_PCT_PER_STACK = 0.10

export const VOID_RAGE_PCT_PER_STACK = 0.10

export const CHANNELED_WEAPON_PCT_PER_STACK = 0.05

export const DRACONIC_BLOOD_PCT_PER_STACK = 0.10

export const WILD_BOLT_ELEMENTS = ['fire', 'water', 'holy', 'hex', 'earth', 'air', 'magic'] as const

// ── Crit base values ──────────────────────────────
export const BASE_CRIT_DAMAGE = 150
export const DEX_CRIT_DIVISOR = 10
export const PRIMAL_DIVISOR = 4

// ── Perk crit-rate multipliers ────────────────────
export const FLOWING_CRITS_BOOST_MULT = 0.0875
export const SPELL_SLINGER_BOOST_MULT = 0.075
export const SHARP_CRITS_BOOST_MULT = 0.075
export const SEISMIC_MOMENTUM_BOOST_MULT = 0.075
export const PERFECTION_CRIT_PER_STACK = 5
export const CACI_KING_SPIRIT_CRIT_PER_STACK = 20

// ── Perk crit-damage formulas ─────────────────────
export const THIEF_TRAINING_CRIT_DMG_MULT = 10
export const THIEF_TRAINING_CRIT_DMG_SUB = 50
export const VENOM_EATER_CRIT_DMG_SUB = 30
export const VENOM_EATER_CRIT_DMG_MULT = 10
export const VITAL_STRIKES_CRIT_DMG_PER_STACK = 25
export const SPARK_CRIT_DMG_PER_STACK = 50
export const CRITICAL_MASTER_CRIT_DMG_PER_STACK = 5
export const SPLINTER_CRIT_DMG_PER_STACK = 10

// ── Mortal Will ──────────────────────────────────
export const MORTAL_WILL_HOLY_TYPE_PER_STACK = 0.1
export const MORTAL_WILL_DMG_PER_HOLY_BOOST_PCT = 0.0015

// ── Hemorrhage ───────────────────────────────────
export const HEMORRHAGE_TRUE_TYPE_PER_STACK = 0.1

// ── Inoculation ──────────────────────────────────
export const INOCULATION_HEAL_FRACTION = 0.3
export const INOCULATION_FLAT_HEAL_PER_STACK = 0.1

// ── Sunburn ──────────────────────────────────────
export const SUNBURN_UNIVERSAL_DMG_PER_STACK = 0.10
export const SUNBURN_HOLY_EXTRA_DMG_PER_STACK = 0.15
export const SUNBURN_BURN_BASE_CHANCE = 0.24
export const SUNBURN_BURN_CHANCE_PER_STACK = 0.06

// ── Frostbite ────────────────────────────────────
export const FROSTBITE_SLOW_POTENCY_PER_STACK = 0.5
export const FROSTBITE_CHANCE_PER_STACK = 0.10

// ── Cryo Engine ──────────────────────────────────
export const CRYO_ENGINE_PROC_CHANCE_PER_AMOUNT = 0.06
export const CRYO_ENGINE_TAILWIND_BASE_POTENCY = 0.2
export const CRYO_ENGINE_TAILWIND_POTENCY_PER_AMOUNT = 0.1
export const CRYO_ENGINE_TAILWIND_DURATION_PER_AMOUNT = 6

// ── Guiding Winds ────────────────────────────────
export const GUIDING_WINDS_TAILWIND_POTENCY_PER_AMOUNT = 0.1

// ── Fiery Pursuit ──────────────────────────────────
export const FIERY_PURSUIT_BASE_DMG = 15
export const FIERY_PURSUIT_DMG_PER_STACK = 1.5
export const FIERY_PURSUIT_BURN_DURATION = 5

// ── Hypnotist ─────────────────────────────────────
export const HYPNOTIST_POTENCY_PER_PERK = 0.1
export const HYPNOTIST_DURATION_BASE = 10
export const HYPNOTIST_DURATION_PER_PERK = 5
export const HYPNOTIST_MAGIC_ARMOR_PER_POTENCY = 50

// ── Phantom Pain ──────────────────────────────────
export const PHANTOM_PAIN_BASE_PCT = 0.25
export const PHANTOM_PAIN_PERK_MULT = 0.1

// ── Pursuit ──────────────────────────────────────
export const PURSUIT_BASE_MULT = 0.6
export const PURSUIT_MULT_PER_RANK = 0.2

// ── Darkening Hex ────────────────────────────────
export const DARKENING_HEX_POTENCY_ADD_PER_AMOUNT = 0.005
export const DARKENING_HEX_POTENCY_MULT_PER_AMOUNT = 0.05
export const DARKENING_HEX_DURATION_ADD_PER_AMOUNT = 0.5
export const DARKENING_HEX_MAX_ACTIVATIONS = 10
export const DARKENING_HEX_PROC_CHANCE = 0.2

// ── Kindling ─────────────────────────────────────
export const KINDLING_BURN_DURATION_MULT = 0.2
export const KINDLING_DMG_ADD_PER_AMOUNT = 0.5

// ── Cursed Flames ────────────────────────────────
export const CURSED_FLAMES_BURN_DURATION_PER_AMOUNT = 0.1
export const CURSED_FLAMES_BURN_DMG_PER_AMOUNT = 0.1
export const CURSED_FLAMES_DR_BASE = 0.1
export const CURSED_FLAMES_DR_PER_BURN_POTENCY = 1.0

// ── Ignition ─────────────────────────────────────
export const IGNITION_BURN_DURATION_BASE = 5
export const IGNITION_BURN_DURATION_PER_AMOUNT = 0.5
export const IGNITION_PROC_CHANCE_PER_AMOUNT = 0.1

// ── Concealed Edge ───────────────────────────────
export const CONCEALED_EDGE_HEX_PER_STACK = 0.25

// ── Stormcaller ──────────────────────────────────
export const STORM_CALLER_PROC_CHANCE = 0.025
