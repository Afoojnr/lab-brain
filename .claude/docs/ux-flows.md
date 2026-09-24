# UX Flows

Core user journeys through the app, in the order they'd actually happen in a real
research week. Each flow lists the screens involved and what the user does on each.
This is meant to drive the information architecture, not final visual design.

---

## Information Architecture (top-level navigation)

```
Dashboard (list of Projects: ALD, CVD, ...)
└── Project detail (e.g. "ALD")
    ├── Experiment tree      (nested: ALD001 → ALD001_1 → ALD001_1_1, ...)
    ├── Samples              (list + detail view, scoped to this project)
    ├── Datasets             (characterization data, list + detail view)
    ├── Analyses             (generated plots/results, list + detail view)
    ├── Notebook             (narrative entries, scoped to this project)
    ├── References           (curated papers/bibliography, scoped to this project)
    └── Ask (AI assistant)   (chat, scoped to this project)
Export                        (global: project or provenance-chain export)
```

You land on a list of **Projects** first, not a flat global list — this keeps ALD and
CVD data from mixing in every view. Once inside a project, everything else is a record
type with a **list view** (table/cards) and a **detail view** (the record plus its
linked records). Linking happens by referencing other records from any detail view —
there's no separate "linking" screen.

---

## Flow 0 — Create/select a project and navigate its experiment tree

**Goal:** get into the right context (ALD vs CVD) before doing anything else.

1. `Dashboard` → pick an existing project (e.g. "ALD") or "New Project" (name,
   default protocol/method — e.g. "PE ALD, TEB + H2 plasma, Ar carrier").
2. `Project detail` → shows the experiment tree as nested, expandable rows
   (`ALD001 → ALD001_1 → ALD001_1_1 / ALD001_1_2`), not a flat list. Each row shows
   its objective at a glance.
3. "New Experiment" from the project root creates a top-level experiment (e.g.
   `ALD001`). "New Sub-experiment" from within any experiment row creates a child
   (e.g. `ALD001_1` under `ALD001`), inheriting the parent's parameters as editable
   defaults.
4. Clicking any row opens that `Experiment detail` view (Flow 1).

```
Dashboard → select/create Project → Project detail (experiment tree) → click a row → Experiment detail
```

---

## Flow 0b — Import existing data from a spreadsheet

**Goal:** bootstrap real records from data you already recorded in Excel, instead of
re-entering everything by hand — for a brand-new experiment or to add points to one
that already exists.

1. From `Project detail` → "Import from spreadsheet", or from an existing
   `Experiment detail` → "Import points into this experiment".
2. Upload the file → `Column mapping` screen: the app shows your spreadsheet's actual
   column headers next to a dropdown for each, mapping them to app fields
   (experiment ID, sample ID, temperature, cycles, plasma pulse, etc.) — since every
   spreadsheet is laid out differently, this step isn't skippable.
3. `Validation` screen — flags, before anything is saved:
   - rows whose sample/experiment ID already exists in the target (choose: update,
     skip, or add as new for each conflict);
   - cells that don't match their mapped field's expected type (e.g. text in a
     numeric column), shown inline against the offending row.
4. `Import preview` — shows the `Experiment`/`Synthesis`/`Sample` records it will
   create/update/link once conflicts and type issues are resolved.
5. Confirm → records appear in the project's experiment tree and sample list, already
   linked (e.g. rows sharing a batch/date become samples under one `Synthesis`).

```
Project detail (or Experiment detail) → Import → Upload → Column mapping → Validation → Preview → Confirm → records created/updated & linked
```

---

## Flow 1 — Register a synthesis run and its samples

**Goal:** capture a synthesis run as soon as it happens, before details are forgotten.

1. From `Experiment detail` → "New Synthesis Run".
2. `Synthesis form` — batch-level parameters (temperature, pressure, cycles, etc.,
   pre-filled from the project/experiment defaults), plus a repeatable "Sample" row:
   each sample gets an ID and any parameter that varies _within this batch_
   (e.g. one row per plasma pulse duration: 5s, 10s, 15s, 20s), inheriting the batch
   defaults for everything else.
