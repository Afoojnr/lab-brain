---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# TypeScript and React style

- Arrow functions; `async/await` only, no `.then()` chains.
- `type` for data shapes and unions; `interface` only for extendable contracts
  (`StorageAdapter`, `ImportParser`).
- No `any`/`unknown` without a `// @reason` comment.
- Null checks use `?.` and `??`, not `||` or ternaries.
- Guard clauses over nesting. Split files over ~150 lines into a folder with
  `index.tsx` plus sub-files; extract functions over ~30 lines.
- Keep side effects isolated in clearly named functions (`saveSampleToDatabase`);
  everything else is pure.
- Server Components by default. `'use client'` only for state, effects or browser
  APIs, and keep that client part small.
- Every async route segment has `loading.tsx` or a visible pending state; every
  segment that can fail has `error.tsx`.
- Pages/layouts orchestrate, components render. Components read server state through
  TanStack Query hooks, with query keys defined next to the hook.
- JSDoc on exported functions explains why it exists, with `@param`/`@returns`.
