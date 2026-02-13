---
name: writing-plans
description: Generates comprehensive implementation plans for multi-step coding tasks. Use when the user needs to break down a feature or requirement into executable steps before coding.
---

# Writing Implementation Plans

## When to use this skill
- When the user asks to "plan" a feature or task.
- When a task is complex (invites >3 files or multiple steps).
- When the user provides requirements/specs but no code structure.
- **Trigger:** "Create a plan for...", "Plan this out", "How should we build this?"

## Workflow
1.  **Analyze Context:** Understand the goal, tech stack, and existing architecture.
2.  **Define Architecture:** Briefly outline the approach.
3.  **Break Down Tasks:** precise, bite-sized tasks (2-5 mins execution time each).
4.  **Write Plan File:** Save the plan to `docs/plans/YYYY-MM-DD-<feature-name>.md`.
5.  **Review & Hand-off:** Present the plan and offer execution options.

## Instructions

### 1. Plan Structure
Every plan **MUST** be written to a markdown file in `docs/plans/` (create directory if missing).
The file name should be `YYYY-MM-DD-<feature-name>.md`.

**Required Header:**
```markdown
# [Feature Name] Implementation Plan

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]

---
```

### 2. Task Granularity (The "TDD Loop")
Break work into atomic tasks. Each task represents **one** logical step in TDD.

**Task Format Template:**
```markdown
### Task N: [Component/Feature Name]

**Files:**
- Create: `src/path/to/file.py`
- Modify: `src/path/to/existing.py:100-120`
- Test: `tests/path/to/test.py`

**Step 1: Write the failing test**
(Provide exact code for the test case)

**Step 2: Run test to verify it fails**
`pytest tests/path/test.py` -> Expected: Fail

**Step 3: Write minimal implementation**
(Provide exact code for the function/class)

**Step 4: Run test to verify it passes**
`pytest tests/path/test.py` -> Expected: Pass

**Step 5: Commit**
`git add ... && git commit -m "..."`
```

### 3. Key Principles
- **Exact Paths:** Always use absolute or correct relative paths.
- **Self-Contained:** The plan should be executable by a developer with zero context.
- **Snippet Completeness:** Provide full code snippets for new files; use specific replace blocks for edits.
- **YAGNI:** Do not "future proof". Build exactly what is needed for the test to pass.

### 4. Handoff
After saving the plan, inform the user:
> "Plan saved to `docs/plans/<filename>.md`. Would you like to execute this using a **Subagent** (task-by-task) or in a **Parallel Session**?"
