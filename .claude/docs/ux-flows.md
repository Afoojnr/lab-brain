# UX Flows

Core user journeys through the app, in the order they'd actually happen in a real
research week. Each flow lists the screens involved and what the user does on each.
This is meant to drive the information architecture, not final visual design.

---

## Information Architecture (top-level navigation)

```
Dashboard (list of Projects: ALD of BxC, CVD of borophene, ...)
└── Project page (name, description, edit)
    └── Experiments (tabs, like the sheets of a spreadsheet: Deposition ALD, Paschen law PSL, ...)
        └── Experiment page
            ├── Samples table   (one row per sample; filter by study, search, bulk assign)
            ├── Columns         (parameters you set, results you measure)
            ├── Studies         (optional named groups of samples)
            └── Sample page     (values, characterizations, observation, note; later files and plots)
Notebook / References / Ask / Export   (later: attached to any record, or project-wide)
```

You land on a list of **Projects** first, not a flat global list — this keeps ALD and
CVD data from mixing in every view. Inside a project each **experiment** is one
spreadsheet-like sheet with its own columns and sample numbering (`ALD001`,
`ALD002`, ...). Everything else is a record type with a **list view** (a table) and
a **detail view** (the record plus its linked records). Linking happens by
referencing other records from any detail view — there's no separate "linking"
screen.

---

## Flow 0 — Create/select a project and its experiments

**Goal:** get into the right context (ALD vs CVD) before doing anything else.

1. `Dashboard` → pick an existing project or "New project" (name, optional
   description such as "PE ALD, TEB + H2 plasma, Ar carrier"). A project can be
   edited later.
2. `Project page` → experiments shown as cards (name, prefix, how many samples and
   columns), or an empty state to add the first.
3. "New experiment" asks for a name (e.g. "Deposition"), a code prefix (e.g. `ALD`,
   which numbers its samples) and an optional base protocol. An experiment can be
   edited later; changing the prefix never renames existing sample codes.
4. Opening an experiment shows its samples table (Flow 1). Tabs above switch
   between the project's experiments.

```
Dashboard → select/create Project → Project page → open an Experiment → Samples table
```

---

## Flow 0b — Import existing data from a spreadsheet

**Goal:** bootstrap real records from data you already recorded in Excel, instead of
re-entering everything by hand — for a brand-new experiment or to add rows to one
that already exists. (One spreadsheet sheet becomes one experiment.)

1. From `Project page` → "Import from spreadsheet", or from an existing
   `Experiment page` → "Import rows into this experiment".
2. Upload the file → `Column mapping` screen: the app shows your spreadsheet's actual
   column headers next to a dropdown for each, mapping them to sample code, date,
   implementation, observation, or a parameter or result column (existing, or new
   with a unit) — since every spreadsheet is laid out differently, this step isn't
   skippable.
3. `Validation` screen — flags, before anything is saved:
   - rows whose sample code already exists in the project (choose: update, skip, or
     add as new for each conflict);
   - cells that don't match their column's type (e.g. text in a numeric column),
     shown inline against the offending row and column. Empty cells stay "not
     recorded", never zero.
4. `Import preview` — shows the samples and columns it will create or update once
   conflicts and type issues are resolved.
5. Confirm → rows appear in the experiment's samples table, already linked.

```
Project page (or Experiment page) → Import → Upload → Column mapping → Validation → Preview → Confirm → samples created/updated
```

---

## Flow 1 — Record a sample

**Goal:** capture a sample as soon as it is made, before details are forgotten.

1. From the `Experiment page` → "Add sample".
2. `Sample form` — the code is suggested from the experiment's prefix (next number)
   and can be changed. Parameters are prefilled from each column's default, else
   from the previous sample, so only what is different is edited. Results are never
   prefilled. An empty value means "not recorded"; text in a numeric column is an
   error on that exact field. Also an optional date, studies (multi-select),
   implementation, observation and one short note.
3. Save → `Sample page`. "Duplicate" opens the form with the parameters, date,
   implementation and studies copied under a new code (never the results, the
   observation or the note).
4. In the table, select rows to assign them to a study, filter by study, or search
   code, implementation, observation and notes. Columns can be added at any time;
   older samples show the new column empty.

```
Experiment page → Add sample → Sample form → Save → Sample page
```

---

## Flow 2 — Record a characterization

**Goal:** note which measurements were done on a sample and when.

1. From `Sample page` → "Add characterization".
2. Technique (typed; names already used in the project are offered so "eds" and
   "EDS" never become two), optional date and note. The same technique can be
   recorded again.
3. The sample page lists them (edit, delete after confirming) and the samples
   table shows one badge per technique, "EDX ×2" when repeated.
4. Later (storage step): files attach to a characterization. They are copied into the
   app's storage under `project/experiment/sample/technique/`, images show inline,
   and the file location is shown.

```
Sample page → Add characterization → technique + date + note → listed on the sample, badge in the table
```

---

## Flow 3 — Turn a measurement into results and plots (later)

**Goal:** stop copying numbers by hand from instrument files, while keeping hand
entry possible.

1. Open a technique tab (e.g. EDX or Ellipsometry) → load the files (raw files are
   never changed).
2. See the data plotted, including a treated version; settings of any treatment are
   saved with it.
3. Run the calculation (e.g. B/C ratio, thickness) → a **preview** of each sample's
   new value next to the existing one → choose update or skip per row. A value typed
   by hand is never overwritten silently.
4. Select samples in the table and choose X and Y from the columns to plot them
   against each other (e.g. thickness vs plasma pulse).

