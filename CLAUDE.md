# Claude / Cursor Instructions

## Purpose

This file defines stable operating rules for AI-assisted work in this repository.

It is not a roadmap, not a product spec, and not a milestone plan. Current product context, active milestones, WIP notes, and implementation plans must live in docs, issues, PRs, or planning files — not in this policy file.

## Role

Use AI assistants as planning, architecture, audit, review, and bounded execution partners.

AI may implement small, explicitly scoped changes when requested, but must not autonomously expand scope, refactor broadly, or convert product ideas into implementation requirements without an explicit plan.

## Core Operating Principles

1. **Policy is stable; project state lives elsewhere.**  
   Do not encode the current milestone, active feature, or temporary implementation plan in this file.

2. **Current phase context lives in `_working/ITERATION.md`.**  
   Before meaningful work, read `_working/ITERATION.md` to understand active phase, scope, non-scope, and current iteration identity. If it is missing or stale, stop and ask for it to be created or updated.

3. **Small bounded changes.**  
   Prefer narrow, reviewable tasks over large multi-area changes.

4. **Audit before meaningful implementation.**  
   If a task changes architecture, data semantics, product behavior, driver-facing UX, or spans multiple areas, audit and plan before coding.

5. **WIP is not Canon.**  
   Working notes, hypotheses, and scratch files are not implementation truth until explicitly promoted to Canon or captured in a decision record.

6. **External data is not truth.**  
   Third-party or public datasets are candidate inputs until verified according to the project’s data policy.

7. **Private/raw data stays local by default.**  
   Do not commit raw external datasets, secrets, personal logs, or private location data unless explicitly approved.

8. **Safety-sensitive UX requires explicit review.**  
   Any in-drive, driver-facing, alerting, or attention-affecting UX must be treated as safety-sensitive and planned deliberately.

9. **Do not add infrastructure casually.**  
   Backend, accounts, sync, cloud storage, telemetry, large frameworks, or new service dependencies require explicit rationale and approval.

## Responsibilities

For AI-assisted work, prioritize:

- clarifying scope and non-goals;
- identifying product and technical boundaries;
- auditing existing repo state before implementation;
- designing small execution slices;
- preserving documentation discipline;
- identifying risks and assumptions;
- keeping changes reviewable;
- reporting what changed and what remains uncertain.

## Forbidden Actions Unless Explicitly Asked

Do not do the following unless the user explicitly requests it:

- make broad multi-file code changes;
- perform unrelated refactoring;
- mix refactor and behavior change in one step;
- promote WIP to Canon;
- rewrite product meaning or data semantics silently;
- commit raw/private/external datasets;
- add backend/accounts/sync/cloud infrastructure;
- scrape, reverse engineer, or OCR third-party apps/services;
- add dependencies without explaining why they are needed;
- merge, close, or delete branches/PRs;
- force-push or rewrite shared history.

## When to Stop

Stop and ask for direction, or produce an audit/plan instead of implementing, when:

- the task is ambiguous or has materially different solution paths;
- the work crosses product, data, UX, and implementation boundaries;
- the task introduces new persistent data semantics;
- the task touches safety-sensitive user interaction;
- the task would publish or commit external/private data;
- the task requires changing Canon or promoting WIP to Canon;
- the task would require broad refactoring or unrelated cleanup;
- `_working/ITERATION.md` is missing, stale, or inconsistent with the requested meaningful work.

Small obvious fixes may proceed directly when the path is genuinely unambiguous.

## Work Area vs Tech Area

Classifier for where work lives is **Work Area**, not issue existence.

- **Work Area** = type of work: Product Specs WIP / Implementation / Docs / Test / Research / Org
- **Tech Area** = component or domain: project-specific area such as Web, Mobile, Data Import, UX, Backend, Documentation, Dev Workflow, etc.

## Iteration Descriptor

`_working/ITERATION.md` is the **active sprint / phase descriptor**.

It exists so Cursor / AI agents can recover the current sprint context without the user restating the full project state in every prompt.

An iteration is closer to an **Agile sprint** than to a PR. One iteration may include:

- one umbrella / master issue;
- several sub-issues;
- several PR slices inside a large issue;
- documentation, review, and planning steps belonging to the same phase.

A sprint-level descriptor should contain:

- sprint goal;
- umbrella / master issue(s);
- source-of-truth docs;
- scope and non-scope;
- current tracker location;
- completed major slices;
- next recommended slice;
- Cursor / AI rules for this sprint;
- sprint Definition of Done.

It is **not**:

- a progress log;
- a final report;
- a per-PR task descriptor;
- durable product truth;
- a substitute for WIP, Canon, ADRs, issues, or PR bodies.

### When to update `_working/ITERATION.md`

**Do update** when:

- the active sprint / phase changes;
- the file is stale or materially misleading for the requested work;
- the user explicitly asks to update the sprint descriptor.

**Do not update** merely because:

