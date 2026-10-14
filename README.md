# Lab Brain

A web workspace for materials science research. Record experiments, import your spreadsheets, attach characterization files (EDX, ellipsometry, FTIR), plot and compare results, and ask an AI about your data with your own key.

---

## Table of Contents

- [Stack](#stack)
- [Setup](#setup)
- [Usage](#usage)
- [Configuration](#configuration)
- [Your data and backups](#your-data-and-backups)
- [Docker](#docker)
- [Deploying the demo](#deploying-the-demo)
- [Folder Structure](#folder-structure)
- [Contributing](#contributing)

---

## Stack

| Layer           | Technology                                         |
| --------------- | -------------------------------------------------- |
| Framework       | Next.js 16 (App Router), React 19                  |
| Language        | TypeScript 5 (strict mode)                         |
| Database        | SQLite through Drizzle ORM (libSQL)                |
| Styling         | Tailwind CSS v4 + shadcn/ui (Base UI)              |
| Forms and data  | React Hook Form, Zod, TanStack Query               |
| Charts          | Recharts                                           |
| Spreadsheets    | SheetJS (`xlsx`), `papaparse`                      |
| AI              | Vercel AI SDK (Claude, OpenAI, OpenRouter, Ollama) |
| Languages       | English and French (`next-intl`)                   |
| Tests           | Vitest, Testing Library, Playwright                |
| Package manager | Yarn 1 (only)                                      |

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Afoojnr/lab-brain.git
cd lab-brain
```

### 2. Install dependencies

Node 24 or newer is required (see `.nvmrc`).

```bash
yarn install
```

> Never use `npm` or `pnpm`. Yarn 1 is the only supported package manager.

### 3. Start it

```bash
yarn dev
```

Open `http://localhost:3000`. The first run is empty: create a project, or open **Characterizations** to analyse raw files without one. The database is created on first use in `./data`.

---

## Usage

### Development

| Command      | Description                                     |
| ------------ | ----------------------------------------------- |
| `yarn dev`   | Start the dev server at `http://localhost:3000` |
| `yarn build` | Build for production                            |
| `yarn start` | Run the production build                        |

### Code quality

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `yarn ts-check`   | Typecheck                                  |
| `yarn lint`       | ESLint (also checks the import boundaries) |
| `yarn format:fix` | Prettier                                   |
| `yarn test`       | Unit and component tests (Vitest)          |
| `yarn test:e2e`   | End-to-end tests (Playwright)              |

### Database

| Command                    | Description                              |
| -------------------------- | ---------------------------------------- |
| `npx drizzle-kit generate` | Create a migration after a schema change |

Migrations in `drizzle/` run automatically the first time the app opens the database.

---

## Configuration

Everything works without any setting. These are all optional:

| Variable                   | What it does                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `LAB_BRAIN_DEMO`           | `true` makes the public demo: temporary data, a banner, and an example-data button. Leave unset for a normal install. |
| `LAB_BRAIN_SITE_URL`       | The public address, used for link previews. Defaults to `http://localhost:3000`.                                      |
| `LAB_BRAIN_ALLOW_INDEXING` | `true` lets search engines index the site. Off by default.                                                            |
| `LAB_BRAIN_DATA_DIR`       | Where the database is kept. Defaults to `./data`.                                                                     |
| `LAB_BRAIN_DATABASE_URL`   | A full database address, instead of the file in the data folder.                                                      |
| `LAB_BRAIN_STORAGE_DIR`    | Where uploaded files are kept. Fixes the folder (Settings can't change it).                                           |
| `LAB_BRAIN_BACKUP_DIR`     | Where database backups are written. Used by Docker.                                                                   |

AI keys are not environment variables: each person enters their own in **Settings**, and it stays in their browser.

---

## Your data and backups

- Your records live in a SQLite file on the computer that runs the app (`./data/lab-brain.db`). Keep it on a local disk, not on a synced or network drive, where SQLite can be damaged.
- Uploaded files go to `./storage` until you choose a **Data folder** in **Settings**. Pick a folder your cloud drive syncs and Lab Brain creates a `Lab Brain` folder inside it with `files/` and `backups/`.
- While something changed, a copy of the database is saved to `backups/` every 10 minutes, and the last 30 per computer are kept. **Settings** has **Back up now** and **Restore**.
- To move to a new computer: install the app, choose the same synced folder, and restore the latest backup.
- Everyone who can open that folder can read your files and backups.

---

## Docker

```bash
docker compose up --build -d
```

Open `http://localhost:3000`. The compose file keeps the database, files and backups in three volumes, so they survive updates. Replace a volume with a folder path to keep that data somewhere you choose, for example a synced folder for `/backups`.

Inside the container the folders are fixed through `LAB_BRAIN_DATA_DIR`, `LAB_BRAIN_STORAGE_DIR` and `LAB_BRAIN_BACKUP_DIR`.

---

## Deploying the demo

The demo keeps its data in temporary storage and starts empty after every restart. It needs one always-on process rather than a serverless host, because those run several copies, each with its own data.

`render.yaml` is a ready blueprint for [Render](https://render.com): it runs `yarn build` and `yarn start` with `LAB_BRAIN_DEMO=true`. Create a Blueprint from the repo. On the free plan the service sleeps after about 15 minutes, so ping `/api/health` every 10 minutes to keep it awake.

---

## Folder Structure

```
lab-brain/
├── app/          # Routes only: thin pages that compose features
├── components/   # Shared UI, grouped by purpose (ui/ is shadcn)
├── features/     # One folder per feature: experiments, characterization,
│                 #   import, plots, references, reports, assistant, settings
├── lib/          # Shared code: db, storage, export, i18n, ...
├── drizzle/      # Database migrations
├── messages/     # English and French text
└── e2e/          # Playwright specs
```

A feature has `actions/`, `data/` and `components/`, and is used by other code only through its `index.ts`, `shared.ts` and `server.ts`.

---

## Contributing

### Before opening a pull request

```bash
yarn ts-check && yarn lint && yarn test
```

Run `yarn test:e2e` too when you touch a main flow.

### Branching

Name it after what it does, in lowercase with hyphens, e.g. `saved-plots` or `fix-import-dates`. A type prefix is optional: `feat/saved-plots`, `fix/import-dates` and `chore/clean-repo` are all fine.

### Commit messages

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add backups to the data folder
fix: keep zero values when importing
chore: upgrade drizzle-orm
```

| Type       | When to use                            |
| ---------- | -------------------------------------- |
| `feat`     | A new capability or visible change     |
| `fix`      | A bug fix                              |
| `refactor` | Restructure without changing behaviour |
| `test`     | Tests only                             |
| `docs`     | README or comment updates              |
| `chore`    | Dependencies, config, tooling          |

### Ground rules

- Data comes first: a value is never silently coerced, and nothing is overwritten without an explicit choice.
- The database is only touched in `lib/db/` and each feature's `data/` folder; files only through the `StorageAdapter`.
- Text shown to users goes in `messages/en` and `messages/fr`.
- Comments say why, in a sentence or two. See `.claude/rules/` for the style and testing rules.
