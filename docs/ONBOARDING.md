# Onboarding Guide — voxlblade

> Generated from the project knowledge graph (`40f53148`).

---

## Project Overview

| Field | Value |
|-------|-------|
| **Name** | voxlblade |
| **Description** | A Svelte + TypeScript + Vite project for game damage calculations and build optimization |
| **Languages** | TypeScript, Svelte, JSON, YAML, HTML, CSS, JavaScript |
| **Frameworks** | Vite, Svelte |
| **Deployment** | Vercel (static site via GitHub Actions) |

---

## Architecture Layers

### 1. Root Configuration
**Description:** Project root files including configuration, documentation, and entry points.

Key files:
- `package.json` — Project dependencies and scripts
- `vite.config.ts` — Vite build configuration
- `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` — TypeScript config
- `vercel.json` — Vercel deployment routing rules
- `.github/workflows/static.yml` — CI/CD pipeline for static deployment
- `index.html` — HTML entry point (SPA shell)
- `README.md` — Project overview documentation

### 2. Source Root
**Description:** Main source directory with entry points and top-level components.

Key files:
- `src/main.ts` — Application bootstrap
- `src/App.svelte` — Root component, orchestrates the entire UI (**3,702 lines**)
- `src/DamageAnalyzer.svelte` — Primary damage analysis interface (**6,652 lines**)
- `src/BaseDamageCalc.svelte` — Base damage calculator (**2,473 lines**)
- `src/BuffList.svelte` — Buff display and management
- `src/BuildSaves.svelte` — Build save/load functionality
- `src/StatFilter.svelte` — Stat filtering controls
- `src/TagFilter.svelte` — Tag-based filtering
- `src/LevelBar.svelte` — Level progress display
- `src/EmotionalTracker.svelte` — Engagement/experience tracker

### 3. Data Layer
**Description:** Game data files, definitions, and calculations.

Key files:
- `src/data/perks.json` — Master perks database (**3,689 lines**)
- `src/data/BuffData.ts` — Buff definitions and interactions (**1,848 lines**)
- `src/data/Perkbasedmg.ts` — Perk-based damage formulas (**708 lines**)
- `src/data/weaponArts.ts` — Weapon art definitions (**509 lines**)
- `src/data/Boost.ts` — Boost calculations
- `src/data/armors.json` — Armor data
- `src/data/blades.json` — Blade/weapon data
- `src/data/enchantments.json` — Enchantment definitions
- `src/data/guilds.json` — Guild data
- `src/data/races.json` — Race data
- `src/data/rings.json` — Ring data
- `src/data/runes.json` — Rune data
- `src/data/draconicBuffs.ts` — Draconic buff system
- `src/data/draconicRunes.ts` — Draconic rune system
- `src/data/statboost.ts` — Stat boost calculations
- `src/data/HealBoost.ts` — Healing boost formulas
- `src/data/TypedDmgBoost.ts` — Typed damage boost calculations
- `src/data/DoTDamage.ts` — Damage over time calculations
- `src/data/Weaponartcheck.ts` — Weapon art validation logic
- `src/data/raceEffects.ts` — Race-specific effects
- `src/data/procCoefficients.ts` — Proc coefficient definitions
- `src/data/debuffCombatEffects.ts` — Debuff combat effects
- `src/data/selfDamagePerks.ts` — Self-damage perk handling
- `src/data/stanceOverlays.ts` — Stance overlay system
- `src/data/SummonData.ts` — Summon pet data

### 4. Library Layer
**Description:** Shared utilities, types, and constants.

