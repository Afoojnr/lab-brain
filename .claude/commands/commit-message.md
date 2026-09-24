---
description: suggest conventional commit messages based on staged changes
allowed-tools: Bash(git diff --staged*), Bash(git status*)
---

# Task: Suggest Commit Messages

Analyze the staged changes below and suggest **3–5 high-quality conventional commit messages**.

## Staged changes

- Files: !`git diff --staged --stat`
- Diff: !`git diff --staged`

If the diff above is empty, reply only: "Nothing is staged."

## Writing Rules (IMPORTANT)

- Focus on the **primary intent** of the change
- Prefer **user-visible or behavior-changing outcomes**
- Avoid listing implementation details or internal refactors unless they are the main change
- Use clear, specific verbs (add, enforce, require, prevent, simplify)

## Constraints

- **Format**: `type(scope): description`
- **Case**: lowercase only
- **Length**: max 100 characters
- **Mode**: suggestion only (do not commit, stage, or change any files)
- Types are enforced by commitlint (see `commitlint.config.js`)

## Conventional Commit Types

- feat: new behavior or capability
- fix: bug or incorrect behavior
- refactor: code change with no behavior change
- perf: performance improvement
- docs: documentation only
- test: tests only
- style: formatting only, no code change
- ci: CI configuration
- chore: tooling, config, maintenance
- revert: reverts an earlier commit

## Instructions

1. Determine the **dominant change** in the diff
2. Choose a **single primary commit message**
3. Suggest alternatives only if:
   - the change could reasonably be split, or
   - the scope/type is ambiguous
4. Use the feature or folder as the scope (e.g., import, notebook, storage, db, ui, config)
5. Output **only the commit messages** as a bullet list