- a new PR is being created inside the same sprint;
- a new area / slice is being worked inside the same umbrella issue;
- the prompt provides detailed instructions for the current slice;
- a final report needs somewhere to live.

### Mismatch behavior

If the prompt appears inconsistent with the current `_working/ITERATION.md`, stop and ask for clarification before changing files:

- Is this still part of the current sprint?
- Should `_working/ITERATION.md` be updated to a new sprint?
- Should this task be deferred or handled under a different issue?

For meaningful implementation/test work, ensure the file exists and matches the task before proceeding. Treat `_working/ITERATION.md` as phase context, not Canon. Do not place stable product truth there; promote stable decisions to Canon or decision records.

## Routing Rules

Use these default locations once the folders exist. If the repository uses a more specific documented structure, follow that structure.

- **Product Specs WIP**  
  Product options, hypotheses, UX ideas, models, open questions, and exploratory notes → `docs/product/wip/**` or the project’s WIP docs area.  
  WIP is not implementation truth until promoted.

- **Canon**  
  Stable product definitions, accepted data models, implementation-facing product truth, and long-lived principles → `docs/product/areas/**`, `docs/canon/**`, or another explicit Canon location.

- **Decisions**  
  ADR-style decisions and tradeoffs → `docs/decisions/**`.

- **Research**  
  Durable source analysis, format notes, benchmark reviews, and licensing notes → `docs/research/**`.

- **Implementation**  
  Source code, tools, schemas, and app code → relevant source folders. Temporary implementation notes may use `_working/**` if the directory exists.

- **Test / Validation**  
  Temporary logs and local experiments → `_working/**` or untracked local files. Durable validation reports → tracked docs.

- **Org / Process**  
  Repo workflow, AI instructions, planning rules, and process notes → root docs, `docs/dev/**`, or this file when the rule is stable.

## `_working/` Policy

`_working/` is an ephemeral sandbox only.

Tracked files allowed by default:

- `_working/README.md`;
- `_working/ITERATION.md`.

Other files in `_working/` should be treated as disposable local scratch material unless explicitly promoted or approved for commit.

Allowed:

- temporary notes;
- scratch logs;
- local experiment output;
- current-iteration research that is not durable yet.

Not allowed:

- durable product truth;
- Canon;
- retained audit reports;
- raw private datasets intended to remain local;
- secrets or private location data.

Durable outputs belong in tracked docs or GitHub issues/PRs, not in `_working/`.

## Audit-First Before Implementation

Audit-first is mandatory when any of the following is true:

- the task is a product behavior slice rather than a narrow code edit;
- the task touches data semantics, source interpretation, or schemas;
- the task spans multiple files or layers;
- the task affects driver-facing, safety-sensitive, or alerting UX;
- the task depends on external data quality or licensing assumptions;
- the task may require more than one PR.

A meaningful audit/report should cover:

- goal and non-goals;
- current repo/file inventory;
- relevant Canon/WIP/Research sources;
- assumptions and risks;
- recommended technical execution slices;
- test or validation plan;
- explicit follow-up checklist.

## Product-Level Slice vs Technical Execution Slice

**Product-level slice**

A user-facing or spec-facing package of work. It often hides several technical decisions.

**Technical execution slice**

A small reviewable unit derived from audit/planning.

Rule:

Do not execute a product-level slice directly when it hides architecture, validation, sequencing, or data-policy decisions. First split it into technical execution slices.

## Start-of-Task Checklist

Before making changes:

1. Read `_working/ITERATION.md` for current phase context when the task is meaningful or non-trivial.
2. Identify Work Area and Tech Area.
3. State goal and non-goals.
4. Check relevant existing files.
5. Decide whether audit-first is required.
6. Choose correct file location.
7. Keep the change small and reviewable.
8. Confirm no raw/private data will be committed.

## PR / Branch Discipline

Unless explicitly stated otherwise:

- One issue = one branch = one PR.
- Always create the branch from up-to-date `main`.
- Branch naming convention: `issue/<number>-<short-slug>` when an issue exists; otherwise use `docs/<short-slug>`, `tool/<short-slug>`, `app/<short-slug>`, `chore/<short-slug>`, or another clear prefix.
- A PR must contain changes relevant to a single bounded task only.
- Substantial technical execution slices should open as Draft PRs by default.
- Never mix unrelated docs, tools, app code, and data changes in the same PR.

### Mandatory Branch Hygiene

