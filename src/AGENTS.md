# Voxlblade Builder

Stack:
- Svelte
- TypeScript

General Rules:

- Prefer simple solutions.
- No new dependencies unless absolutely necessary.
- Preserve existing architecture.
- Produce minimal diffs.
- Explain root cause before proposing changes.
- Avoid unnecessary refactors.
- Keep styling consistent with existing theme.
- Prefer native JavaScript APIs.
- Prefer Svelte reactive statements over duplicated state.
- Avoid creating files for small utilities.

When fixing bugs:

1. Find root cause.
2. Show exact code changes.
3. Don't modify unrelated code.
4. Keep behavior unchanged unless requested.