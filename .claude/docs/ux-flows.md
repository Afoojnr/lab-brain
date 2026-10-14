# UX Flows

Core user journeys through the app, in the order they'd actually happen in a real
research week. Each flow lists the screens involved and what the user does on each.
This is meant to drive the information architecture, not final visual design.

---

## Information Architecture (top-level navigation)

```
Projects (the home page: every project as a card: ALD of BxC, CVD of borophene, ...)
└── Project page (name, description, edit)
    └── Experiments (tabs, like the sheets of a spreadsheet: Deposition ALD, Paschen law PSL, ...)
        └── Experiment page, in four tabs: Protocol · Setup · Samples · Plots
            ├── Protocol        (the formatted method every sample follows)
            ├── Setup           (columns you set and results you measure, calculated columns, studies)
            ├── Samples         (one row per sample; filter by study, search, bulk assign, export)
            ├── Plots           (saved plots as cards with a small live preview; open one in Plots)
            └── Sample page     (values, characterizations, observation, note, files)
Report (on the project, experiment and sample pages) · Plots · References / Ask (later)
```

**Sidebar** (always visible; an icon rail when collapsed, a sheet on a phone):
**Projects** (its label is the way home, the all-projects page; a chevron collapses
the plain list of every project, newest first) · **Characterizations** (one collapsible header over the techniques the
app can analyse, today EDX and Ellipsometry, each opening its workspace) · **Plots**
(one link) · Settings. Only those two headers collapse; what you opened or closed is remembered, and the page
you are on is highlighted.

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

1. `Projects` (home: the logo, the Projects label or `/`) → pick an existing project
   or "New project" with the button on that page (name, optional description such as "PE ALD, TEB + H2 plasma, Ar carrier"). A project can
   be edited later. On a first run there are no projects: a welcome offers "Create
   your first project", and "Or analyse raw files without a project" (the EDX and
   Ellipsometry workspaces work without any project).
2. `Project page` → experiments shown as cards (name, prefix, how many samples and
   columns), or an empty state that explains an experiment is one sheet of your
   spreadsheet, with New experiment and "Turn a spreadsheet into an experiment".
3. "New experiment" asks for a name (e.g. "Deposition"), a code prefix (e.g. `ALD`,
   which numbers its samples) and an optional base protocol. An experiment can be
   edited later; changing the prefix never renames existing sample codes.
4. The project page has three tabs: **Background** (formatted text about the project,
   read by the assistant), **Experiments** (the default) and **References** (Flow 5b); the
   tab is in the URL (`?tab=`).
5. An experiment page has four section tabs, in this order: **Protocol**, **Setup**
   (columns, calculated columns and studies), **Samples** (the table, Flow 1) and
   **Plots**. It opens on Samples, or, while it has no samples, on Setup, where a
   "Getting started" checklist shows: ① add the columns (ticked once there are any),
   ② record the first sample or import samples from a spreadsheet. The tab is in the URL
   (`?tab=`), so Back and links work, and the tab names show counts (Samples 23). The
   pills above switch between the project's experiments.

```
Projects → select/create Project → Project page → open an Experiment → Samples table
```

---

## Flow 0b — Import existing data from a spreadsheet

**Goal:** bootstrap real records from data you already recorded in Excel, instead of
re-entering everything by hand — for a brand-new experiment or to add rows to one
that already exists. (One spreadsheet sheet becomes one experiment.)

1. From `Project page` → "Import from spreadsheet", or from an existing
   `Experiment page` → "Import rows" (that experiment is preselected).
2. **File**: an Excel (.xlsx, .xls) or CSV file, read in the browser (never uploaded).
3. **Sheet**: pick the sheet (one is imported at a time), the header row (a title line
   above the table is skipped) and whether the row under it holds units.
4. **Experiment**: a new one (name from the sheet, prefix suggested from the codes) or
   an existing one.
5. **Columns**: each source column shows examples and a choice of what it becomes: the
   sample code (required), date, implementation, observation, note, studies
   (separated by `;`), an existing column, a new column (name, unit, number/text,
   parameter/result) or ignore. Suggested from the headers. If dates are written as
   text, say how to read them (year-month-day, day/month/year or month/day/year).
