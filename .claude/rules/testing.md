# Testing

Mostly unit and integration tests (Vitest + Testing Library), a thin layer of
Playwright for the flows that must never break. Judge a test by two questions: if
this broke silently would it matter, and could it break by accident?

## What to test

- **Schemas:** your own rules (a regex, a required field), not Zod's mechanics.
- **Server Actions:** valid input, invalid input, and what happens when a call fails.
- **Components with logic:** a validation message, a transformed value, a toast.
- **Data functions:** against the real (in-memory) database, not mocks.
- **E2E:** one test per critical flow, not per rule.

## What not to test

- shadcn/Base UI components, Tailwind classes, animations.
- `async` Server Components (pages): cover them through the e2e flow.
- Anything `ts-check` already guarantees, or plain config data.

## How

- Names describe behaviour (`rejects a leading digit`), never "test".
- Prefer strict matches (`toEqual`) over `toContain`. Build each case from one valid
  base value and override only the field under test.
- Mock at the boundary the unit calls (`vi.mock` for modules, actions, `next/cache`).
  Prefer the real thing when it is cheap: real schema, real messages, real database.
- Query like a user (`getByRole`, `getByLabelText`); wrap in the real providers.
- Co-locate: `foo.ts` next to `foo.test.ts`. Specs for flows live in `e2e/`.
- E2E: unique names per run, `{ exact: true }` where text can be a substring, wait
  for a navigation to land before typing.
- Prove a new test catches its bug: break the behaviour once, see it fail, revert.
- No `.skip` or `.todo` left behind.
