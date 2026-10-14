# Code style

- Arrow functions, `async/await` (no `.then()` chains).
- `type` for data shapes; `interface` only for extendable contracts
  (`StorageAdapter`, `ImportParser`).
- No `any`/`unknown` without a `// @reason` comment.
- `?.` and `??` for null checks, not `||` or ternaries.
- Guard clauses over nesting. Split a file past ~150 lines into a folder; extract
  functions past ~30 lines.
- Keep side effects in clearly named functions; everything else is pure.
- Server Components by default; `'use client'` only for state, effects or browser
  APIs, and keep that part small.
- Every async route segment has `loading.tsx` or a pending state; every segment that
  can fail has `error.tsx`.
- Pages orchestrate, components render.

## Comments

Short and human. Explain why something is done, or a rule that is not obvious.

- Don't repeat what the name or the types already say.
- No `@param` / `@returns`, no multi-paragraph essays, no change history.
- A one-line `/** ... */` on an exported function is enough, and often nothing is.