6. **Preview**, before anything is saved: counts of new, existing-code, problem and
   empty rows. A cell that does not fit its column (text in a number column) is
   flagged on its exact row and column; a row without a code or a code repeated in
   the file is a problem too. For a code that already exists choose, per row or for
   all: skip (the default), update (only inside the same experiment; empty cells never
   erase) or add as new under another code. Rows with problems can be skipped as a
   group. Excel cell comments become lines of the sample's note.
7. **Done**: how many were added, updated and skipped, with a link to the experiment.

```
Project page (or Experiment page) → Import → File → Sheet → Experiment → Columns → Preview → Import → samples created/updated
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

## Flow 1b — Add a calculated column

**Goal:** have a value worked out for every sample instead of computing it by hand,
e.g. GPC (Å/cycle) = Thickness (nm) × 10 ÷ Cycles.

1. On the `Experiment page`, in the Setup tab's "Calculated columns" panel → "Add calculated
   column".
2. Give it a name, a unit (typed; the app never converts units, so the factor, like
   × 10 for nm to Å, goes in the formula) and a formula written with `[Column name]`,
   numbers, `+ - * /` and parentheses. The entered number columns are offered as
   buttons, and the other calculated columns in their own "Calculated columns" group,
   so a column can be built on another (GPC in nm = [GPC] / 10); a preview shows the result on the first samples as you type; a mistake is
   named (unknown column, a text column, where it went wrong).
3. The column appears after the others in the samples table (marked ƒ) and on each
   sample page under "Calculated". It is never typed and never stored: it is worked out
   when shown, so it follows the columns it uses. If an input is not recorded, or it
   would divide by 0, the cell is empty ("not recorded"), never 0.
4. A column used by a formula cannot be deleted or turned into text, and that includes a
   calculated column used by another one (its delete button is greyed out with the reason);
   renaming it is fine, because formulas are stored by column id.
5. A formula can never loop back to itself: when editing a column, itself and the
   columns built on it are not offered, and typing one gives "This formula would loop back
   to itself". The columns are worked out in dependency order whatever order they are
   listed in, and one empty step leaves everything built on it empty (never 0).

```
Experiment page → Calculated columns → Add → name + unit + formula (preview) → column in the table
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
4. Attach files with the paperclip on a characterization (drop or browse, several at
   once, up to 50 MB each, any type). They are copied into the app's storage under
   `project/experiment/sample/technique/`; images show as thumbnails, other files as a
   download link, each with its size and stored location. A file can be removed after
   confirming, and deleting a characterization removes its files too.

```
Sample page → Add characterization → technique + date + note → listed on the sample, badge in the table
```

---

## Flow 3 — Turn a measurement into results (EDX, ellipsometry and FTIR built, per sample)

**Goal:** stop copying numbers by hand from instrument files, while keeping hand
entry possible.

1. On the `Sample page`, click a characterization's technique to open its own page:
   its files (attach a single file, several, or a whole folder with its subfolders)
   and its analysis. Images, CSV/Excel tables and text open in a viewer in the page;
   TIFF images are shown through a PNG copy. The analysis is chosen from the
   technique name (EDX/EDS, ellipsometry, FTIR) or picked by hand.
2. **EDX**: every `quantification.csv` is one spot. Untick bad spots (their files are
   never changed); the composition is averaged over the rest, with error bars, and
   the spectra are overlaid. An element missing from a spot counts as 0 and the
   standard deviation divides by N, as in the lab notebook. Pick the ratio (B/N,
   B/C, C/O, any two elements).
3. **Ellipsometry**: the thickness and n, each with its standard deviation, are read
   from the `Average` and `StdDeviation` rows of the attached fit export.
4. **FTIR**: every attached `.csv`/`.txt` export is one spectrum (two columns,
   wavenumber and value; with or without a header; `;`, tab, comma or space between
   columns; decimal point or comma). A line that is not two numbers is an error with
   its line number. The app guesses from the values whether they are transmittance or
   absorbance, says why, and lets you switch. The spectra are stacked (with an adjustable
   gap) to compare, high wavenumbers on the left. Optionally show absorbance
   (A = 2 − log10 %T) and normalise (min–max over a range, reference peak = 1, vector,
   SNV); a normalised value is labelled relative, and the file is never changed.
   **Detect peaks** suggests them (sensitivity, closest spacing and search range are
   shown and adjustable); you remove the noise, add missed ones by clicking the spectrum or
   typing a position, and write the bond or label (free text). A peak also offers, as
   suggestions you click, the bonds of your **bond table** whose range holds it (see
   below); nothing is applied automatically. Each peak's value is read within
   a tolerance (default ±10 cm⁻¹); a spectrum with no data there shows none, never 0.
