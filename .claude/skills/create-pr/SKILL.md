---
name: create-pr
description: Creates a pull request from the current branch: checks out a new branch (if needed), stages and commits changes, then opens a PR via gh CLI. Use when the user wants to ship code changes as a pull request. Triggers: "create PR", "open pull request", "ship this", "push and PR".
---

# Create PR

Packages committed work into a pull request with a well-structured description.

---

## Workflow

- [ ] **Step 1 — Gather context:** Inspect current git state and derive branch/PR metadata.
- [ ] **Step 2 — Branch:** Create and check out the feature branch (skip if already on one).
- [ ] **Step 3 — Commit:** Stage changes and commit with a conventional message.
- [ ] **Step 4 — Approval gate:** Present the branch name, commit message, and PR draft to the user and wait for explicit approval.
- [ ] **Step 5 — Push & PR:** Push the branch and open the PR.

---

## Step 1: Gather context

Run the following in parallel:

```bash
git status
git diff
git rev-parse --abbrev-ref HEAD   # current branch
git log --oneline -5              # recent commits
```

Extract:
- **Changed files** — determine scope.
- **Recent commits** — inform the PR summary if commits already exist.
- **Current branch name** — record this as the **base branch** for the PR. If it is `main` / `master` / `develop`, a new feature branch must be created in Step 2 and the base remains `main`.

Also collect from the calling context (if invoked by feature-orchestrator):
- Linear issue identifier (e.g. `LU-12`)
- Feature name (slug form, e.g. `user-savings-by-year`)
- Feature category (`feature` / `fix` / `chore` / `refactor`)

---

## Step 2: Branch

**If already on a non-trunk branch:** record the current branch as **`<base-branch>`**, then create the new feature branch from it. Skip to Step 3 after branching, or skip Step 2 entirely if already on the correct feature branch.

**If on a trunk branch (`main` / `master` / `develop`):**

Derive the branch name:
```
<category>/<linear-id>-<feature-slug>
```
Examples:
- `feature/LU-12-user-savings-by-year`
- `fix/LU-34-cashbook-balance-rounding`

> If no Linear ID is available, omit it: `feature/user-savings-by-year`.

Run:
```bash
git checkout -b <branch-name>
```

Announce: "Created branch `<branch-name>`."

---

## Step 3: Commit

Stage all relevant changes:
```bash
git add <specific files>   # prefer explicit files over git add -A
```

Compose a conventional commit message:
```
<type>(<scope>): <short imperative summary>

<optional body — what and why, not how>

Refs: <Linear issue identifier>
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

- `type`: `feat` / `fix` / `chore` / `refactor` / `test` / `docs`
- `scope`: module or layer affected (e.g. `users`, `cashbook`, `auth`)
- Summary: ≤ 72 chars, imperative mood, no trailing period.

> If commits already exist on the branch (execute skill already committed), skip `git add` / `git commit` — proceed directly to Step 4.

---

## Step 4: Approval gate

Present a concise summary to the user **before taking any irreversible action**:

```
Ready to ship — please approve:

Base:    <base-branch>
Branch:  feature/LU-12-user-savings-by-year
Commit:  feat(users): add mandatory savings query by year

PR Title:   feat(users): add mandatory savings query by year
PR Body:
  ## Summary
  - ...

  ## Linear
  Closes LU-12

  ## Test plan
  - [ ] ...

  🤖 Generated with Claude Code

Approve? (yes / edit / abort)
```

**Do not run `git push` or `gh pr create` until the user says yes (or equivalent).**
If the user says "edit", apply their requested changes and re-present.
If the user says "abort" / "no", stop and report what was staged locally.

---

## Step 5: Push & PR

After approval:

```bash
git push -u origin <branch-name>
gh pr create \
  --title "<PR title>" \
  --body "<PR body>" \
  --base <base-branch>
```

Where `<base-branch>` is the branch that was active **before** the feature branch was created (recorded in Step 1). This ensures PRs target the correct parent branch, not always `main`.

Return the PR URL to the user.

---

## PR body template

```markdown
## Summary
<1–3 bullet points describing what changed and why>

## Linear
Closes <issue-identifier>

## Test plan
- [ ] <manual or automated verification step>
- [ ] <another step>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Omit the Linear section if no issue identifier is available.

---

## Key rules

- Never run `git push` or `gh pr create` before explicit user approval in Step 4.
- Never use `git add -A` or `git add .` — stage specific files to avoid committing secrets or unrelated changes.
- Never skip hooks (`--no-verify`).
- Never force-push to `main` / `master`.
- If `gh` is not authenticated, tell the user and stop.
