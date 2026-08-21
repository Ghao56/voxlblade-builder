export const FRENZY_BASE = 0.05
export const FRENZY_RAGE_MULT = 1 / 6

export const MINION_ABSORPTION_MULT = 0.2

export const VENOM_EATER_HEAL_PER_STACK = 0.1
export const SIPHONING_ROT_HEAL_PER_STACK = 1
export const LIFESTEAL_HEAL_PCT_PER_STACK = 0.005
export const LIFESTEAL_FLAT_HEAL_PER_STACK = 0.1

// ── On-hit exclusion ──────────────────────────────
// Damage sources that on-hit effects (Lifesteal, Channeled Weapon) do NOT apply to.
export const ON_HIT_EXCLUDED_SOURCES: ReadonlySet<string> = new Set([
  'Barbed Flurry',
  'Hex Ray',
  'Ice Burst',
  'Cauterize',
  'Lightning Cloak',
])

// Perks whose dmg-type bonuses never apply to DoT ticks.
export const DOT_EXCLUDED_PERK_BONUSES: ReadonlySet<string> = new Set(['Channeled Weapon'])

export const HOLY_INFUSION_POTENCY_MULT = 0.115

export const BELLOWING_EMBER_BASE_MULT = 1.10
export const BELLOWING_EMBER_FIRE_MULT = 1.23

// ── Simple multiplier-per-stack boosts ────────────
export const HEMORRHAGE_DMG_BASE = 0.10
export const HEMORRHAGE_DMG_PER_STACK = 0.10
export const HEMORRHAGE_STUN_PCT_PER_STACK = 20
export const HEMORRHAGE_POISE_PCT_PER_STACK = 15
export const BLOOD_THIRSTY_MULT_PER_STACK = 0.20
export const VENOM_SPITTER_MULT_PER_STACK = 0.10
export const PERFECTION_MULT_PER_STACK = 0.10
export const STEALTH_MULT_PER_STACK = 0.10
export const GOLDEN_CRITS_MULT_PER_STACK = 0.50
export const GOLDEN_CRITS_BASE_PROC_CHANCE = 0.40
export const ROYAL_PARRY_MULT_PER_STACK = 0.50
export const SPELL_PIERCER_MULT_PER_STACK = 0.20
export const SCOURGE_MULT_PER_STACK = 0.2
export const SHARPSHOOTER_MULT_PER_STACK = 0.20
export const VALOR_MULT_PER_STACK = 0.0666
export const GORECAST_MULT_PER_STACK = 0.20
export const VICIOUS_EDGE_MULT_PER_STACK = 0.20
export const FREQUENT_FLIER_MULT_PER_STACK = 0.20
export const MARSH_FLOW_MULT_PER_STACK = 0.20
export const SERRATED_EDGE_MULT_PER_STACK = 0.20
export const CLEAVE_MULT_PER_STACK = 0.10
export const STICKY_SWINGS_MULT_PER_STACK = 0.15
export const UNDEAD_MIGHT_MULT_PER_STACK = 0.25
export const HIGHLANDER_MULT_PER_STACK = 0.20
export const EMOTIONAL_MULT_PER_STACK = 0.20
export const HEAL_BOOST_MULT_PER_STACK = 0.10
export const OCEANS_RAGE_MULT_PER_STACK = 0.1

// ── Complex boost calcFn internals ────────────────
export const VENOM_EATER_DMG_MULT_PER_STACK = 0.10
export const FEROCITY_TENACITY_MULT = 11
export const SPIRIT_WINDS_TAILWIND_MULT = 1 / 3
export const SPIRIT_WINDS_PER_STACK = 2 / 15
export const GUARDIAN_SPIN_BASE = 0.15
export const GUARDIAN_SPIN_MULT_PER_STACK = 0.1725
export const WILD_BOLT_MULT_PER_STACK = 0.25
export const WEIGHTY_SLAM_MULT_PER_STACK = 0.20
export const RIDER_MULT_PER_STACK = 0.20
export const QUICKDRAW_MULT = 3
export const SPRING_POWERED_MULT = 0.0075
export const THIEF_TRAINING_BEHIND_MULT = 1.20
export const THIEF_TRAINING_WOULD_CRIT_MULT = 1.30
export const VASSALS_CROAK_MULT_PER_STACK = 0.02
export const RAGING_BOUNCE_MULT = 0.70
export const GUIDING_WINDS_MULT_PER_STACK = 0.40
export const GUIDING_WINDS_WA_MULT_PER_STACK = 0.30
export const CIVILIAN_MULT_PER_STACK = 0.40
export const VAMPIRE_DIVISOR = 15
export const VAMPIRE_SUNLIGHT_HEAL_MULT = 0.5
export const TOXIN_CASTER_MULT_PER_STACK = 0.05
export const CUT_DOWN_MULT_PER_AMOUNT = 0.30
export const EXECUTIONER_MULT_PER_AMOUNT = 0.50

// ── Heat Drill ────────────────────────────────
export const HEAT_DRILL_COOLDOWN = 15
export const HEAT_DRILL_LUNGE_BASE = 15
export const HEAT_DRILL_LUNGE_PER_STACK = 7.5
export const HEAT_DRILL_EXPLOSION_BASE = 15
export const HEAT_DRILL_EXPLOSION_PER_STACK = 7.5
export const HEAT_DRILL_SMALL_EXPLOSION_BASE = 3.75
export const HEAT_DRILL_SMALL_EXPLOSION_PER_STACK = 1.875
export const HEAT_DRILL_SMALL_EXPLOSION_HITS = 6

// ── Essence Ray ─────────────────────────────
export const ESSENCE_RAY_BASE = 1.1
export const ESSENCE_RAY_PER_STACK = 0.275
export const ESSENCE_RAY_HITS = 23

// ── Solar Light (converts Lesser Heal) ──────
export const SOLAR_LIGHT_TICKS = 15
export const SOLAR_LIGHT_HEAL_BASE = 0.5625
export const SOLAR_LIGHT_HEAL_PER_STACK = 0.125
export const SOLAR_LIGHT_DMG_BASE = 1.5
export const SOLAR_LIGHT_DMG_PER_STACK = 1 / 3
export const SOLAR_LIGHT_STAGE_1_SUN = 1.05
export const SOLAR_LIGHT_STAGE_2_SUN = 1.1
export const SOLAR_LIGHT_HOLY_SCALING = 0.7
export const SOLAR_LIGHT_FIRE_SCALING = 0.7
export const SOLAR_LIGHT_FIRE_DMG_MULT = 0.4
export const SOLAR_LIGHT_BURN_DURATION = 5

export const STEAM_POWERED_MULT_PER_AIR_BOOST = 2 / 15