5. **Send to results**: tick the values (defaults: the ratio, B, N, C, O and the
   substrate for EDX; thickness and n for ellipsometry, each with its std), choose
   for each an existing result column or a new one, and see the value it replaces.
   Nothing is written until the button is pressed. A ratio that cannot be computed
   (no denominator element) is 0 and says so. The server recomputes every number
   from the stored files; only the chosen columns change.
6. **Technique workspace** (sidebar → Characterizations → EDX, Ellipsometry or FTIR), with
   two ways in:
   - **Upload files**: drop raw files or folders that are not in any experiment (one or
     more sample folders, or a day's folder holding them; or several fit exports). They
     are read in the browser, nothing is uploaded or saved. See each sample's values
     like the lab notebook's summary, untick bad spots, and **download the table as
     Excel** (`EDS_summary.xlsx`).
   - **From an experiment**: choose a project and an experiment (one at a time), tick
     the samples to work on (a repeat is its own row; one per sample at a time), open a
     row to untick spots, choose once which values go to which result columns, and see
     per sample what it would change. A sample that would replace a different value is
     skipped unless you tick Update. The server recomputes every number from the stored
     files and writes nothing if anything is not allowed.
   - **FTIR comparison** (From an experiment): tick the samples to stack (one measurement
     per sample), curate one list of peaks for the whole stack, choose which peak values
     go to which result columns, see what each sample would change, and apply. A sample
     with no data near a chosen peak cannot be updated.
   - **FTIR bond table** (FTIR workspace → Bond table tab): one table for the whole app
     of the bonds you look for: the name a peak's label becomes, the range in cm⁻¹ (a
     single position leaves To empty), and a free-text source. The app ships none: you fill
     it by the Add a bond form, or paste rows (from Excel or CSV text) or import a CSV or
     Excel file. The first row names the columns (Bond, From (cm-1), To (cm-1), Source, in
     any order; Bond and From required), numbers use a point or a comma, and a template can
     be downloaded. A preview lists good rows and, for each unusable row, its number and
     column (text where a number belongs, From above To, a repeat, a missing bond); bad
     rows are never saved. Then Add (the default) or Replace the table (asks again).
     Deleting a bond asks first and leaves labels already written on peaks as they are.
7. **Plots** (sidebar → Plots), with two sources like the technique workspaces:
   - **Upload a table**: a CSV or Excel table that is not in any experiment. It is
     read in the browser and nothing is saved. The header row is found
     automatically (and can be changed); a column is a number column only when
     every filled cell is a number, so a word is never read as a number.
   - **From an experiment**: pick a project and an experiment. Entered and
     calculated columns can be plotted; a sample shows its code on hover and opens
     on click.
     Choose the X and Y columns (numbers), optional **error bars** from a number column
     (e.g. a std), **colour by** a text column or, for samples, by **study** (a sample
     in two studies appears in both), and a **logarithmic** X or Y. A sample with no
     number for X or Y is left out and counted ("N left out (no value)"), as is a value
     of 0 or less on a log axis; nothing is ever plotted as 0. Up to twelve groups are listed, each with its own colour and marker shape (three validated colours x four shapes, so groups stay apart without relying on colour); beyond twelve, the rest are shown as "Other" with a hint to use a filter. The plotted
     values are also listed in a table under the chart. In the samples table, ticking
     rows shows a **Plot** button that opens the workspace with just those samples
     ("Showing N selected samples · Show all samples").
     The X, Y and error-bar lists are grouped (Parameters, Results, Calculated; Results
     first for Y). Colouring also works on a number column such as Cycles (one colour
     per value). **Filters** keep only some samples, e.g. only 600 cycles: tick the
     values to keep (or give a minimum and maximum for a continuous column); filters
     combine with "and" and the left-out count says how many they removed. Every
     plotted sample is in a list under the chart with a checkbox: **untick** one to take
     its point off the plot (nothing is deleted; tick it back any time).
     **Export** (button above the chart): a figure as PNG, PDF or a PowerPoint
     slide, always on white in the light theme, with a caption (what is plotted, the
     source, filters, colour-by, counts) and the legend so the figure explains itself; or
     the plotted numbers as Excel or CSV (one row per plotted point, an empty cell for a
     missing error, never 0). **Save plot** (experiment source only; an uploaded table
     is never kept) asks for a title and stores what to plot (columns, error bars,
     grouping, log axes, filters, unticked samples), not a picture. Saved plots are
     listed above the chart; opening one redraws it from the experiment's current
     samples, and Save changes replaces it. Deleting a saved plot never touches samples.
     The figure, PDF, PowerPoint and Excel builders live in `lib/export/` so the
     project and sample export can reuse them.
     **Customise** (a closed panel above the chart): axis ranges (empty = automatic; a
     bound of 0 or less is ignored on a log axis), the plot title and axis titles
     (empty = the default), text size, marker size and the grid; and what an exported
     figure says: the filters and colour key are always written, where the data is
     from and the sample counts only when ticked (both off by default). These are saved
     with a saved plot. Colours stay the validated three; there is no free colour picker.
     The workspace fits a phone: controls stack full width and the chart is shorter.
     Not yet: fits/trend lines (the method must be agreed first).

