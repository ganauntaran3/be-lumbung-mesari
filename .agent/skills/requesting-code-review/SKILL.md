---
name: requesting-code-review
description: Performs code reviews for production readiness. Use when the user asks to review code, PR review, assess production readiness, or evaluate implementation quality.
---

# Code Review Agent

You are reviewing code changes for production readiness.

## When to use this skill
- User asks to review code or a pull request
- User mentions PR review, code review, or assessing production readiness
- User wants feedback on implementation quality
- User requests evaluation against requirements

## Workflow

Follow this review process:

1. **Gather context**: What was implemented vs. requirements
2. **Analyze changes**: Review the git diff and modified files
3. **Evaluate quality**: Check code quality, architecture, testing, production readiness
4. **Categorize findings**: Group by severity (Critical, Important, Minor)
5. **Provide verdict**: Clear assessment on merge readiness

## Instructions

### 1. Gather Review Context

Identify the review scope:

- **What was implemented**: Summary of changes from PR description or commits
- **Requirements/Plan**: Reference to issues, specs, or design documents
- **Git range**: Base SHA and head SHA to compare

```bash
# Get stats on changes
git diff --stat {BASE_SHA}..{HEAD_SHA}

# Get full diff
git diff {BASE_SHA}..{HEAD_SHA}

# Get commit history
git log {BASE_SHA}..{HEAD_SHA} --oneline
```

### 2. Review Checklist

Evaluate code across these dimensions:

**Code Quality:**
- Clean separation of concerns?
- Proper error handling?
- Type safety (if applicable)?
- DRY principle followed?
- Edge cases handled?

**Architecture:**
- Sound design decisions?
- Scalability considerations?
- Performance implications?
- Security concerns?

**Testing:**
- Tests actually test logic (not just mocks)?
- Edge cases covered?
- Integration tests where needed?
- All tests passing?

**Requirements:**
- All plan requirements met?
- Implementation matches spec?
- No scope creep?
- Breaking changes documented?

**Production Readiness:**
- Migration strategy (if schema changes)?
- Backward compatibility considered?
- Documentation complete?
- No obvious bugs?

### 3. Categorize Issues

Assign severity levels:

**Critical (Must Fix)**
- Bugs that break functionality
- Security vulnerabilities
- Data loss risks
- Crashes or fatal errors

**Important (Should Fix)**
- Architecture problems
- Missing required features
- Poor error handling
- Test coverage gaps

**Minor (Nice to Have)**
- Code style inconsistencies
- Optimization opportunities
- Documentation improvements
- Non-blocking polish

### 4. Format Review Output

Structure your review as:

```markdown
### Strengths
[What's well done? Be specific with file:line references.]

### Issues

#### Critical (Must Fix)
[Bugs, security issues, data loss risks, broken functionality]

#### Important (Should Fix)
[Architecture problems, missing features, poor error handling, test gaps]

#### Minor (Nice to Have)
[Code style, optimization opportunities, documentation improvements]

### Recommendations
[Improvements for code quality, architecture, or process]

### Assessment

**Ready to merge?** [Yes/No/With fixes]

**Reasoning:** [Technical assessment in 1-2 sentences]
```

For each issue, include:
- File:line reference
- What's wrong
- Why it matters
- How to fix (if not obvious)

### 5. Critical Rules

**DO:**
- Categorize by actual severity (not everything is Critical)
- Be specific with file:line references
- Explain WHY issues matter
- Acknowledge strengths
- Give clear verdict

**DON'T:**
- Say "looks good" without actually reviewing
- Mark nitpicks as Critical
- Give feedback on code you didn't review
- Be vague ("improve error handling" without specifics)
- Avoid giving a clear verdict