Key files:
- `src/lib/types.ts` — Central type definitions (**284 lines**)
- `src/lib/engine.ts` — Engine barrel export
- `src/lib/crit.ts` — Critical hit calculations (**341 lines**)
- `src/lib/defense.ts` — Defense calculations
- `src/lib/dmgTypes.ts` — Damage type definitions
- `src/lib/damageTypeResolve.ts` — Damage type resolution logic
- `src/lib/enchantTooltip.ts` — Enchantment tooltip formatting
- `src/lib/store.ts` — Main Svelte store (**105 lines**)
- `src/lib/utils.ts` — General utilities (**113 lines**)
- `src/lib/uiConstants.ts` — UI constant values
- `src/lib/AppHeader.svelte` — Application header component
- `src/lib/Modal.svelte` — Base modal component
- `src/lib/EnchantSelect.svelte` — Enchantment selector (**468 lines**)
- `src/lib/StatFilterShared.svelte` — Shared stat filter logic
- `src/lib/Toast.svelte` — Toast notification component

### 5. Constants Layer
**Description:** Game constants, configurations, and static data.

Key files:
- `src/lib/constants/index.ts` — Barrel export for all constants
- `src/lib/constants/game.ts` — Core game constants
- `src/lib/constants/damage-types.ts` — Damage type enums/constants
- `src/lib/constants/perks.ts` — Perk constants
- `src/lib/constants/perk-base-damage.ts` — Perk base damage values (**133 lines**)
- `src/lib/constants/rune-base-damage.ts` — Rune base damage values
- `src/lib/constants/boosts.ts` — Boost constants
- `src/lib/constants/buffs.ts` — Buff constants (**147 lines**)
- `src/lib/constants/cdr.ts` — Cooldown reduction constants
- `src/lib/constants/defensive.ts` — Defensive stat constants
- `src/lib/constants/dot-damage.ts` — DoT damage constants
- `src/lib/constants/heals.ts` — Healing constants
- `src/lib/constants/stat-conversions.ts` — Stat conversion ratios
- `src/lib/constants/storage.ts` — Local storage key constants
- `src/lib/constants/thresholds.ts` — Threshold values
- `src/lib/constants/draconic.ts` — Draconic system constants
- `src/lib/constants/draconic-colors.ts` — Draconic color definitions
- `src/lib/constants/debuff-effects.ts` — Debuff effect constants

### 6. Engine Layer
**Description:** Core game engine logic and calculations.

Key files:
- `src/lib/engine/engine.ts` — Engine barrel export
- `src/lib/engine/build.ts` — Build processing engine (**530 lines**)
- `src/lib/engine/weapon.ts` — Weapon processing (**443 lines**)
- `src/lib/engine/enchant.ts` — Enchantment processing (**221 lines**)
- `src/lib/engine/shrine.ts` — Shrine/altar mechanics
- `src/lib/engine/format.ts` — Output formatting
- `src/lib/engine/data.ts` — Engine data exports
- `src/lib/engine/data/character.ts` — Character data model
- `src/lib/engine/data/equipment.ts` — Equipment data model
- `src/lib/engine/data/weapons.ts` — Weapon data model
- `src/lib/engine/_utils.ts` — Internal engine utilities

### 7. Modals Layer
**Description:** Modal dialogs and selection interfaces.

Key files:
- `src/lib/modals/index.ts` — Modal barrel export
- `src/lib/modals/AccessorySelectModal.svelte` — Accessory picker (**214 lines**)
- `src/lib/modals/WeaponPartModal.svelte` — Weapon part selector (**136 lines**)
- `src/lib/modals/GuildModal.svelte` — Guild selection
- `src/lib/modals/RaceModal.svelte` — Race selection

### 8. Statistics Layer
**Description:** Stat filtering and display utilities.

Key files:
- `src/lib/stats/elementalBoosts.ts` — Elemental boost calculations
- `src/lib/stats/filterActions.ts` — Filter action handlers

### 9. Stores Layer
**Description:** State management and stores.

Key files:
- `src/lib/stores/toast.ts` — Toast notification store

---

## Key Concepts

### Damage Calculation Pipeline
The core of the application is a multi-stage damage calculation pipeline that chains together base damage, stat boosts, buff interactions, enchantment effects, perk modifiers, and weapon art bonuses to produce final damage numbers.

### Buff/Debuff System
Buffs and debuffs are defined in `BuffData.ts` (1,848 lines) with complex interaction rules. The system handles buff stacking, conditional triggers, and mutual exclusions.