_Formulas and constants are agreed with the owner for each technique, never
guessed._

```
Sample page → technique → files + analysis → untick spots / pick ratio → send to results → result columns filled
Sidebar → technique → Upload files (Excel download) or From an experiment (tick samples → preview → apply)
Samples table → select rows → Plot → choose X and Y (+ error bars, colour by study) → chart and counts
Sidebar → Plots → Upload a table or From an experiment → choose X and Y → chart and counts
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

## Flow 5 — Notes (no separate notebook)

**Decision:** there is no notebook. The "why" is written where it belongs: each sample's
implementation, observation and note, and the experiment's protocol. They show on the
sample page, in the samples table and in the reports, and the AI assistant will cite them.
The protocol is written with formatting buttons (Heading 1, 2 and 3, bold, italic, bullets,
numbered list, table, link) and a Write / Preview switch, stored as plain Markdown (up to 20,000 characters),
and shown in full on the experiment page's **Protocol** tab (with an Edit protocol button).
`#`, `##` and `###` give three clearly different heading sizes. The experiment summary prints it formatted too. Raw HTML
and pictures in a protocol are never rendered.

---

## Flow 5b — Add a reference (project literature)

**Goal:** give the AI assistant background on the project (a paper, a standard, your own
notes) without it ever reading a whole paper for each question.

1. `Project page` → **References** tab → "Add a reference". Choose what you add: a PDF
   (≤ 20 MB, ≤ 150 pages), a link or DOI (a web page or a PDF address; private network
   addresses are refused), or pasted text (≤ 300,000 characters). Up to 10 per project.
2. Title, authors and year are filled from the file or page where possible and are
   editable. Add a note on why it matters ("how the plasma pulse changes growth").
3. The text is read **once** now and kept; the reference appears as a card with your note.
4. **Summarise** (needs your AI key from Settings) writes a short summary of the key points
   and numbers, noting which pages it covered. It is editable (Edit). The assistant uses
   the summary, or your note when there is none, and can read more of the text on demand.
5. Open shows the PDF or the link; Delete (after a confirmation) removes the files too.

```
Project page → References tab → Add a reference → card → Summarise (optional) → used by the assistant
```

---

## Flow 5c — Delete a record (built)

**Goal:** remove a mistake safely, knowing exactly what goes with it.

1. Delete is where you see the thing:
   - **Study:** a bin next to its pencil in the Studies list (Setup tab).
   - **Sample, experiment, project:** the **⋯ (More actions)** button at the end of the
     page's header buttons, which holds **Edit** and **Delete**.
   - **Uploaded folder:** a bin on the folder row.
     Each opens one confirmation dialog that lists what goes with the record, with counts.
     Nothing is deleted until its red button.
2. What goes with each:
   - **Study:** only the study; its samples keep all their data and lose the tag.
   - **Sample:** its measurements, their attached files (also removed from storage) and
     their saved analyses.
   - **Experiment:** all its samples as above, its columns (entered and calculated), its
     studies and its saved plots.
   - **Project:** all its experiments as above, its references (with the stored PDFs and
     text) and its background.
3. An **experiment** or **project** also asks for its exact name to be typed (the server
   checks it again). After a delete you land on the parent page and the sidebar updates.
4. A whole **uploaded folder** (e.g. "ABC130 · 47 files") has its own bin button: one
   confirmation removes the folder and all its files. Values already sent to result
   columns stay.
5. A column that a calculated column uses still cannot be deleted. There is no undo.

