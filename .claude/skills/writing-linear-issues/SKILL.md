---
name: writing-linear-issues
description: Draft and create Linear issues using a consistent title format and description structure (Requirements, Acceptance criteria, Technical notes). Use when the user asks to create an issue in Linear, add a ticket, or formalize a requirement for Linear.
---

# Writing Linear Issues

## When to use this skill
- User asks to "create an issue in Linear", "add a ticket to Linear", or "log this in Linear".
- User wants to formalize a requirement, feature, bug, or chore as a Linear issue.
- **Trigger:** "Create a Linear issue for...", "Add to Linear", "Write the requirement in Linear."

## Workflow
1. **Clarify scope:** Understand category (feature / enhancement / bugfix / chore) and what the issue describes.
2. **Draft title** using the title template below.
3. **Draft description** using the section template (Requirements, Acceptance criteria, Technical notes).
4. **Resolve team:** Call `list_teams` (Linear MCP) if the team is unknown; use the appropriate team name or ID.
5. **Ask for approval:** Present the draft (title, description, team) to the user. Do **not** create the issue in Linear yet. Ask explicitly: "Here’s the draft. Approve to create in Linear, or share feedback to adjust."
6. **After approval:** Only when the user approves (e.g. "yes", "create it", "looks good") — or confirms after you’ve applied their feedback — call `save_issue` and return the issue link/identifier.

---

## 1. Title format

Use one of these prefixes followed by a short, imperative description.

| Category    | Prefix       | Example |
|------------|--------------|---------|
| Feature    | `Feature:`   | Feature: endpoint to list mandatory savings per user |
| Enhancement| `Enhancement:` | Enhancement: improve login error messages for invalid OTP |
| Bugfix     | `Bugfix:`    | Bugfix: prevent negative balance in cashbook on concurrent updates |
| Chore      | `Chore:`     | Chore: add migration for audit_logs index |

**Rules:**
- One category per issue; start the title with the prefix.
- After the colon, use lowercase (unless a proper noun or acronym).
- Keep the rest of the title under ~60 characters when possible.

---

## 2. Description template

Use Markdown. Include only sections that apply; omit empty ones.

```markdown
## Summary
[1–3 sentences: what this issue is about and why it matters.]

## Requirements

### Purpose
[Why this change exists; what problem it solves or what capability it adds.]

### Endpoint (if applicable)
- **Name/path:** [e.g. GET /api/savings/mandatory]
- **Request:** [Method, path, query params, body shape, headers if relevant.]
- **Response:** [Status codes, body shape, pagination if applicable.]

### Authentication and authorization
- [Who can call this / perform this action: e.g. JWT required; MEMBER sees own, ADMIN sees all.]
- [Any role or permission constraints.]

### Other requirements (if any)
- [Non-endpoint requirements: e.g. validation rules, side effects, notifications.]

## Acceptance criteria
- [ ] [Testable / checkable criterion]
- [ ] [Another criterion]

## Technical notes
- [Relevant files, modules, or patterns]
- [Constraints: e.g. Decimal.js for amounts, TZ Asia/Makassar, existing table X]
```

**Section guidelines:**
- **Summary:** Brief context and goal; no implementation detail.
- **Requirements:** Must include **Purpose** and **Authentication and authorization**. If the issue involves an API endpoint, also include **Endpoint** with name/path, request, and response. Add **Other requirements** only when needed.
- **Acceptance criteria:** Checkbox list of conditions that must hold for the issue to be considered done.
- **Technical notes:** Pointers for implementers (codebase, conventions, DB, env).

### What must be inside Requirements

| When | What to include |
|------|------------------|
| **Always** | **Purpose** — Why this change; what problem or capability. |
| **Always** | **Authentication and authorization** — Who can do it; roles/permissions (e.g. JWT, MEMBER vs ADMIN). |
| **If it's an endpoint** | **Endpoint** — Endpoint name/path; **Request** (method, path, query/body, headers); **Response** (status codes, body shape, pagination). |
| **If needed** | **Other requirements** — Validation, side effects, integrations, etc. |

---

## 3. Approval before creating (required)