### Engine Architecture
The engine layer (`src/lib/engine/`) follows a pipeline pattern:
- **Build** (`build.ts`) — Processes a full character build
- **Weapon** (`weapon.ts`) — Handles weapon-specific calculations
- **Enchant** (`enchant.ts`) — Applies enchantment modifiers
- **Shrine** (`shrine.ts`) — Handles shrine/altar effects

### State Management
Uses Svelte stores (`src/lib/store.ts`) with localStorage persistence for build saves. The store tracks character stats, equipment, buffs, and UI state.

### Component Hierarchy
- `App.svelte` → orchestrates everything
- `DamageAnalyzer.svelte` → main analysis view
- `BaseDamageCalc.svelte` → base damage computation
- `BuffList.svelte` → buff/debuff management
- `StatFilter.svelte` → stat filtering controls
- Modals → secondary selection interfaces

---

## Guided Tour

### Step 1: Project Overview
Read `README.md` to understand the project's purpose and architecture.

### Step 2: Project Configuration
Review `package.json`, `tsconfig.json`, and `vite.config.ts` to understand the build setup and dependencies.

### Step 3: Application Entry Point
Start from `src/main.ts` and `src/App.svelte` to understand how the application boots and mounts.

### Step 4: Core Data Layer
Explore `src/data/BuffData.ts`, `src/data/Boost.ts`, and `src/data/Perkbasedmg.ts` to understand the game data models and damage formulas.

### Step 5: Game Engine
Understand the core engine logic in `src/lib/engine/build.ts`, `src/lib/engine/weapon.ts`, and `src/lib/engine/enchant.ts`.

### Step 6: UI Components
Explore the main UI components: `src/DamageAnalyzer.svelte`, `src/StatFilter.svelte`, and `src/BuffList.svelte`.

### Step 7: Library Utilities
Review `src/lib/types.ts`, `src/lib/utils.ts`, and `src/lib/constants/index.ts` for shared utilities and type definitions.

### Step 8: Modal Interfaces
Explore `src/lib/modals/AccessorySelectModal.svelte`, `src/lib/modals/GuildModal.svelte`, and `src/lib/modals/WeaponPartModal.svelte`.

### Step 9: State Management
Understand `src/lib/store.ts` and `src/lib/stores/toast.ts` for application state handling.

### Step 10: Build System
Review `vite.config.ts`, `vercel.json`, and `.github/workflows/static.yml` for the build and deployment pipeline.

---

## File Map

### Root Configuration
| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts |
| `vite.config.ts` | Vite build configuration |
| `tsconfig.json` | Root TypeScript config |
| `tsconfig.app.json` | App TypeScript config |
| `tsconfig.node.json` | Node/CLI TypeScript config |
| `vercel.json` | Vercel deployment routes |
| `.github/workflows/static.yml` | GitHub Actions CI/CD |
| `index.html` | SPA HTML shell |
| `README.md` | Project documentation |

### Source Root Components
| File | Purpose |
|------|---------|
| `src/main.ts` | Application bootstrap |
| `src/App.svelte` | Root component, orchestrates UI |
| `src/DamageAnalyzer.svelte` | Main damage analysis interface |
| `src/BaseDamageCalc.svelte` | Base damage calculator |
| `src/BuffList.svelte` | Buff/debuff display and management |
| `src/BuildSaves.svelte` | Build save/load UI |
| `src/StatFilter.svelte` | Stat filtering controls |
| `src/TagFilter.svelte` | Tag-based filtering |
| `src/LevelBar.svelte` | Level progress bar |
| `src/EmotionalTracker.svelte` | Engagement tracker |
| `src/CdrStepsCalc.svelte` | Cooldown reduction step calculator |
| `src/DmgTotalTooltip.svelte` | Damage total tooltip |
| `src/ScalingBreakdownRow.svelte` | Scaling breakdown display |
| `src/WeaponStatsDisplay.svelte` | Weapon stats display |
| `src/WeaponStatFilter.svelte` | Weapon stat filter |
| `src/ModalSearchHeader.svelte` | Modal search header |
| `src/DidYouMean.svelte` | Suggestion component |
| `src/SuggestDrop.svelte` | Suggestion dropdown |
| `src/DraconicAbilityStats.svelte` | Draconic ability display |
| `src/CritIcon.svelte` | Critical hit icon |
| `src/Highlight.svelte` | Text highlight component |
| `src/MountIcon.svelte` | Mount icon component |
| `src/app.css` | Global styles |