---

## Flow 6 — Export for a future reader (built)

**Goal:** get something useful out of the app, as the right kind of file.

1. **The samples table leaves as data.** An **Export** button above the samples table
   downloads Excel (sheets: Samples, Columns, Studies, Measurements) or CSV (samples
   only). It exports what you are looking at: everything shown (after a study filter or
   search), or only the ticked rows. Numbers stay numbers, a value that was never recorded
   is an empty cell (never 0), and the Samples sheet has one row per sample with units in
   the headers, so it can be calculated on in Excel and imported again.
2. **A sample report** (a **Report** button on the sample page): settings, results and
   calculated values (a missing value says "Not recorded", never 0), why it was made,
   observation and note, and the measurements with their file names. **Print / Save as
   PDF** uses the browser's print (A4 portrait, white paper in any theme, no toolbar).
3. **An experiment summary** (a **Summary** button on the experiment page): one or two
   pages that say something the table does not: what varied between samples and over what
   values (and how many samples recorded each), what stayed the same, how each result and
   calculated column came out (samples with a value, min, max, mean, SD dividing by N; a
   sample with no value is not counted), the studies with their sample codes, the protocol
   and the saved plots as figures.
4. There is no project report: a project is exported by exporting each experiment.

```
Samples table → Export → Excel / CSV          Sample page → Report → Print / Save as PDF
Experiment page → Summary → Print / Save as PDF
```

---

## Flow 7 — Ask the AI assistant

**Goal:** get an answer grounded in your own records — not the model's unaided recall —
without digging through the tables.

1. Once, in **Settings → AI assistant**: choose Claude, OpenAI or Ollama (on your computer),
   enter your key and model, and press Test connection. The key stays in this browser.
2. Press the floating **Ask AI** button (bottom right, on project, experiment and sample
   pages; hidden while the panel is open). The assistant opens as a panel on
   the right (a full-screen sheet on a phone) and pushes the page aside, so the data stays
   visible. What it asks about follows the page: an experiment page asks about that
   experiment (a switch makes it the whole project), a project page about the project.
   On other pages (home, plots, settings) a project is chosen in the panel.
3. Ask, or press an example question. The answer streams in; the assistant looks up the
   records with read-only tools. A value that was not recorded is said to be missing, never
   0, and "I don't have that" is a valid answer. An answer written without reading any
   record carries a warning.
4. Under the answer: **Sources** (links to only the samples/experiments the answer names,
   opening in the same tab) and the **tokens used**. Stop cancels an answer; New chat
   clears the conversation. The panel stays open and keeps the conversation while you move
   between pages or close and reopen it (chats are lost when the page is reloaded).
5. Without a key the page says so and links to Settings; a refused key, a missing model or
   a rate limit is shown as a plain message, never the provider's raw error.

```
Settings (key) → Project/Experiment page → floating Ask AI → side panel → answer with linked sources and tokens used
```

---

## Screen List (for early wireframing)

| Screen                                     | Purpose                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| Projects (home)                            | Entry point — pick or create a Project (ALD, CVD, ...); first-run welcome |
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
  name, a one-sentence lead such as a sample's implementation, long text folded
  behind "Show more", and a strip of key facts), a main
  column of raised panels for the work you do and read most (for an experiment: the
  samples table, the saved plots, the protocol and its columns; for a sample: parameters, results and
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

## Flow 5d — Data folder and backups (built)

**Goal:** keep everything on the owner's computer and have it saved to their shared drive.

1. **Settings → Data folder** (not on the public demo): **Choose folder** opens a folder
   browser (click through folders, **Up one level**, **New folder**, **Select this folder**;
   it lists folder names only). The full path can also be typed or pasted. The folder is
   checked at once: whether it works and whether it already holds Lab Brain files or backups.
2. A **Lab Brain** folder is created inside the picked one (shown before applying), holding
   `files` and `backups`; one that already exists is used and nothing in it is replaced.
   Choose what happens to the files already kept: **Copy them there** (each is checked, the
   originals stay, nothing already there is replaced) or **Use the folder as it is**.
   A first backup is made at once.
3. The database stays on the local disk; a copy is saved to `<folder>/backups` every 10
   minutes while something changed (last 30 per computer kept). **Back up now** is there too.
4. **Restore** lists the backups of every computer using the folder, asks once, keeps a copy
   of the current database on this computer, then restores.
