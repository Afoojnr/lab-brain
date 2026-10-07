# Lab Brain — A Connected Research Workspace for Materials Science

## Overview

A web-based research workspace for experimental materials science, built around a
structured, linked data model: sample → characterization → analysis → conclusion.
It replaces the current fragmented setup (folders, spreadsheets, PowerPoint, personal
notes) with one connected system that lets you collect data, retrieve it later, run
simple characterization calculations, and export the whole chain for a future reader.

**Goals, in order**: (1) a genuinely useful daily tool for your own PhD data, (2) a
polished, deployed, full-stack portfolio piece to show recruiters, (3) publishing on
JOSS — a nice-to-have if the code ends up clean and generic enough, not a design
constraint driving the architecture.

Architecturally, it's a single Next.js application — frontend, API routes, and
database access all in one project. No separate Python backend, no FastAPI. Full
computational rigor (Python/HyperSpy/lmfit-style peak fitting) isn't needed for the
calculations actually required here (see "Characterization" below), so keeping
everything in one TypeScript codebase is simpler to build, deploy, and demonstrate.

---

## Problem

Materials research data is currently scattered across disconnected tools and formats:

- Synthesis parameters live in spreadsheets or paper notebooks.
- Characterization data (EDX, FTIR, ellipsometry, etc.) sits in raw instrument export
  files in local folders, disconnected from the synthesis that produced the sample.
- Analysis and figures live in one-off scripts/notebooks with no link back to the raw
  data or the reasoning behind a given step.
- None of this is exportable in a form a future reader can follow end-to-end.

The result: it's hard to answer simple questions like "which sample was this?", "what
changed between this run and the last one?", or "how was this figure produced?" —
and nearly impossible for someone else (or future-you) to pick up the work later.

---

## Vision

A researcher should be able to record a synthesis, attach its characterization data,
run simple calculations on it, and write the reasoning behind each step — all as
linked, queryable objects — then export the whole chain in a form a future reader can
follow without access to the original tools.

An AI assistant sits on top of this connected data (plus a curated set of papers) and
can answer questions grounded in the researcher's own experimental history and real
literature — not generic or hallucinated advice.

---

## Core Features

### 1. Data & provenance layer (foundation)

- Structured records for `Project`, `Experiment`, `Study`, `Sample`,
  `Characterization`, `Dataset` and `Analysis`, each with a unique ID. The model
  mirrors how the data is already kept in Excel: one sheet per kind of sample.
- `Project` is the top-level container (e.g. "ALD of BxC", "CVD of borophene") with a
  free-text description.
- `Experiment` is one sheet of the spreadsheet (e.g. "Deposition" with prefix `ALD`,
  "Paschen law" with prefix `PSL`). It owns its **columns**, its code prefix and a
  base protocol. Experiments never nest.
- **Columns** belong to an experiment and are either a **parameter** (what you set:
  temperature, plasma power) or a **result** (what you measured: thickness, B/C
  ratio). Each has a unit and a number or text type, and may be added at any time;
  older samples simply have no value for it. A parameter can have a default that is
  copied into a new sample when saved; a result is never prefilled.
- `Sample` is one row (e.g. `ALD023`, unique within the project): a value per column
  (an empty value means "not recorded", never zero), an optional date, an
  implementation (why it was made), an observation, and one short note. A
  treated sample such as an annealing is just another sample with its own code.