3. Save → redirected to `Synthesis detail`, listing all samples produced in this run,
   each with an empty "Linked Datasets" section.
4. Optionally, immediately jump to Flow 2 to attach characterization data to any
   sample in the batch.

```
Experiment detail → New Synthesis Run → Synthesis form (batch + per-sample rows) → Save → Synthesis detail
```

---

## Flow 2 — Attach a characterization dataset

**Goal:** link a raw instrument file to the synthesis/sample it came from.

1. From `Synthesis detail` (or `Sample detail`) → "Add Dataset".
2. `Dataset form` — technique (EDX / XPS / ...), upload raw file or point to a storage
   path, date, instrument/operator notes.
3. On save, the system auto-detects the file type where possible and offers to run
   the matching analysis module immediately.
4. Redirected to `Dataset detail`, showing the raw file reference and a "Run Analysis"
   button if a module exists for that technique.

```
Synthesis detail → Add Dataset → Dataset form → Save → Dataset detail → (Run Analysis)
```

---

## Flow 3 — Run characterization analysis

**Goal:** turn a raw dataset into a processed, comparable result.

1. From `Dataset detail` → "Run Analysis".
2. `Analysis config` — pick the module (e.g. XPS peak fit), adjust parameters
   (background type, peak model, region of interest) with sane defaults pre-filled.
3. Run → `Analysis detail` view: plot, fitted parameters, and a link back to the
   source dataset and synthesis.
4. From here: "Compare to other samples" — select other analyses of the same
   technique to overlay/compare.

_Note for later refinement_: the natural entry point for EDX-style comparison is
often "pick several samples first, then analyse/compare them together" rather than
starting from one dataset's detail view — worth revisiting this flow's starting point
once the characterization module is actually being used, not decided now.

```
Dataset detail → Run Analysis → Analysis config → Analysis detail → (Compare)
```

---

## Flow 4 — Trace provenance ("where did this come from?")

**Goal:** answer "how was this result produced?" from any record.

1. From any `Analysis detail`, `Dataset detail`, or figure → "View Provenance".
2. `Provenance view` — a simple chain/tree, not a full graph UI for v1:
   `Sample → Synthesis → Dataset → Analysis`, each step clickable to jump to that
   record's detail view.
3. No separate navigation needed elsewhere — this view is reachable from every record
   type via one consistent button.

```
Any record detail → View Provenance → chain of linked records (each clickable)
```

---

## Flow 4b — Link "next steps" forward to the following experiment

**Goal:** answer "what did this lead to?" — the forward complement to provenance.

1. From an `Experiment detail`'s notebook entry (e.g. "Next Steps: repeat with 400
   cycles") → "Link to next experiment".
2. Either select an existing sibling/new experiment, or create one directly from this
   action — its objective field is pre-filled from the linking text, editable.
3. Both experiments now show a clickable connector: the earlier one shows "Led to →",
   the later one shows "← Followed from". Same chain-view component as Flow 4, just
   traversed forward instead of backward.

```
Experiment detail (Next Steps note) → Link to next experiment → new/existing Experiment detail (now connected)
```

---

## Flow 5 — Write a notebook entry

**Goal:** capture the "why" against a specific record, not floating free.

1. From `Sample detail`, `Synthesis detail`, or `Analysis detail` → "Add Note".
2. `Notebook entry editor` — markdown text box, auto-linked to the record it was
   opened from; additional records can be referenced by ID/search.
3. Save → entry appears inline on the record's detail view and in the global
   `Notebook` list.

```
Record detail → Add Note → Notebook entry editor → Save → shown inline on record
```

---

## Flow 5b — Add a reference (curated literature)

**Goal:** build the project's own bibliography so the AI assistant can cite real
papers instead of relying on unaided recall.

1. From `Project detail` → "References" tab → "Add Reference", or from any
   `Notebook entry` → "Cite a reference" inline.
2. `Reference form` — title, authors, year, DOI/URL (auto-fetches metadata where
   possible), optional PDF upload; optionally link to the specific
   `Experiment`/`Notebook` entry it informed (e.g. "Neil's paper" → `ALD001_1`).
