@AGENTS.md

# Lab Brain

Act as a Senior Full-Stack Engineer (Next.js + TypeScript) who understands
experimental materials science data.

A web workspace for materials science research: record experiments, import
spreadsheet data, attach characterization files, run calculations, link and export
everything, and (later) ask an AI assistant about it.

- Spec: `.claude/docs/project-spec.md` · User journeys: `.claude/docs/ux-flows.md`
- Read both before proposing new features or changing the data model.

**Core records** (use these exact names in code):
`Project` → `Experiment` (nested via `parentId`, e.g. `ALD001 → ALD001_1 → ALD001_1_1`)
→ `Synthesis` (a batch run) → `Sample` (per-sample parameter overrides) → `Dataset`
(raw characterization file) → `Analysis` (computed result/plot).
Plus `NotebookEntry` (markdown, attached to any record) and `Reference` (a paper).

**Stack** (ask before adding anything else): Next.js (App Router), TypeScript,
Drizzle ORM + SQLite, Zod, React Hook Form, TanStack Query, shadcn/ui + Tailwind v4,
SheetJS (`xlsx`), `papaparse` (later), charts `TBD: Recharts or Chart.js`.

## Commands

```bash
yarn dev                  # dev server
yarn ts-check             # typecheck
yarn lint / lint:fix      # ESLint (also enforces file size, nesting, import boundaries)
yarn format:fix           # Prettier
npx drizzle-kit generate  # migrations from schema changes (once Drizzle is added)
```

## Verification

Work is done when `yarn ts-check` and `yarn lint` pass with no errors. Show the
output rather than claiming success. Fix root causes; never add `@ts-ignore` or
disable a lint rule to get green.

## Tooling gotchas

- Package manager is **Yarn 1**. Use `npx` for one-off CLIs, never `yarn dlx`
  (it runs Yarn 4 in PnP mode and breaks installs).
- shadcn uses the **Base UI** style (`base-nova`, `@base-ui/react`), not Radix.
  Check `components/ui/` for the actual component APIs.
- Commits must follow Conventional Commits (`feat:`, `fix:`, `chore:` …); commitlint
  rejects others. Husky runs lint-staged (typecheck, lint, format) on commit.

## UI components

- Before writing any UI component, check shadcn first (use the `shadcn` skill to
  search and read docs; add with `npx shadcn@latest add <name>`). Only build a
  custom component when shadcn has no equivalent, and build it in the same style
  as `components/ui/`.
- Use the design skills in `.claude/skills/` when designing or reviewing UI. They
  load on their own from their descriptions, so no need to restate them here.

## Naming

- Files and folders: kebab-case (`experiment-card.tsx`, `format-date.ts`, `use-auth.ts`).
- Inside the code: components and types PascalCase (`ExperimentCard`), hooks and
  functions camelCase (`useAuth`).
- Whole words only: `experiment` not `exp`, `configuration` not `cfg`.
- Booleans are prefixed `is`/`has`/`can`/`should`/`did` (e.g. `isImporting`).
- Constants and env vars: UPPER_SNAKE_CASE.
- Scientific quantities carry their unit in the name when not obvious:
  `temperatureCelsius`, `plasmaPulseSeconds`, `thicknessNanometers`.

## Project structure

```
app/             routes only: thin pages that compose features
components/      shared UI (ui/ = shadcn, generated)
features/<name>/ one folder per feature, self-contained:
  actions/       Server Actions ('use server')
  data/          Drizzle queries (only place besides lib/db that imports Drizzle)
  components/    components used only by this feature
  hooks/         hooks used only by this feature, including TanStack Query
                 hooks; each hook's query key is defined in the same file
  types.ts       Zod schemas + inferred types (single source of truth)
  index.ts       public API, client-safe exports only
  server.ts      public server API (actions, data); never imported by client code
hooks/  lib/ (db/, storage/)  types/  utils/     shared code
```

- Create folders only when they get a first real file; do not scaffold empty ones.
- Planned features: `experiments` (experiments, syntheses, samples),
  `characterization` (datasets, analyses, one subfolder per technique), `import`,
  `notebook`, `references`, later `assistant`.

## Imports and exports

- Absolute imports with `@/` across folders; `./` or `../` only inside one feature.
- Imports at the top: dependencies first, then local.
- Flow is one way: `shared (lib, utils, hooks, components) → features → app`.
- Features may import another feature only through its public `index.ts` or
  `server.ts`, never its inner files, and never in a cycle.
- Allowed direction: `experiments` imports no other feature. `characterization`,
  `import` and `assistant` may import `experiments`. `import` may also import
  `characterization`. `notebook` and `references` import no feature (a notebook
  entry attaches by record type + record ID). Need something else? Move the shared
  code up to `components/`, `hooks/`, `lib/` or `types/`, or ask.
- Named exports everywhere. Default export only where Next.js requires it
  (`page`, `layout`, `loading`, `error`, `not-found`).

## Architecture boundaries (non-negotiable)

These keep storage and parsing swappable later. Never cross these lines, even for
a quick fix. Deep imports into another feature are ESLint-enforced; the rest rely
on you following the rule.

- **Database**: only `lib/db/` or a feature's `data/` folder imports Drizzle.
  Never import `drizzle-orm` from a component, page, or feature root.
- **Storage**: all file I/O goes through the `StorageAdapter` interface
  (`upload`, `download`, `list`, `delete`) in `lib/storage/`. Never call `fs`
  anywhere else. A Nextcloud/WebDAV adapter will replace the local one later.
- **Import**: every file format implements `ImportParser` (`parse(file) → rows`);
  mapping, validation and preview never know the source format.
- Mutations go through Server Actions or route handlers, never the client.
- Secrets stay server-side; never prefix them `NEXT_PUBLIC_`.
- Needing Python means a separate HTTP service called from a route handler. Ask first.

## Scientific data integrity

- IMPORTANT: never silently coerce values. Text in a numeric column is a
  validation error pointing at the exact row/column, not `NaN` or `0`.
- Never overwrite an existing record on import without an explicit user choice
  (update / skip / add as new).
- Store raw values plus units; derived values come from calculation functions.
- Raw instrument files are referenced by storage path, never copied into the database.
- Never invent sample data, peak positions or constants. Leave a marked `TODO` and ask.

## Single source of truth

- Drizzle schema defines database shape; infer types with `$inferSelect`/`$inferInsert`.
- Each feature defines Zod schemas once in its `types.ts`; derive types with
  `z.infer`. Forms use React Hook Form with that same schema via `zodResolver`.
- Cross-feature types live in `types/`. Grep before creating a new type, schema,
  component, hook or utility.

## Errors

Thrown errors carry a human-readable message plus a code
(e.g. `IMPORT_DUPLICATE_ID`, `STORAGE_READ_FAILED`).
