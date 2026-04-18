---
name: feature-orchestrator
description: Orchestrates the full feature delivery pipeline from a single natural-language prompt: brainstorming → Linear issue → implementation plan → code execution → PR. Use when the user wants to go from an idea or prompt all the way to a working implementation in one flow. Triggers: "build this feature end-to-end", "implement from scratch", "orchestrate", "full pipeline for", "from prompt to code".
---

# Feature Orchestrator

Turns a single prompt into a shipped feature by chaining five skills in sequence:

```
[Prompt] → Brainstorm → Linear Issue → Plan → Execute → PR
```

---

## Workflow

- [ ] **Stage 1 — Brainstorm:** Clarify requirements from the raw prompt
- [ ] **Stage 2 — Linear Issue:** Formalise the agreed spec as a tracked issue
- [ ] **Stage 3 — Plan:** Generate a task-by-task implementation plan
- [ ] **Stage 4 — Execute:** Implement the plan task by task
- [ ] **Stage 5 — Ship:** Create branch, commit, and open a pull request

Announce the current stage at the start of each transition:

> "Moving to Stage N — [Stage Name]…"

---

## Stage 1: Brainstorm

**Goal:** Turn the raw prompt into a concrete, agreed specification.

Follow the `brainstorming` skill:

1. Ask focused, single questions (one per turn) to uncover purpose, constraints, and success criteria.
2. Present 2–3 design options with trade-offs; recommend one.
3. Draft the spec iteratively (200–300 word chunks), validate with user.
4. Save the final spec to `docs/plans/YYYY-MM-DD-<topic>-design.md`.

**Exit condition:** User approves the spec. Extract and carry forward:

- Feature category (`Feature` / `Enhancement` / `Bugfix` / `Chore`)
- Concise feature name (for naming subsequent artefacts)
- Agreed spec text

---

## Stage 2: Linear Issue

**Goal:** Create a tracked issue from the approved spec.

Follow the `writing-linear-issues` skill:

1. Draft the title using the prefix format: `Feature: …` / `Enhancement: …` / etc.
2. Draft the full description (Summary, Requirements → Purpose + Auth + Endpoint if applicable, Acceptance criteria, Technical notes).
3. Present the draft and ask for approval. **Do not call `save_issue` before explicit approval.**
4. After approval, call `save_issue` and return the issue identifier (e.g. `LU-12`) and link.

**Carry forward:** issue identifier and title (embed in plan header).

---

## Stage 3: Plan

**Goal:** Produce an executable, atomic implementation plan.

Follow the `writing-plans` skill:

1. Analyse the codebase context relevant to the feature.
2. Define the architecture (2–3 sentences).
3. Break work into atomic TDD tasks (each ~2–5 min). Each task includes: files to create/modify, failing test, minimal implementation, passing test, commit.
4. Save to `docs/plans/YYYY-MM-DD-<feature-name>.md`. Include the Linear issue identifier in the plan header.

**Carry forward:** plan file path.

---

## Stage 4: Execute

**Goal:** Implement every task in the plan, in order.

Follow the `execute` skill with the plan from Stage 3:

- Work task by task; run tests after each task.
- Commit after each passing task using the commit message specified in the plan.
- If a task fails, diagnose and fix before moving to the next.
- After all tasks pass, present a summary: tasks completed, files changed, Linear issue to close.

**Carry forward:** list of changed files, commit log.

---

## Stage 5: Ship

**Goal:** Package the implementation into a pull request.

Follow the `create-pr` skill, passing the context carried from earlier stages:

- Feature category, feature name slug, and Linear issue identifier from Stage 1–2.
- Changed files and commits from Stage 4.

The `create-pr` skill will:

1. Create a new branch (`<category>/LU-XX-<feature-slug>`) if still on trunk.
2. Stage and commit any uncommitted changes.
3. **Present the branch name, commit message, and full PR draft for explicit user approval.**
4. Only after approval: push the branch and open the PR via `gh pr create`.
5. Write a detailed description of the changes in the PR description.

Return the PR URL to the user and announce completion.

---

## Context hand-off summary

| Stage        | Produces                               | Consumed by              |
| ------------ | -------------------------------------- | ------------------------ |
| Brainstorm   | Spec file path, category, feature name | Linear Issue, Plan, Ship |
| Linear Issue | Issue identifier + link                | Plan header, Ship        |
| Plan         | Plan file path                         | Execute                  |
| Execute      | Implementation + commit log            | Ship                     |
| Ship         | PR URL                                 | User                     |

---

## Aborting and resuming

- If the user says **"stop"** or **"pause"** at any stage, save the current artefacts and state which stage was reached.
- If the user later says **"resume feature orchestration"**, read the latest design and plan files in `docs/plans/` and continue from the last incomplete stage.

---

## Key rules

- Never skip a stage or merge two stages into one turn.
- Never call `save_issue` before the user approves the Linear draft.
- Never execute code before the plan file exists and the user has seen it.
- Carry the Linear issue identifier into the plan and commit messages.
- Never run `git push` or `gh pr create` before the user explicitly approves the Stage 5 draft.
- Never use `git add -A` or `git add .` — stage specific files only.