- `Study` is an optional named group of samples inside one experiment (e.g. "Plasma
  pulse study"). A sample can be in several studies; a study never spans experiments.
- `Characterization` records that a measurement was done on a sample (technique, date,
  note). The same technique can be recorded many times. Technique names are typed by
  the user, never a fixed list, and respelled to the project's existing spelling.
- Explicit links between records (sample → characterization → dataset → analysis →
  figure), forming a traceable provenance chain.
- Metadata (records + links) lives in a database (SQLite via Drizzle ORM to start —
  file-based, zero setup, easy to inspect — with a clean path to Postgres later if
  ever needed). Raw files are _referenced_, never duplicated into the database.

### 2. Storage module (files: local now, Nextcloud later)

- A single `StorageAdapter` interface (`upload`, `download`, `list`, `delete`) is the
  only thing the rest of the app talks to for file I/O — no raw file paths hard-coded
  into components, API routes, or parsing logic.
- **v1 implementation (built)**: local filesystem under one storage folder
  (`LAB_BRAIN_STORAGE_DIR`, default `./storage`; point it at a Nextcloud-synced folder
  if you like). Files are stored as `project/experiment/sample/technique/<date>_<name>`.
  A `Dataset` record keeps only the path, type and size, never the bytes. Every path is
  checked to stay inside the folder. One file belongs to one characterization of one
  sample (a repeat measurement is another characterization). Up to 50 MB each, any
  type; PNG/JPEG/GIF/WebP show inline, everything else is a download. Files are served
  by `/api/datasets/<id>` and removed with their characterization.
- **Later, additive only**: a `NextcloudAdapter` implementing the same interface via
  WebDAV (the `webdav` npm package, authenticated with a Nextcloud app-password,
  called from a Next.js API route so credentials stay server-side). Swapping which
  adapter is active is the only change needed — nothing else in the app touches
  storage directly. Nextcloud's own client handles device sync once files are there.

### 3. Import from existing spreadsheets (Excel and CSV, built)

- You already have real PhD data recorded in Excel — the app should read that in and
  autofill `Experiment`, column and `Sample` records instead of forcing re-entry from
  scratch.
- Works both ways: **create new records** from a fresh import (one spreadsheet sheet
  becomes one experiment), or **add rows to an existing experiment**.
- Flow: upload a file → **column-mapping step** (map your existing column headers —
  temperature, cycles, plasma pulse, sample ID, etc. — to the app's fields, since
  every spreadsheet is laid out differently) → **validation step** → preview the rows
  it will create → confirm → records are created and linked (each row becomes a
  sample, each mapped column a parameter or result column).
- **Validation, before anything is written**:
  - **Duplicate sample/experiment IDs**: if an ID in the spreadsheet already exists in
    the target experiment (or elsewhere in the project), flag it as a warning —
    update the existing record, skip the row, or treat it as a genuinely new/renamed
    entry are the choices offered, never silently overwritten.
  - **Type mismatches**: if a column is mapped to a numeric field (temperature,
    cycles, ratio) but a cell contains text (or is blank/malformed), flag that
    specific row+cell rather than failing the whole import.
  - Nothing is committed until these are resolved or explicitly acknowledged.
- Built as a small `ImportParser` interface (`parse(file) → rows[]`), same pattern as
  the storage adapter: an `ExcelParser` (via `SheetJS`/`xlsx`) and a `CsvParser` (via
  `papaparse`, delimiter detected, so `;` files with decimal commas work). Mapping,
  validation and preview never know the source format.
- **As built:** the file is read in the browser (max 10 MB, 5,000 rows, one sheet per
  import). Excel cell comments are added to the sample's note as `Header: comment`
  lines (the cell colour cannot be read). An update only changes cells that have a
  value, so an empty cell never erases a stored one. The server validates the whole
  import again before writing, so a preview that went stale writes nothing. Until the
  database step, imported data lives in memory like everything else.
- The mapping step is what makes this reusable beyond your own spreadsheet layout —
  worth building once, generically, rather than hard-coding your specific columns.

### 4. Notebook / narrative layer

- Markdown-based entries for the "why," attached to specific records rather than
  floating free.
- Export to a static, readable form (HTML/PDF) for someone without access to the tool
  itself.

### 5. Characterization — simple, deterministic calculations (no Python needed)

Each technique is a small TypeScript module: scan a folder (via the storage adapter),
parse the raw export format, compute a derived value, and hand off to a chart.

- **EDX**: read per-point element concentrations from the exported file(s), compute
  ratios (e.g. average B/C ratio across points), plot ratio vs. a chosen parameter
  (temperature, cycles, plasma time, etc.).
- **FTIR**: parse the CSV, plot the spectrum, and check intensity at a pre-defined set
  of known peak positions (peak _assignment_ against a list you already have — not
  full peak _fitting/deconvolution_, which is the one case that would actually need a
  numerical library; not required for this workflow).
- **Ellipsometry**: thickness ÷ cycles = growth-per-cycle (GPC); plot GPC (or
  thickness) vs. a chosen parameter across samples.
- All of this is arithmetic + array operations + charting (Recharts/Chart.js) — well
  within plain JavaScript/TypeScript, no numpy/scipy-equivalent required.
- Built as small, independent modules per technique so a new technique is a new
  parser + calculation function, not a change to the core app.

### 6. AI research assistant

- A chat interface answering questions grounded in the researcher's own notebook
  entries and metadata — e.g. "what happened when I increased plasma time above 10
  seconds?" — answered from your own linked experiment history.
- **Structured context, not just text chunks**: when scoped to a project, retrieval
  includes the experiment tree's structure (objectives, parameters, results per node,
  in hierarchical/chronological order), not only isolated notebook paragraphs.