3. Save → appears in the project's `References` list and, if linked, inline on the
   record it was attached to. Indexed into the assistant's retrieval alongside
   notebook entries.

```
Project detail → References tab → Add Reference → Reference form → Save → shown in References list (+ inline if linked to a record)
```

---

## Flow 6 — Export for a future reader

**Goal:** produce something readable outside the app.

1. From `Export` (global) or from any `Sample detail` → "Export".
2. `Export options` — scope (single sample's full chain, or whole project), format
   (static HTML/PDF).
3. Generates a linked, readable document: synthesis parameters → characterization
   plots → analysis results → notebook narrative, in one place, no login required to
   read it.

```
Sample detail → Export → Export options → downloadable document
```

---

## Flow 7 — Ask the AI assistant

**Goal:** get an answer grounded in your own experiment history — and real
literature, not the model's unaided recall — without manually digging through the
experiment tree.

1. From `Project detail` → "Ask" tab, or from any record detail view → a persistent
   "Ask about this" shortcut that opens the same chat pre-scoped to that record's
   context (e.g. asking from `ALD001_2` detail pre-loads that experiment's chain).
2. `Ask view` — chat interface. User types a question (e.g. "what happened when I
   increased plasma time above 10 seconds?" or "what does the literature say about
   TEB decomposition above 25°C?").
3. Response includes inline citations, **visibly labeled by source**: your own
   `Experiment`/`Notebook`/`Analysis` records, your curated `Reference` library, or
   (if enabled) a live external literature search — each one clickable, records
   landing on their detail view, references landing on the source paper. Internal and
   external citations are never blended into one unlabeled claim.
4. Follow-up questions stay in the same scoped conversation; switching projects (or
   explicitly choosing "search all projects") changes what's retrievable.

```
Project detail → Ask tab → chat → response with labeled, clickable citations (your data vs. literature)
(or) Any record detail → "Ask about this" → same chat, pre-scoped to that record
```

---

## Screen List (for early wireframing)

| Screen                                     | Purpose                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Dashboard (Project list)                   | Entry point — pick or create a Project (ALD, CVD, ...)                    |
| Project detail (Experiment tree)           | Nested, expandable experiment/sub-experiment hierarchy                    |
| Import (upload / column mapping / preview) | Bootstrap records from an existing spreadsheet                            |
| Experiment detail                          | Objective, parameters, linked synthesis runs, forward/backward links      |
| Synthesis form / detail                    | Batch-level record with per-sample rows                                   |
| Sample detail                              | One sample's parameters + linked datasets                                 |
| Dataset form / detail                      | Attach + view raw characterization data                                   |
| Analysis config / detail                   | Run + view processed characterization results                             |
| Provenance view                            | Chain view (backward and forward), reachable from anywhere                |
| Notebook entry editor / list               | Narrative capture, scoped to a project                                    |
| Reference form / list                      | Curated bibliography, linkable to any record                              |
| Ask (AI assistant)                         | Chat grounded in the project's linked data, with source-labeled citations |
| Export options                             | Generate a readable, shareable output                                     |

---

## Design principles for v1

- **Every record detail view looks the same shape**: header (ID, type, date), a
  metadata panel, a "linked records" panel, and a "notebook entries" panel. One
  layout, many record types — keeps v1 UI work small. This applies to `Experiment`
  too, despite its tree nesting — the tree is just how you _navigate to_ one, not a
  different detail layout.
- **No dead ends.** Every creation flow ends on a detail view with an obvious next
  action (add dataset, run analysis, add note), not back on a list.
- **Provenance is one button away, always**, in both directions (backward to origin,
  forward to what it led to) — not a separate app section you have to go find.
- **"Ask about this" is available from any record detail**, not just a standalone chat
  page — the assistant should feel like an extension of browsing, not a separate tool
  you have to context-switch into.
- **Citations always say where they came from.** Your own data and external
  literature are never presented as one undifferentiated source — trust depends on
  being able to tell which is which at a glance.