### Data Layer
| File | Purpose |
|------|---------|
| `src/data/BuffData.ts` | Buff definitions and interactions |
| `src/data/Boost.ts` | Boost calculation logic |
| `src/data/Perkbasedmg.ts` | Perk-based damage formulas |
| `src/data/weaponArts.ts` | Weapon art definitions |
| `src/data/statboost.ts` | Stat boost calculations |
| `src/data/HealBoost.ts` | Healing boost formulas |
| `src/data/TypedDmgBoost.ts` | Typed damage boosts |
| `src/data/DoTDamage.ts` | Damage over time |
| `src/data/Runebasedmg.ts` | Rune-based damage |
| `src/data/draconicBuffs.ts` | Draconic buff system |
| `src/data/draconicRunes.ts` | Draconic rune system |
| `src/data/draconicColorEffects.ts` | Draconic color effects |
| `src/data/defensivePerks.ts` | Defensive perk handling |
| `src/data/perkAutoDebuffs.ts` | Auto-debuff perk logic |
| `src/data/procCoefficients.ts` | Proc coefficient data |
| `src/data/raceEffects.ts` | Race-specific effects |
| `src/data/selfDamagePerks.ts` | Self-damage perk handling |
| `src/data/stanceOverlays.ts` | Stance overlay system |
| `src/data/cdr.ts` | Cooldown reduction data |
| `src/data/debuffCombatEffects.ts` | Debuff combat effects |
| `src/data/mountRunes.ts` | Mount rune data |
| `src/data/SummonData.ts` | Summon/pet data |
| `src/data/Weaponartcheck.ts` | Weapon art validation |
| `src/data/weapon base dmg.ts` | Weapon base damage values |
| `src/data/weaponConditionalBoosts.ts` | Conditional weapon boosts |
| `src/data/perks.json` | Master perks database |
| `src/data/armors.json` | Armor data |
| `src/data/blades.json` | Blade/weapon data |
| `src/data/enchantments.json` | Enchantment data |
| `src/data/essences.json` | Essence data |
| `src/data/gloves.json` | Gloves data |
| `src/data/guilds.json` | Guild data |
| `src/data/handles.json` | Handle data |
| `src/data/races.json` | Race data |
| `src/data/rings.json` | Ring data |
| `src/data/runes.json` | Rune data |

### Engine Layer
| File | Purpose |
|------|---------|
| `src/lib/engine/build.ts` | Build processing pipeline |
| `src/lib/engine/weapon.ts` | Weapon calculations |
| `src/lib/engine/enchant.ts` | Enchantment processing |
| `src/lib/engine/shrine.ts` | Shrine/altar mechanics |
| `src/lib/engine/format.ts` | Output formatting |
| `src/lib/engine/engine.ts` | Engine barrel export |
| `src/lib/engine/data.ts` | Engine data exports |
| `src/lib/engine/data/character.ts` | Character data model |
| `src/lib/engine/data/equipment.ts` | Equipment data model |
| `src/lib/engine/data/weapons.ts` | Weapon data model |
| `src/lib/engine/_utils.ts` | Internal engine utilities |