- **Literature grounding, kept explicitly separate from internal data**, to avoid
  generic or hallucinated advice:
  - A `Reference` record (title, authors, year, DOI/URL, optional PDF), linked to a
    `Project` and optionally to specific `Experiment`/`Notebook` entries — your own
    curated reading list, indexed into the same retrieval pipeline as notebook
    entries.
  - Live literature search as a tool call (start with one API — Semantic Scholar has
    the simplest free API and decent materials-science coverage) for questions beyond
    what's been curated — the assistant retrieves and cites real papers at query time
    rather than recalling titles/DOIs from training data.
  - Responses must visibly distinguish "from your own experiment data" citations from
    "from external literature" citations — never blended into one unsourced claim.
- **"Suggest next steps" is a later, higher-risk capability**, deferred until plain
  grounded Q&A is solid — generating suggestions before citation discipline works is
  exactly how you get confident, generic, ungrounded advice.

---

## MVP Scope

**Stage 1 — the core loop (build first):**

- Next.js app: data model (`Project`, `Experiment`, `Study`, `Sample`,
  `Characterization`, `Dataset`) via Drizzle/SQLite, linking/provenance logic, and a
  local-file `StorageAdapter`.
- Excel import (column-mapping → preview → confirm) to bootstrap real existing data
  instead of manual re-entry — CSV support added later behind the same interface.
- Notebook entries (markdown, linked to records).
- At least one characterization module, fully working end-to-end on real data (EDX,
  FTIR, or ellipsometry — whichever you have the cleanest data for right now).
- Export to a readable static document (HTML/PDF).
- Deployed (e.g. Vercel) so it's a live, linkable portfolio piece, not just local code.

**Stage 2 — the AI assistant (build second):**

- Retrieval over notebook entries + structured metadata + curated `Reference` records.
- Chat interface, scoped to one project, with source-labeled citations.
- Live literature search tool call as a fallback beyond curated references.

**Explicitly out of scope for now:**

- Nextcloud/WebDAV sync — the storage interface supports it later; not needed to
  finish the MVP.
- "Suggest next experiments" — depends on Stage 2's citation discipline being proven.
- Remaining characterization techniques beyond the first one built.
- Multi-user accounts, auth, permissions.
- Peak fitting/deconvolution (only needed if a future technique genuinely requires
  overlapping-peak analysis — would be an isolated module, not a stack change).

The MVP succeeds if you can, on your own real PhD data: register a sample, link its
characterization run, get a computed value/plot from a characterization
module, export the whole chain to something a labmate could read, and ask the
assistant a question about your own experiment history and get a grounded, sourced
answer.

---

## Tech Stack

| Layer                 | Choice                                                                                     | Notes                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Framework             | Next.js (App Router)                                                                       | Frontend + API routes/Server Actions in one project — no separate backend service                   |
| Database              | SQLite via Drizzle ORM                                                                     | Lightweight, SQL-like, explicit schema/migrations; easy migration to Postgres later if ever needed  |
| UI components         | shadcn/ui + Tailwind CSS                                                                   | Accessible, unstyled-by-default components, fast to theme and compose                               |
| Forms                 | React Hook Form                                                                            | Powers the import column-mapping form, characterization config forms, notebook entry forms          |
| Data fetching/caching | TanStack Query (React Query)                                                               | Client-side caching/refetching for API routes — pairs with Server Actions for mutations             |
| Validation            | Zod                                                                                        | Schemas for import row validation, form inputs, and API payloads — single source of truth per shape |
| File storage          | `StorageAdapter` interface — local filesystem (v1), Nextcloud via WebDAV (later, additive) | Keeps storage swappable without touching business logic                                             |
| Spreadsheet import    | `ImportParser` interface — `SheetJS`/`xlsx` (v1), `papaparse` for CSV (later, additive)    | Column-mapping step decouples the app from any specific spreadsheet layout                          |
| Characterization      | Plain TypeScript modules per technique (parse → calculate → chart)                         | No Python needed for ratio/average/GPC-style calculations                                           |
| Charting              | Recharts or Chart.js                                                                       | Plot ratio/GPC/spectra vs. chosen parameters; export as PNG via canvas                              |
| Notebook              | Markdown, rendered client-side                                                             | Attached to records, exported to static HTML/PDF                                                    |
| Provenance            | Linking tables in the same database (Drizzle relations)                                    | No separate graph DB needed at this scale                                                           |
| AI assistant          | Vector store (e.g. SQLite-based or Chroma) + Claude API                                    | RAG over notebook narrative + metadata + curated references                                         |
| Literature search     | Semantic Scholar API (start with one provider)                                             | Tool call for grounding beyond curated references                                                   |
| Deployment            | Vercel (or similar)                                                                        | Live, linkable, recruiter-visible                                                                   |

