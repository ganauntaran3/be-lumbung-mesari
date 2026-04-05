---
description: Generate a comprehensive implementation plan for a feature or task. Triggers the writing-plans skill automatically.
argument-hint: '[feature name] [requirement] [success criteria]'
allowed-tools: Read, Write, Glob, Grep, Bash(find:), Bash(ls:)
---

Create a plan for,

Feature: $1,
Requirement: $2,
Success Criteria: $3

If you are not sure about the requirement, ask the user for clarification. for success criteria, it's optional. Use SMART criteria if you are not sure about the success criteria.
