---
description: Analyze the current branch's changes and suggest a concise PR description.
allowed-tools: Bash(git diff *), Bash(git log *), Bash(git status*)
---

# Task: Suggest PR Description

Draft a **concise Pull Request description** for the current branch using the template below.

## Branch changes

- Commits: !`git log main..HEAD --oneline`
- Files: !`git diff main...HEAD --stat`
- Diff: !`git diff main...HEAD`

If there are no commits and the diff is empty, describe the staged changes instead:
!`git diff --staged`

## Writing Rules (IMPORTANT)

- Focus on **outcomes and major changes**, not internal steps or every file touched
- Group related changes together
- Avoid listing helper functions, utilities, or obvious refactors unless they change behavior
- Prefer **what changed** over **how it was implemented**
- Keep each section short and scannable (3–6 bullets max)

## Tone & Style

- Present tense, active voice
- Factual and direct
- No hypotheticals or implementation tutorials
- Assume the reviewer understands the codebase

## Template to Populate

## Description

## What was done?

## Why did you do this?

## How did you test this?

Base "How did you test this?" only on what the diff shows (tests added, commands
run). If nothing shows how it was verified, write "Not tested yet" instead of
inventing steps.

## Instructions

1. Identify the **primary feature changes** and **behavioral impacts**
2. Summarize only **meaningful additions or changes**
3. Omit low-level details (utility functions, minor validations, internal helpers)
4. Output a **single markdown block** ready to paste into a PR
5. Optimize for **review speed**, not completeness
