# Voxlblade Builder

## Stack

* Svelte
* TypeScript

---

## General Rules

* Prefer simple solutions.
* No new dependencies unless absolutely necessary.
* Preserve existing architecture.
* Produce minimal diffs.
* Explain root cause before proposing changes.
* Avoid unnecessary refactors.
* Keep styling consistent with existing theme.
* Prefer native JavaScript APIs.
* Prefer Svelte reactive statements over duplicated state.
* Avoid creating files for small utilities.

---

## Before Making Changes

Always:

1. Read the entire relevant file.
2. Search for all usages of affected variables, functions, and types.
3. Verify imports exist before using them.
4. Verify referenced variables actually exist.
5. Verify the change will not break reactive dependencies.
6. Do not assume file structure without searching.

---

## Bug Fixing Protocol

1. Find root cause.
2. Explain root cause briefly.
3. Show exact code changes.
4. Do not modify unrelated code.
5. Keep behavior unchanged unless requested.

---

## Svelte Rules

* Prefer reactive statements over duplicated state.
* Do not convert reactive statements to stores unless necessary.
* Preserve existing component APIs.
* Avoid introducing derived state when a computed value is sufficient.
* Keep current event flow and bindings unless required by the fix.

---

## TypeScript Rules

* No `any`.
* Prefer narrowing over casting.
* Avoid type assertions unless unavoidable.
* Reuse existing interfaces and types whenever possible.
* Preserve strict typing.

---

## Output Rules

* Give complete code blocks.
* Never use placeholders such as:

  * `// existing code...`
  * `// rest unchanged`
  * `...`
* Include all modified lines.
* Clearly identify which file is being changed.

---

## Refactoring Rules

Do NOT refactor unless explicitly requested.

Do NOT:

* rename files
* move files
* split files
* merge files
* change architecture

unless the user specifically asks for it.

---

## Performance Rules

* Avoid duplicate calculations.
* Reuse existing computed values.
* Prefer computed values over duplicated state.
* Do not introduce caching unless profiling indicates a need.

---

## Project Goal

Maintain stability of the existing Voxlblade Builder codebase while making the smallest safe change necessary to solve the requested problem.
