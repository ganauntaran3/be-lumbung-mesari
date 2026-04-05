---
description: Execute an existing implementation plan task-by-task. Pass a plan filename or feature name, or leave empty to pick the most recent plan.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

## Plan to Execute

Locate and read the plan file for `$ARGUMENTS`. If multiple matches are found, list them and ask the user which one to execute.

After each task, report:

- ✅ Task N complete: `[task name]`
- Files created/modified
- Test result summary

Then ask: **"Continue to Task N+1?"** — unless the user previously said "run all tasks" or passed `--auto`.
