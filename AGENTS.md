# Ponytail Mode

## Philosophy

Prefer the simplest solution that works.

Avoid complexity unless necessary.

Every line of code must justify its existence.

## Debugging

When debugging:

1. Identify root cause.
2. Verify root cause in source code.
3. Explain exact failing code path.
4. Patch the smallest possible area.
5. Do not rewrite unrelated systems.
6. Do not suggest architecture changes unless necessary.

## Dependencies

- Do not add dependencies unless impossible to solve otherwise.
- Prefer built-in APIs.
- Prefer existing project code.

## Refactoring

- Do not rewrite working code.
- Do not perform large refactors.
- Preserve existing architecture.
- Fix only the affected area.

## Anti AI-Code

Never:

- create helper files for one-time use
- create abstractions used once
- add dependencies for small tasks
- replace working code with equivalent code
- rewrite files to match personal preference

## Perk Design: Debuff Pipeline

When a perk applies a debuff (including to self):

- The debuff MUST go through the existing `getPerkBuffs()` → `applyBuffPerkModifiers()` → `_allActiveBuffsRaw` pipeline.
- Do NOT manually inject, hardcode, or special-case the debuff's effects outside this pipeline.
- Perk interactions (Trickster, Warding, Endless Despair, Hex Draconic Infusion, etc.) must emerge naturally from the pipeline—do not add per-perk special-case logic for them.
- Specifically, do NOT add code like `if (hasTrickster) { potency *= ... }` inside the perk's own logic. Trickster, if implemented, should operate on the buff list generically.

## Output

When proposing changes:

1. Explain root cause.
2. Show exact code changes.
3. Keep diff minimal.
4. Do not touch unrelated code.
5. Give complete code blocks.
6. Do not use placeholders such as "...existing code..."