---

## Build Order

1. Data model (`Project`, `Experiment`, `Study`, `Sample`, `Characterization`) +
   Drizzle schema. The interface is built first against in-memory demo data, then
   the database replaces it (Step 6 of the build log below). Use it on real data.
2. Excel and CSV import (mapping → preview → confirm) to bootstrap your existing
   spreadsheet data. **Built** on demo data; real data waits for the database.
3. One characterization module end-to-end (parse → calculate → plot).
4. Notebook entries + export to static document.
5. Deploy to Vercel — this is the "show a recruiter" milestone.
6. AI assistant: retrieval over notebook + metadata, then curated `Reference` records,
   then live literature search.
7. Everything else (Nextcloud sync, CSV import, more techniques, multi-user, "suggest
   next steps") — only once the above is solid and in daily use.

---

## Roadmap after the database (agreed with the owner)

The interface for projects, experiments, columns (parameters and results),
samples, studies and characterization records is built first on in-memory demo
data (`features/experiments/data/`); Drizzle + SQLite then replaces it. After that,
in this order:

1. **Storage and files on characterizations.** The app copies files into its own
   storage through the `StorageAdapter` (never referencing paths on the user's disk).
   Layout is one folder per sample, then per technique:
   `project/experiment/ALD001/EDX/2026-09-14_<file>`. The date lives on the record and
   in the file name, not as a folder; the user may split instrument date folders per
   sample with their own script before importing. A file that covers several samples
   is stored once and shown under each sample (details decided in this step). SEM and
   AFM images show inline, with their stored location.
2. **Parsers per technique** (EDX, ellipsometry, FTIR, UV-Vis, ...): read the raw file,
   show the location and a plot, including a treated version. Raw files are never
   changed; a treated plot is saved separately with its settings.
3. **Technique tabs that fill result columns.** Load files, run the calculation, then
   preview the numbers ("ALD012 thickness: 41.2 → 43.0 nm") and confirm update or
   skip per row, so a value typed by hand is never silently overwritten. Typing a
   result by hand always remains possible. Formulas and constants are written with
   the owner, never guessed.
4. **Plotting selected rows**: pick samples in the table, choose X and Y from the
   columns (parameters or results), and plot (library still to be chosen).
5. **Notebook**, with one shared markdown editor that also formats long protocols and
   descriptions (bullets, bold), instead of plain text.

---

## Tables so far

The records below are the future database tables (today they are in-memory stores in
`features/experiments/data/`). The import adds **no table**: it writes the same
records through the same functions.

| Record                | Key fields                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `Project`             | name, description                                                                                   |
| `Experiment`          | project, name, code prefix, protocol                                                                |
| `ParameterDefinition` | experiment, name, unit, kind (number/text), role (parameter/result), default, position              |
| `Study`               | experiment, name, description                                                                       |
| `Sample`              | experiment, code, date, values (by column; empty = not recorded), implementation, observation, note |
| `Sample` ↔ `Study`    | many to many (a sample can be in several studies of its experiment)                                 |
| `Characterization`    | sample, technique, date, note (repeatable)                                                          |
| `Dataset`             | characterization, file name, storage path, content type, size (the file itself is in storage)       |

Later tables: analyses, notebook entries,
references.

---

## Open Source

- License: MIT or Apache-2.0.
- Public GitHub repo from the first commit.
- JOSS: revisit only if, once built, the core is genuinely generic and well-tested
  enough to make a real case — not a requirement shaping how it's built.

---

## Comparable Existing Tools (for context, not a blocker)

- **eLabFTW**, **openBIS**, **Chemotion ELN** — general-purpose or domain ELNs; none
  treat synthesis/characterization as structured, linked, first-class objects with
  built-in analysis, and none offer an AI assistant grounded in the researcher's own
  linked experimental history plus real literature.
- **HyperSpy**, **peaks**, **POLEVAL** — technique-specific characterization packages
  (Python) — reference points if a technique here ever needs more numerical rigor
  than plain TypeScript provides.