**Do not call `save_issue` until the user has approved the draft.**

1. **Present the draft** to the user in a clear block, including:
   - **Title**
   - **Team** (name or ID)
   - **Description** (full markdown)

2. **Ask for approval** in one of these ways:
   - "Here’s the draft issue. Say **approve** (or **create it**) to create it in Linear, or share any feedback to adjust the title or description."
   - "Review the draft above. Reply with approval to create in Linear, or with changes you’d like."

3. **If the user gives feedback:** Update the draft (title and/or description), then present the revised draft and ask for approval again. Do not create until they approve.

4. **Only after explicit approval** (e.g. "yes", "approve", "create it", "looks good"): proceed to section 4 and call `save_issue`.

---

## 4. Creating the issue (Linear MCP)

**Call this only after the user has approved the draft in section 3.**

1. **List teams** if not already known:
   - Tool: `list_teams` (no required args).
   - Use the returned `name` or `id` as the `team` when calling `save_issue`.

2. **Create the issue:**
   - Tool: `save_issue`.
   - **Required when creating:** `title` (from section 1), `team` (name or ID).
   - **Recommended:** `description` (from section 2), `state` (e.g. "Backlog"), `priority` (0–4: None, Urgent, High, Normal, Low).
   - **Optional:** `project`, `labels`, `assignee`, `dueDate`, `cycle`, `milestone`, `parentId`, `blocks`, `blockedBy`, `relatedTo`.

3. **After creating:** Return the issue identifier (e.g. `LU-5`), title, and link so the user can open it in Linear.

---

## 5. Examples

**Feature**
- Title: `Feature: endpoint to get all mandatory savings per user`
- Summary: Add a GET endpoint that returns all mandatory savings, optionally scoped by user; respect role (member vs admin).
- Requirements:
  - **Purpose:** Allow clients to list mandatory savings (own for members, all for admins) for reporting/dashboards.
  - **Endpoint:** `GET /api/savings/mandatory` (or under users); query e.g. `?userId=` for admin; **Request:** GET, no body; **Response:** 200, body `{ items: [...], total? }`, each item has user, amount, period, etc.; pagination if needed.
  - **Authentication and authorization:** JWT required; MEMBER can only request own data (or no userId); ADMIN can request any user or all.
- Acceptance criteria: Implemented, documented in Swagger, access control and amounts (Decimal) correct.
- Technical notes: Use `mandatory_savings` table and existing services; Asia/Makassar for dates.

**Enhancement**
- Title: `Enhancement: improve login error messages for invalid OTP`
- Summary: Make OTP validation errors clearer and consistent.
- Requirements: Message text, HTTP status, no sensitive leak.
- Acceptance criteria: Copy agreed, tests updated, Swagger/docs updated.
- Technical notes: Auth module, existing OTP service.

**Bugfix**
- Title: `Bugfix: prevent negative balance in cashbook on concurrent updates`
- Summary: Fix race where concurrent writes can leave balance negative.
- Requirements: Use DB-level consistency (e.g. locking or constraints); no duplicate trigger logic in app.
- Acceptance criteria: Reproducer test, fix in place, no regression.
- Technical notes: Cashbook triggers, balance updates.

**Chore**
- Title: `Chore: add migration for audit_logs index on user_id`
- Summary: Add an index to speed up audit queries by user.
- Requirements: New migration, index on `user_id`, reversible.
- Acceptance criteria: Migration runs up/down, no breaking schema change.
- Technical notes: `audit_logs` table, existing migrations path.

---

## 6. Checklist before calling save_issue

- [ ] Title uses exactly one prefix: `Feature:`, `Enhancement:`, `Bugfix:`, or `Chore:`.
- [ ] Description includes Summary and at least one of: Requirements, Acceptance criteria, Technical notes.
- [ ] **Requirements** includes: **Purpose** and **Authentication and authorization**; if the issue is an endpoint, also **Endpoint** (name/path, request, response).
- [ ] Team is known (from context or `list_teams`).
- [ ] **Draft was presented and user has approved** — do not call `save_issue` before approval (or after applying feedback).
- [ ] Optional fields (state, priority, project) set only when relevant.
