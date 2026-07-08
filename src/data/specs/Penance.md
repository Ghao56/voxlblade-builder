# Penance — Implementation Specification

> Implement exactly as specified below. Do NOT rely on the in-game description text in `perks.json` (it is misleading). The formulas and thresholds here are the source of truth.

---

## 1. Perk Data (`src/data/perks.json`)

**No changes needed** — entry at line 2033 already exists. The description is intentionally kept as-is (it matches the in-game tooltip even though it's inaccurate). The description text has no effect on mechanics.

---

## 2. Damage Boost (`src/data/Boost.ts`)

### 2a. Extend `BoostContext` interface

Add a new field to the interface (around line 21):

```ts
hpFillPct?: number        // 0–100, current HP fill percentage (from BuildState.hpFill)
```

### 2b. Register Penance boost in `BOOST_DEFS`

Add this entry to the `BOOST_DEFS` array (before the `isLevel` entry at line 269):

```ts
{
  sourceName: 'Penance',
  type: 'dmg',
  calcFn: (ctx) => {
    const amount = ctx.perks['Penance'] ?? 0
    if (amount <= 0) return null
    const hpFill = ctx.hpFillPct ?? 100
    const hpPercent = hpFill / 100                       // 0.0–1.0
    const boostPerStack = Math.min(0.25, (0.25 * (1 - hpPercent)) / 0.65)
    const totalBoost = 1 + boostPerStack * amount
    const pct = Math.round((totalBoost - 1) * 10000) / 100
    return {
      multiplier: totalBoost,
      condition: `${hpFill}% HP → +${pct}% dmg`,
    }
  },
},
```

Key behaviors:
- Returns `null` when Penance perk is absent → excluded from boost list
- +0% at 100% HP → ×1.0 multiplier
- +12.5% at 67.5% HP → ×1.125 multiplier
- +25% at ≤35% HP → ×1.25 multiplier (cap)
- Formula per stack, multiplies by `amount`
- Multiplier applies to all damage types (no `appliesTo` restriction → generic)

### 2c. Pass `hpFillPct` through `calcBoosts` (`src/lib/engine/build.ts`)

In `calcBoosts()` around line 138, add `hpFillPct` to the `BoostContext` object:

```ts
const ctx: BoostContext = {
  perks, naturalCritChance, jumpBoost, summonCount,
  ragePotency, bouncePotency, quickdrawPotency,
  tailwindPotency, speedBoost, attackSpeed, tenacity, inDarkness,
  emotionalState, level,
  mountActive, summonBoostPct, selectedWeaponArt,
  hpFillPct,   // ← add this
}
```

The `hpFillPct` parameter already exists in the `calcBoosts` signature — it's just not passed into the context.

---

## 3. Bleed Effect (`src/data/BuffData.ts`)

### 3a. Add Penance to `PERK_BUFFS`

Add a factory entry (around line 545):

```ts
'Penance': (amount, allPerks) => {
  const buffs: GrantedBuff[] = []
  // Bleed debuff is always listed so the user knows this perk can apply it,
  // with a condition note that it only procs while HP ≤ 35%.
  if (amount > 0) {
    buffs.push({
      buffName: 'Bleed',
      potency: 0,
      duration: 5,
      condition: `50% chance per hit · only while HP ≤ 35%`,
      sourceName: 'Penance',
      sourceType: 'perk',
    })
  }
  return buffs
},
```

This makes Bleed appear in the dummy debuff list whenever Penance is equipped, with a condition note. The debuff is visible but should be visually annotated when inactive (HP > 35%).

### 3b. No changes needed to `BUFF_DEFS`

Bleed is already defined as a debuff in `BUFF_DEFS` (line 226).

---

## 4. UI — Conditional Debuff Visual (`src/DamageAnalyzer.svelte`)

### 4a. Track Penance HP condition

Add a reactive boolean near the other reactive debuff helpers (around line 460):

```ts
$: _penanceBleedActive = (perks['Penance'] ?? 0) > 0 && _hpFillPct <= 35
$: _dummyHasBleedActive = _dummyDebuffs.some(d => d.name === 'Bleed' && !disabledDebuffs.has(d.name))
```

### 4b. Annotate Bleed from Penance in debuff rendering

When rendering the Bleed debuff entry that comes from Penance, check if `_penanceBleedActive` is `false` and visually dim it or add an inactive badge.

Locate the debuff render block (around line 3972+ in `DamageAnalyzer.svelte` and the `<BaseDamageCalc>` component) — the exact approach depends on the existing debuff toggle UI pattern.

Alternatively (simpler): modify `_dummyDebuffs` filtering to mark Penance-sourced Bleed as conditionally inactive. In the `_dummyDebuffs` derivation (line 387), after building the list, annotate Penance entries:

```ts
// After building debuffs list, mark Penance Bleed if HP > 35%
for (const d of result) {
  if (d.name === 'Bleed' && d.sourceName === 'Penance' && !_penanceBleedActive) {
    d.inactive = true  // add inactive flag for UI dimming
  }
}
```

---

## 5. Perks.json Tags (`src/data/perks.json`, line 2036)

The existing tags are `["Damage Boost", "Debuff", "Armor"]` — these are correct and need no change.

---

## 6. Verification Checklist

- [ ] `BoostContext.hpFillPct` field added
- [ ] Penance `calcFn` in `BOOST_DEFS` with correct formula
- [ ] `hpFillPct` passed to `BoostContext` in `calcBoosts()`
- [ ] `PERK_BUFFS` entry for Penance adding Bleed debuff
- [ ] Bleed debuff condition note shows "50% chance per hit · only while HP ≤ 35%"
- [ ] Boost multiplier reactively updates when HP slider changes (Svelte reactivity handles this automatically via `$result = derived(build, $b => calcBuild($b))`)
- [ ] Bleed visual state reacts to HP ≤ 35% threshold
- [ ] Multiplier stacks correctly with perk amount (perkAmount on Atonement = 1)
