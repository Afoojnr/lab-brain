---
description: Generates or updates a high-quality, professional README.md for long-term project clarity.
---

# Command: Sync Project Documentation (README)

Act as a Senior Technical Writer and Architect. Your goal is to create or update the `README.md` in the project root so that Lab Brain stays understandable and runnable for years to come.

## 1. Documentation Writing Rules

- Tense: Use present tense verbs (e.g., "The server starts" vs "The server started").
- Voice: Use Active Voice and Second Person ("You"). Address the reader directly.
- Tone: Use factual statements and direct commands. Avoid hypotheticals like "could," "would," or "might."
- Clarity: Keep sentences concise and use the domain names from `.claude/CLAUDE.md` (Project, Experiment, Synthesis, Sample, Dataset, Analysis, NotebookEntry, Reference).

## 2. Required README Sections

Include and populate the following sections based on the actual codebase:

1. Project Overview: A brief explanation of Lab Brain and its core purpose (a connected research workspace for materials science: record experiments, import spreadsheet data, attach characterization files, run calculations, export the chain). Take the wording from `.claude/docs/project-spec.md`.
2. Stack: List the stack actually installed in `package.json`. Do not list planned libraries (for example Drizzle, Vitest) until they appear in `package.json`.
3. Setup: Clear instructions on how to clone, install dependencies (using Yarn 1), and set up environment variables. List environment variables only if the code reads them.
4. Usage: List all scripts found in `package.json` (dev, build, lint, format, ts-check) with a description of what each does.
5. Folder Structure: A tree view of the directories that exist today (`app/`, `components/`, `lib/`, and `features/` once it exists), explaining what belongs in each. Take the boundaries from `.claude/CLAUDE.md`.
6. Project Docs: Link to `.claude/docs/project-spec.md` and `.claude/docs/ux-flows.md`.
7. Contributing: State that commits follow Conventional Commits, and that Husky runs typecheck, lint, and format on every commit.

## 3. Execution Instructions

- Scan: Read `package.json`, `.claude/CLAUDE.md`, `.claude/docs/project-spec.md`, and list the top-level directories before writing.
- Markdown: Use proper heading hierarchies (`#`, `##`, `###`), bullet points for lists, and syntax-highlighted code blocks for commands.
- Replace the default create-next-app boilerplate. Keep nothing from it except facts that are still true.
- Direct Action: You are authorized to create or overwrite the `README.md` file.

## 4. Constraints

- No Hypotheticals: Instead of "You could run yarn dev," write "Run `yarn dev` to start the development server."
- No Invention: Describe only what exists in the repository. Mark anything unknown as `TODO` and ask.
- Use Yarn commands only. Never write `npm run` or `npx` for project scripts.

---

Target File: `/README.md`
