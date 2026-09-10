# Level/Effective damage bonus split + implement Poisonous / Glacial Buildup / Static Buildup

## Status: ALL PHASES COMPLETE (check ✓, test ✓ 18 tests, build ✓)

## What changed (verified vs working tree from bb455bd + in-flight Plan Bee)
- **PerkDmgDef** gained `applyLevel?`, `applyEffective?`, `noSelfDebuff?` flags (defaults: both true).
- **DamageAnalyzer `_activePerkDmgEntries`**: mult now `effectivePart = applyEffective!==false ? _categoryMult(hitType, canProc, !!noGeneralDmgBoosts, true) : 1`; `levelPart = applyLevel!==false ? _levelMult : 1`; `finalCombat = effectivePart × levelPart × mwMult`; `finalEffective = effectivePart × mwMult`. Ignition keeps level via flags (behavior preserved).
- **DamageAnalyzer `_perkOnHitDamages`**: isIgnition/ignitionLevelMult hardcode REMOVED; `noSelfDebuff` now data-driven (`e.noSelfDebuff`).
- **new PerkDmgDefs**:
  - Poisonous (after Ignition): base 2×perk hex dmg {hex:1.0}, scalings {hex:1.0}, noProc, noGeneralDmgBoosts, noSelfDebuff, applyLevel+applyEffective true.
  - Glacial Buildup 'Ice Crystals': base = perkAmount, {water:1.0}/{water:1.0}, noProc, noGeneralDmgBoosts, applyLevel:false, applyEffective:false → combatMult 1.
  - Glacial Buildup 'Crystal Shatter': base 16×perkAmount, {water:1.0}/{water:1.0}, noProc, applyLevel+applyEffective true, `slider:{buildKey:'glacialBuildupCrystals', min:0,max:6}` (engine has NO poise-break system; slider models a shatter).
- **Static Buildup** (special exception case): BaseDamageCalc block fired on RMB/M2-type finisher hits (`hit.group==='M2'||hit.isM2||(WA&&isFinisher)`); inheritedRmb = Σ(baseDmgTypes×base) × scalingMult × levelMult (post-scaling/pre-boost, incl Level); strikeBase = (3 + inheritedRmb×0.1538) × (1 + 0.1×perkAmount); raw = strikeBase × strikes(charge slider) × weight × perkCombatMult(includes Level again — the exception) × typed × sunburn × def × typeDebuff × debuffs × VC. Types {magic:0.5, air:0.5} inferred from Lightning Hammer (0.5 air/0.5 magic). New props `staticBuildupAmt`, `staticBuildupCharge`; PROC_EFFECT_DEFS['Static Buildup'] = positiveOnly (never blocked). Charge slider 0-10 in sidebar card (`staticBuildupCharge`, default 3). BuildState += `glacialBuildupCrystals`, `staticBuildupCharge`.
- **Snarl fix**: `hit.baseDmgTypes ?? hit.dmgTypes` fallback removed (BaseDamageCalc) — now strict baseDmgTypes, skip if absent. Mount M1 + Mount WA hits now carry baseDmgTypes (raw pre-draconic/pre-bonus def.getDmgTypes()). `baseDmgTypesForSelfDmg` = weapon-mode ? `_weaponDmgTypesBase` : baseDmgTypes (drops Channeled Weapon/Stone Weapon from inheritance base). Snarl still: level included, general/AP/VC/type-bonus excluded.
- **Tests**: new tests/levelEffective.test.ts (6 tests) — asserts Poisonous/Glacial/Burst defs + Ignition flags + Static Buildup positiveOnly proc. Totals: 3 files, 18 pass.

## Known limitations (flagged for user)
- Glacial burst triggers off a manual "Crystal Stacks" slider; actual poisebreak/high-stack cadence not representable (no poise system).
- Static Buildup strike COUNT via manual "Weapon Charge" slider (charge building not modeled); strike damage TYPES (magic/air) inferred, unverified.