### Library Utilities
| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Central type definitions |
| `src/lib/store.ts` | Main Svelte store |
| `src/lib/utils.ts` | General utilities |
| `src/lib/crit.ts` | Critical hit calculations |
| `src/lib/defense.ts` | Defense calculations |
| `src/lib/dmgTypes.ts` | Damage type definitions |
| `src/lib/damageTypeResolve.ts` | Damage type resolution |
| `src/lib/enchantTooltip.ts` | Enchantment tooltip |
| `src/lib/constants.ts` | Constants barrel export |
| `src/lib/uiConstants.ts` | UI constants |
| `src/lib/AppHeader.svelte` | App header component |
| `src/lib/Modal.svelte` | Base modal component |
| `src/lib/EnchantSelect.svelte` | Enchantment selector |
| `src/lib/StatFilterShared.svelte` | Shared stat filter |
| `src/lib/Toast.svelte` | Toast notification |

### Constants
| File | Purpose |
|------|---------|
| `src/lib/constants/index.ts` | Barrel export |
| `src/lib/constants/game.ts` | Core game constants |
| `src/lib/constants/damage-types.ts` | Damage type enums |
| `src/lib/constants/perks.ts` | Perk constants |
| `src/lib/constants/perk-base-damage.ts` | Perk base damage values |
| `src/lib/constants/rune-base-damage.ts` | Rune base damage values |
| `src/lib/constants/boosts.ts` | Boost constants |
| `src/lib/constants/buffs.ts` | Buff constants |
| `src/lib/constants/cdr.ts` | CDR constants |
| `src/lib/constants/defensive.ts` | Defensive constants |
| `src/lib/constants/dot-damage.ts` | DoT damage constants |
| `src/lib/constants/heals.ts` | Healing constants |
| `src/lib/constants/stat-conversions.ts` | Stat conversion ratios |
| `src/lib/constants/storage.ts` | Storage key constants |
| `src/lib/constants/thresholds.ts` | Threshold values |
| `src/lib/constants/draconic.ts` | Draconic constants |
| `src/lib/constants/draconic-colors.ts` | Draconic color defs |
| `src/lib/constants/debuff-effects.ts` | Debuff effect constants |

### Modals
| File | Purpose |
|------|---------|
| `src/lib/modals/index.ts` | Modal barrel export |
| `src/lib/modals/AccessorySelectModal.svelte` | Accessory picker |
| `src/lib/modals/WeaponPartModal.svelte` | Weapon part selector |
| `src/lib/modals/GuildModal.svelte` | Guild selection |
| `src/lib/modals/RaceModal.svelte` | Race selection |

### Statistics
| File | Purpose |
|------|---------|
| `src/lib/stats/elementalBoosts.ts` | Elemental boost calcs |
| `src/lib/stats/filterActions.ts` | Filter action handlers |

### Stores
| File | Purpose |
|------|---------|
| `src/lib/stores/toast.ts` | Toast notification store |

---

## Complexity Hotspots

> These files have the highest complexity scores and line counts. Approach with care and read incrementally.

| File | Lines | Complexity | Notes |
|------|-------|------------|-------|
| `src/DamageAnalyzer.svelte` | 6,652 | **complex** | Main UI component; the heart of the application |
| `src/App.svelte` | 3,702 | **complex** | Root component; orchestrates all UI sections |
| `src/data/perks.json` | 3,689 | **complex** | Master perks database; very large JSON |
| `src/BaseDamageCalc.svelte` | 2,473 | **complex** | Base damage calculator UI |
| `src/data/BuffData.ts` | 1,848 | **complex** | Buff definitions with interaction rules |
| `src/BuffList.svelte` | 766 | **complex** | Buff display and management UI |
| `src/data/Perkbasedmg.ts` | 708 | **complex** | Perk-based damage formula implementations |
| `src/BuildSaves.svelte` | 609 | **complex** | Build save/load functionality |
| `src/lib/engine/build.ts` | 530 | **complex** | Core build processing engine |
| `src/data/weaponArts.ts` | 509 | **complex** | Weapon art definitions |

### Recommended approach for hotspots:
1. Start with `src/lib/types.ts` to understand the data model
2. Read `src/lib/constants/game.ts` for core game values
3. Trace through `src/lib/engine/build.ts` to understand the calculation pipeline
4. Only then tackle the large UI components (`DamageAnalyzer.svelte`, `App.svelte`)