_Formulas and constants are agreed with the owner for each technique, never
guessed._

```
Technique tab → load files → plot → calculate → preview (update / skip) → result columns filled
Samples table → select rows → choose X and Y → plot
```

---

## Flow 4 — Trace provenance ("where did this come from?")

**Goal:** answer "how was this result produced?" from any record.

1. From any `Analysis detail`, `Dataset detail`, or figure → "View Provenance".
2. `Provenance view` — a simple chain/tree, not a full graph UI for v1:
   `Sample → Characterization → Dataset → Analysis`, each step clickable to jump to
   that record's detail view.
3. No separate navigation needed elsewhere — this view is reachable from every record
   type via one consistent button.

```
Any record detail → View Provenance → chain of linked records (each clickable)
```

---

## Flow 4b — Link "next steps" forward to the following sample

**Goal:** answer "what did this lead to?" — the forward complement to provenance.

1. From a `Sample page`'s notebook entry (e.g. "Next steps: repeat with 400 cycles")
   → "Link to next sample".
2. Either select an existing sample or create one directly from this action — its
   implementation field is pre-filled from the linking text, editable.
3. Both samples now show a clickable connector: the earlier one shows "Led to →",
   the later one shows "← Followed from". Same chain-view component as Flow 4, just
   traversed forward instead of backward.

```
Sample page (Next Steps note) → Link to next sample → new/existing Sample page (now connected)
```

---

## Flow 5 — Write a notebook entry

**Goal:** capture the "why" against a specific record, not floating free.

1. From `Sample page`, `Experiment page`, or `Analysis detail` → "Add Note".
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

1. From `Project page` → "References" tab → "Add Reference", or from any
   `Notebook entry` → "Cite a reference" inline.
2. `Reference form` — title, authors, year, DOI/URL (auto-fetches metadata where
   possible), optional PDF upload; optionally link to the specific
   `Experiment`/`Notebook` entry it informed (e.g. "Neil's paper" → `ALD001_1`).
3. Save → appears in the project's `References` list and, if linked, inline on the
   record it was attached to. Indexed into the assistant's retrieval alongside
   notebook entries.

```
Project page → References tab → Add Reference → Reference form → Save → shown in References list (+ inline if linked to a record)
```

---

## Flow 6 — Export for a future reader

**Goal:** produce something readable outside the app.

1. From `Export` (global) or from any `Sample detail` → "Export".
2. `Export options` — scope (single sample's full chain, or whole project), format
   (static HTML/PDF).
3. Generates a linked, readable document: sample parameters and results → characterization
   plots → analysis results → notebook narrative, in one place, no login required to
   read it.

```
Sample detail → Export → Export options → downloadable document
```

---

## Flow 7 — Ask the AI assistant

**Goal:** get an answer grounded in your own experiment history — and real
literature, not the model's unaided recall — without manually digging through the
experiments.

1. From `Project page` → "Ask" tab, or from any record detail view → a persistent
   "Ask about this" shortcut that opens the same chat pre-scoped to that record's
   context (e.g. asking from `ALD023` pre-loads that sample's chain).
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
Project page → Ask tab → chat → response with labeled, clickable citations (your data vs. literature)
(or) Any record detail → "Ask about this" → same chat, pre-scoped to that record
```

---

## Screen List (for early wireframing)

| Screen                                     | Purpose                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Dashboard (Project list)                   | Entry point — pick or create a Project (ALD, CVD, ...)                    |
| Project page                               | The project's experiments as cards; edit the project                      |
| Import (upload / column mapping / preview) | Bootstrap records from an existing spreadsheet                            |
| Experiment page                            | Samples table (filter, search, bulk assign), columns, studies             |
| Sample form (add / edit / duplicate)       | Values per column, date, studies, implementation, observation, note       |
| Sample page                                | Parameters, results, characterizations, observation, note                 |
| Technique tab (later)                      | Load files, plot, calculate, update result columns after a preview        |
| Dataset form / detail                      | Attach + view raw characterization files (storage step)                   |
| Analysis config / detail                   | Run + view processed characterization results                             |
| Provenance view                            | Chain view (backward and forward), reachable from anywhere                |
| Notebook entry editor / list               | Narrative capture, scoped to a project                                    |
| Reference form / list                      | Curated bibliography, linkable to any record                              |
| Ask (AI assistant)                         | Chat grounded in the project's linked data, with source-labeled citations |
| Export options                             | Generate a readable, shareable output                                     |

---

## Design principles for v1

- **Every record detail view looks the same shape**: a header (the record's code or
  name, a one-sentence lead such as a sample's implementation or an experiment's
  protocol, long text folded behind "Show more", and a strip of key facts), a main
  column of raised panels for the work you do and read most (for an experiment: the
  samples table and its columns; for a sample: parameters, results and
  characterizations), and a quiet section for context (studies, notebook). One
  layout, many record types — keeps UI work small. Each record type chooses what is
  primary.
- **Raw values, never coerced.** An empty value means "not recorded", never zero;
  text in a numeric column is an error on that exact field; units live on the
  column, not in the value.
- **No dead ends.** Every creation flow ends on a detail view with an obvious next
  action (add a characterization, add a note), not back on a list.
- **Provenance is one button away, always**, in both directions (backward to origin,
  forward to what it led to) — not a separate app section you have to go find.
- **"Ask about this" is available from any record detail**, not just a standalone chat
  page — the assistant should feel like an extension of browsing, not a separate tool
  you have to context-switch into.
- **Citations always say where they came from.** Your own data and external
  literature are never presented as one undifferentiated source — trust depends on
  being able to tell which is which at a glance.
