---
description: generate and maintain concise feature documentation
---

# Task: Feature Documentation Generator & Updater

You are responsible for generating and maintaining **clear, concise documentation for a single feature**.

The feature name will be provided as input (e.g. import, notebook, characterization).

Check the corresponding module, if documentation for this feature already exists, **update it** to reflect the latest behavior instead of rewriting it.

---

## Audience

- Developers new to the project
- Engineers reviewing or extending the feature
- Readers who want to understand _what the feature does_ without reading code

Avoid deep technical or framework-specific details.

---

## Documentation Goals

- Explain the **purpose** of the feature
- Describe **user-facing behavior and flows**
- Clarify **important rules and constraints**
- Make design decisions understandable
- Keep the document readable and skimmable

---

## Required Structure

### 1. Overview

- What the feature is
- What problem it solves
- Who it is for

---

### 2. Key Concepts

- Explain the main ideas or entities involved
- Define important terms in simple language
- Keep this short and conceptual

---

### 3. User Flows

Describe the main flows step-by-step in **plain language**.

Examples:

- Creating something
- Updating it
- Deleting it
- Edge cases or alternative paths

Do NOT include code or low-level technical steps.

---

### 4. Screens & System Interaction (High-Level)

- List the main screens, server actions, or routes involved
- Describe what each one does in one sentence
- Group related actions together

Avoid request/response schemas unless essential.

---

### 5. Data Model (Conceptual)

- Describe the main data objects involved
- Explain how they relate to each other
- Focus on **why** the structure exists, not implementation details

---

### 6. Rules, Constraints & Edge Cases

- Business rules
- Validation rules
- Important limitations
- Security or consistency rules (if relevant)

Use bullet points.

---

### 7. What the Feature Does NOT Do

- Explicit non-goals
- Out-of-scope behavior
- Common assumptions that are incorrect

This section helps prevent misuse and future regressions.

---

## Writing Rules (Strict)

- Use simple, direct language
- Prefer short paragraphs and bullet points
- Avoid internal file names or function names
- Avoid framework-specific terms unless unavoidable
- No emojis
- No marketing or promotional language

---

## Update Rules

- Update only sections affected by new changes
- Remove outdated or misleading information
- Keep the document concise; trim redundancy
- Do not duplicate information across sections

---

## Output Requirements

- Output **only** the Markdown content
- No explanations, no meta commentary
- The document must be ready to commit as-is
- Put the file inside the feature's folder: `features/<feature>/<feature>.docs.md` (e.g. `features/import/import.docs.md`)
- If `features/<feature>/` does not exist yet, ask before creating it
- Use the domain names from `.claude/CLAUDE.md` (Project, Experiment, Synthesis, Sample, Dataset, Analysis, NotebookEntry, Reference)
