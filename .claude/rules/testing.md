---
paths:
  - '**/*.ts'
  - '**/*.tsx'
---

# Testing

Sources this is adapted from: Kent C. Dodds' "testing trophy" (static > unit/
integration > e2e, confidence-per-investment over coverage %), Testing
Library's guiding principle ("the more your tests resemble how software is
used, the more confidence they give you"), Playwright's official best
practices (user-facing locators, test isolation, web-first assertions), and
the Next.js App Router testing guide (Vitest cannot render `async` Server
Components — use Playwright for those).

## Philosophy

- Testing trophy, not pyramid: static types (`ts-check`/ESLint) is the
  foundation, most tests are unit/integration (Vitest + Testing Library), and
  a thin top layer of Playwright covers the few flows that must never break.
  Mostly integration, not too many of anything.
- No numeric coverage target. Judge each test by two questions: if this broke
  silently, would it matter, and could it actually break by accident? Skip it
  if the answer to either is no (library behavior, trivial config, a value
  that's just a restatement of itself).
- Test behavior through the public API, not implementation details. A test
  should survive a rewrite that keeps the same behavior.

## What to test

- Zod schemas: your own rules (a regex, a required field, trimming), not
  Zod's own mechanics — skip boundary-length tests that only re-check `.max()`.
- Server Actions: valid input, invalid input (ignored, or returned as
  `{ ok: false, code }` per the Errors rule in `CLAUDE.md`), and what happens
  when whatever it calls fails.
- Client components with real logic a user can see: a validation message, a
  value transformed as typed, a toast after success or failure.
- One Playwright test per critical flow, not per rule. Rules belong in unit
  and component tests, which run in milliseconds instead of seconds.

## What not to test

- shadcn/Base UI components, Tailwind classes, Motion animations — library
  code, not yours.
- `async` Server Components (any `page.tsx`, `Dashboard`, `*Empty`, anything
  without `'use client'` that `await`s something) with Vitest or Testing
  Library. Next.js does not support rendering them this way — cover them
  through the one Playwright flow that exercises them instead.
- Anything `ts-check` already guarantees, e.g. every locale having the same
  message keys (enforced by `messages/<locale>/index.ts`'s typing already).
- Plain data or config (`LOCALES`, `NAV_ITEMS`) with no behavior to assert.

## Naming and assertions

- Names describe behavior in plain words; never the literal word "test"
  (`rejects a leading digit`, not `test_prefix_3`).
- Prefer a strict match over a loose one: `toEqual`/`toHaveBeenCalledWith`
  with the full expected value, not `toContain`, unless "contains" really is
  the behavior.
- Build each case from one valid base value, then override only the field
  under test, so a failure can only be caused by that field.

## Mocking

- Mock at the boundary the unit under test calls, never the unit itself.
- Use `vi.mock` for anything reached as a plain function or module import
  (a Server Action, `next/cache`, `sonner`). Reach for MSW only once code
  makes a real `fetch`/HTTP call (the literature search, a TanStack Query
  hook against a route handler) — install it then, not before.
- Prefer the real thing when it's cheap and deterministic: the real Zod
  schema, real `next-intl` messages via `NextIntlClientProvider`.
- Call a working stand-in a "fake" (e.g. `DEMO_PROJECTS`), not a "mock" —
  "mock" means a call you record and assert on.
- `clearMocks: true` is set once in `vitest.config.ts`. Don't repeat
  `vi.clearAllMocks()` in every file's `beforeEach`.

## Component tests

- Wrap in whatever real context the component actually reads (e.g.
  `NextIntlClientProvider`) instead of mocking the context away.
- Query like a user: `getByRole`, `getByLabelText`. Avoid test ids and CSS
  selectors.
- Once the same provider wrapper repeats in 2-3 test files, move it into a
  shared `renderWithProviders` helper instead of copying it again.

## Playwright (`e2e/`)

- One browser project (`chromium`) until a real cross-browser bug shows up —
  three engines for one flow isn't worth the time yet.
- `getByText` matches substrings by default. Pass `{ exact: true }` whenever
  the asserted text could be a substring of something else on the page (a
  toast that echoes a name back collides with that name's own element).
- Any test that creates data against real, stateful storage (no database yet
  — see `data/projects.ts`) must use a value unique to that run, since
  nothing resets that storage between runs.
- `reuseExistingServer: !process.env.CI` in `playwright.config.ts` is
  intentional: reuse the local dev server, always start fresh in CI.

## File layout

- Co-locate: `foo.ts` + `foo.test.ts` in the same folder. Next.js explicitly
  allows this in the App Router; no separate `__tests__` tree.
- End-to-end specs live in `e2e/*.spec.ts`, excluded from Vitest's own
  `include` glob by `vitest.config.ts`.

## Part of the build, not an afterthought

- When writing or changing a Server Action, schema, or a component with real
  branching logic, write or update its test(s) in the same change.
- Before calling work done, run the new/changed tests (`yarn test`, and
  `yarn test:e2e` if the change touches that one flow) alongside
  `yarn ts-check` and `yarn lint`. Show the output; a change isn't verified
  until all of them pass.
- Prove a new test actually catches the bug it claims to: temporarily break
  the behavior (comment out the guard clause, remove the fix), confirm the
  test goes red, then revert. Do this as a check before presenting the work,
  not as something left in the diff.
- No `.skip`/`.todo` tests left behind. Fix or delete.