## Remaining (uncommitted, do not lose)
Everything above is UNCOMMITTED alongside the Plan Bee in-flight work. Do not commit unless asked.

## User spec (condensed)
- Separate Level Damage Bonus & Effective Boost from combined combatMult. Each effect explicitly chooses level/effective/both/neither.
- "Do not make all inherited/proc damage automatically use the same combined combatMult."
- "Do not change existing behavior unless the wiki/code evidence supports it."
- Wiki behaviors:
  - Poisonous: bonus Hex dmg = 2*perkAmount, 1.0 hex dmg + 1.0 hex scaling, unaffected by most damage-boosting perks, separate proc/bonus effect (like Ignition).
  - Glacial Buildup: burst base = 16*perkAmount; flat perkAmount hit dmg unaffected by modifiers except its own scaling (NOT level/effective).
  - Static Buildup: lightning = (3 + rmbDamage*0.1538) * (1 + 0.1*perkAmount); rmbDamage inherited POST-scaling PRE-boost; inherited rmb dmg affected by Level Damage Bonus; strike itself can also receive Level Damage Bonus (only perk that does both); strikes do NOT inherit RMB's other boosts but CAN get their own; (1+0.1*amt) is SB own scaling.
  - Inheritance pipeline: RMB base -> scaling -> inherited rmbDamage -> SB creates dmg -> SB own modifiers (never RMB final -> inherit whole).
- Snarl: affected by level dmg bonus; must NOT be affected by damage types >1 (Channeled Weapon), Armor Penetration, Void Contract.
- Heals: heal bonus itself != damage bonus; preserve Level Healing vs Level Damage distinction.
- Damage-inherit effects (Lightning Cloak, Luminescent, Blub Blub): affected indirectly by inheriting original hit's increase, even if not affected themselves.
- Ignition & Poisonous USED TO be exempt from level dmg bonus; verify current, preserve verified behavior (working-tree currently re-adds level to Ignition = keep).
- "Poisonous is a near identical copy to ignition."

## Working tree state (partial refactor, uncommitted)
- BoostEntry.isLevel added; Level Damage flagged isLevel (1 + level/80). _levelMult extracted.
- _categoryMult(type, procAllowed, excludeGeneral, excludeLevel) + _xCombatMult/_xEffectiveMult per category.
- PerkDmgComputedEntry.effectiveMult; weaponHits carry effectiveMult (+NoFinisher variants).
- BaseDamageCalc props: levelMult, perkEffectiveCombatMult, dragonStateEffectiveCombatMult.
- Snarl rework: baseSum = Σ(baseDmgTypes ?? dmgTypes) × scalingMult × levelMult; excludes combatMult/effective/AP/Void Contract/type bonuses. Remaining leak: `?? hit.dmgTypes` fallback (hits lacking baseDmgTypes, e.g. Mount M1/WA).
- Ignition still hardcoded in _perkOnHitDamages: `ignitionLevelMult = isIgnition ? _levelMult : 1`.
- Poisonous/Glacial Buildup/Static Buildup NOT implemented anywhere.
- Unrelated uncommitted Plan Bee work must not be broken. Tests: only planBeeRune.test.ts, runebasedmg.test.ts (pnpm test).

## Plan
- Phase 1: Data-driven Level/Effective config for perk damage (replace isIgnition hardcode, add flags to PerkDmgDef). Verify no behavior change vs working tree.
- Phase 2: Implement Poisonous (copy Ignition, hex).
- Phase 3: Implement Glacial Buildup (flat on-hit + burst).
- Phase 4: Implement Static Buildup + post-scaling/pre-bonus inheritance plumbing.
- Phase 5: Finish Snarl fix (remove dmgTypes fallback; ensure baseDmgTypes on all Snarl-triggering hits).
- Phase 6: Validation (pnpm test, build, lint) + new tests.