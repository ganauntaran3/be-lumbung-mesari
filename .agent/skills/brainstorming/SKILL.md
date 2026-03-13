---
name: brainstorming
description: Facilitates a collaborative design process to turn vague ideas into concrete specifications. Use before any coding begins when requirements are unclear.
---

# Brainstorming & Design

## When to use this skill
- When the user has a vague idea ("I want a dashboard").
- When the user asks for "ideas" or "suggestions".
- Before using the `writing-plans` skill, if the specific design isn't settled.
- **Trigger:** "Brainstorm with me", "Help me design...", "I have an idea for..."

## Workflow
1.  **Discovery:** Ask single, focused questions to understand intent.
2.  **Options:** Propose 2-3 distinct technical approaches with trade-offs.
3.  **Drafting:** Write the design document in small, validated sections.
4.  **Finalize:** Save the design and transition to planning.

## Instructions

### 1. The Inquiry Loop (Discovery)
- **Rule:** Ask **only one** question per turn.
- **Format:** Use multiple-choice when possible to reduce user friction.
  > "For the database, should we use: A) SQLite for simplicity, or B) Postgres for scalability?"
- **Goal:** Uncover purpose, constraints, and success criteria.

### 2. Presenting Approaches
Once you understand the goal, present 2-3 options.
- **Option A:** The "Simple/MVP" approach.
- **Option B:** The "Robust/Scalable" approach.
- **Recommendation:** State clearly which one you recommend and why.

### 3. The Design Document
Once an approach is selected, draft the design iteratively.
**Do not** dump a massive spec at once. Write 200-300 word chunks and ask "Does this look right?"

**Final Output:**
Save the validated design to `docs/plans/YYYY-MM-DD-<topic>-design.md`.

### 4. Transition
After the design is saved:
> "Design saved. Ready to move to implementation planning? I can use the `writing-plans` skill for that."
