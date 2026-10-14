@AGENTS.md

# Lab Brain

A web workspace for materials science research: record experiments, import
spreadsheets, attach characterization files, run analyses, plot, export, and ask
an AI about the data (bring your own key). Write code as a senior full-stack
engineer who understands experimental data.

- Spec: `.claude/docs/project-spec.md`. User flows: `.claude/docs/ux-flows.md`.
  Read both before changing the data model or adding a feature.
- Setup, configuration, Docker and deployment are in `README.md`.

## Records

Use these names in code: `Project` → `Experiment` (one sheet: its columns, a code
prefix and a protocol) → `Sample` (one row, a value per column, empty = not
recorded) → `Characterization` (technique + date + note) → `Dataset` (a raw file)
and `Analysis`. Columns are a parameter (set) or a result (measured, never
prefilled). Also `Study` (a group of samples), `SavedPlot` (a plot setup, never a
picture) and `Reference` (a paper). Never hardcode technique names or prefixes:
the user names everything.

## Stack

Next.js (App Router), TypeScript, Drizzle + SQLite (libSQL), Zod, React Hook Form,
TanStack Query, shadcn/ui (Base UI, `base-nova`) + Tailwind v4, next-intl, Vercel
AI SDK, Recharts, SheetJS, driver.js. Ask before adding anything else.

## Commands

```bash
yarn dev          # dev server
yarn ts-check     # typecheck
yarn lint         # ESLint (also enforces boundaries)
yarn test         # Vitest
yarn test:e2e     # Playwright
npx drizzle-kit generate   # migration after a schema change
```

Done means `ts-check`, `lint` and the relevant tests pass. Show the output; fix the
cause, never add `@ts-ignore` or disable a rule.

## Structure

```
app/            routes only: thin pages that compose features
components/     shared UI, grouped by purpose (ui/ is shadcn, generated)
features/<x>/   actions/ data/ components/ hooks/ + types.ts, schemas.ts,
                index.ts (components), shared.ts (client-safe), server.ts (data)
lib/            db/, storage/, config/, export/, i18n/, ...
messages/       en and fr
```

- A feature's root holds only its entry points, `types.ts` and `schemas.ts`; other
  code goes in a folder named for what it does. A test sits next to its file.
- Create a folder only when it has a first real file.
- Files and folders are kebab-case, whole words, booleans `is/has/can/should/did`.
- Named exports; default only where Next.js requires it.

## Rules

- **Database:** only `lib/db/` and a feature's `data/` import Drizzle.
- **Files:** all file I/O goes through `StorageAdapter` (`lib/storage/`).
- **Features:** import another feature only through its `index.ts`, `shared.ts` or
  `server.ts`, never in a cycle. `experiments` imports no feature; `characterization`,
  `import`, `plots`, `references` may import `experiments`; `import` also
  `characterization`; `reports` also `plots`; `assistant` also `references`. A delete
  that touches several features is composed in `app/(workspace)/_actions/`.
- **Mutations** go through Server Actions or route handlers. Secrets stay server-side.
- **Data:** never coerce a value silently (text in a number column is an error with its
  row and column). Never overwrite on import without an explicit choice. Store raw
  values with units; derive in calculation functions. Never invent data or constants:
  leave a marked `TODO` and ask.
- **Errors** are shown as a toast, translated in `messages/en` and `messages/fr`.
- **Comments:** say why, not what, in a sentence or two. No `@param`/`@returns`, no
  restating the name, no history ("Step 6", "now supports").
- **Commits:** Conventional Commits, no scope (`feat: ...`). Branch: a short hyphenated name for what it does (a `feat/` or `fix/` prefix is optional).

## Tests

See `.claude/rules/testing.md`.