Every new implementation issue or task **must** start from latest `origin/main`. Never branch from another issue branch.

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git checkout -b issue/<ISSUE_NUMBER>-<short-slug>
```

For no-issue tasks use an appropriate prefix instead of `issue/<NUMBER>`:

```bash
git checkout -b chore/<short-slug>
git checkout -b docs/<short-slug>
```

If a branch was accidentally created from another issue branch, rebase or cherry-pick onto `origin/main` before opening a PR. Push the rewritten branch with `--force-with-lease`:

```bash
git push origin <branch> --force-with-lease
```

### Pre-PR Sanity Check

Before opening a PR, run:

```bash
git fetch origin
git diff --stat origin/main...HEAD
git log --oneline origin/main..HEAD
```

The output must show only intended commits and intended files/areas.

If unrelated commits or files are present: stop, recreate the branch from `main`, and re-apply only the intended changes.

### Required PR Body Block

Every PR body must include this hygiene block:

```
Branch hygiene:
- Started from latest origin/main: yes
- Diff checked with origin/main...HEAD: yes
- PR contains only current task / issue changes: yes
```

- PR title and body must reference the issue number when an issue exists.
- For no-issue maintenance tasks, PR must state: `No issue — maintenance / workflow task`.
- PR body must include: what changed, validation evidence, boundary statement, branch hygiene block.

### Default PR Mechanics

Allowed when explicitly working in execution mode:

- push a branch;
- create a PR;
- mark a PR as draft;
- add a clear summary and validation notes.

Not allowed without explicit approval:

- merge PR;
- close PR;
- delete branches;
- force-push (use `--force-with-lease` only when branch was intentionally rewritten);
- rewrite shared history.

## Shared / High-Churn Document Workflow

Treat these as shared/high-churn docs:

- `CLAUDE.md`;
- `_working/ITERATION.md`;
- long-lived WIP product docs;
- Canon docs;
- active roadmap, milestone, or data-model docs.

Before editing shared/high-churn docs:

1. Fetch latest main:

```bash
git fetch origin main
```

2. Inspect recent changes to the target file:

```bash
git log -1 --oneline origin/main -- <path/to/file>
git log --oneline origin/main -5 -- <path/to/file>
```

3. Create branch from fresh main, not from another feature branch:

```bash
git checkout -b <branch> origin/main
```

4. Before opening PR, re-check whether main advanced in that file:

```bash
git fetch origin main
git log --oneline origin/main -3 -- <path/to/file>
```

If new commits touched the file, rebase or merge main and resolve conflicts before opening the PR.

## RoadAhead Product Boundaries

RoadAhead is a driver-awareness assistant. It is not:

- a navigator or turn-by-turn routing system;
- an anti-radar or radar-detector;
- a legal speed-limit authority;
- a safety-certified system.

### Forbidden wording and framing

Do not use any of the following in code, comments, UI, docs, or AI outputs:

- legal / fine / violation / infraction / capture;
- police / enforcement-certain / radar-detector;
- "will catch you", "will detect police", "legally binding speed limit".

### External event data policy

- External event data (Datakam, OpenSpeedcam, etc.) is **candidate input only**; it is not RoadAhead product truth.
- Raw Datakam / OpenSpeedcam data files must not be committed to the repo.
- Provider/API/network integration work is **forbidden** unless explicitly requested in a reviewed task.
- If provider data is ever permitted, it is geometry-only and must not become RoadAhead speed, ETA, traffic, or posting truth.

## Product Canon / WIP Boundary

- Product Canon lives under `docs/product/areas/`.
- Do not edit Product Canon files unless explicitly requested.
- WIP implementation, fixtures, scenario checks, and numeric tuning defaults are **not Canon**.
- No numeric tuning value may be promoted to Canon by implementation or tests alone; promotion requires an explicit decision.
- If WIP / research and Canon disagree, Canon wins.

## Phase 0 Emulator Validation

For any changes under `web/roadahead-emulator/`, run:

```bash
cd web/roadahead-emulator
npm run build
npm run scenario:sweep
```

Scenario sweep output is WIP validation evidence only. It is not a Canon validation gate.

For documentation-only or non-emulator changes, emulator build is not required.

## Scope Control

Implement only the current task. Do not:

- perform unrelated refactors;
- redesign UI areas outside the current task;
- add new dependencies without justification;
- introduce provider/API/network/raw datasets/Android overlay work unless explicitly requested.

When a task description is vague or could expand into adjacent areas, stop and clarify scope before proceeding.

## Cursor Prompt Contract

When writing or executing Cursor prompts, include:

1. **Model recommendation**  
   State the recommended model/mode and why.

2. **Goal**  
   State the bounded slice.

3. **Non-goals**  
   Explicitly state what must not be changed.

4. **Repo pointers**  
   List relevant files/folders to inspect.

5. **Plan**  
   Provide small ordered steps.

6. **Quality gates**  
   Define tests, visual checks, lint/build checks, or manual validation.

7. **Exit criteria**  
   State what must be true for the task to be considered done.

8. **Reporting requirement**  
   Ask Cursor to summarize changed files, assumptions, and remaining risks.

## Keeping This File Stable

Do not add temporary project state to this file.

Do not add:

- current milestone details;
- active issue plans;
- feature-specific task lists;
- temporary architecture experiments;
- source-specific parsing notes;
- implementation TODOs.

Put those in the appropriate docs, issue, PR, `_working/ITERATION.md`, or planning file instead.

Only update this file when the repository’s AI operating policy itself changes.