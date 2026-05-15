# Claude / Cursor Instructions (RoadAhead)

## Role

Use AI assistants in this repository as planning, architecture, audit, and bounded execution partners.

AI may implement small, explicitly scoped changes when requested, but must not autonomously expand scope, refactor broadly, or convert product ideas into implementation requirements without an explicit plan.

## Project Identity

RoadAhead is an early-stage product and engineering prototype for an overlay assistant for anticipatory road understanding.

Core positioning:

> Not a navigator. Not an anti-radar. An overlay assistant for anticipatory road understanding.

Russian positioning:

> Не навигатор. Не антирадар. Overlay-ассистент упреждающего понимания дороги.

The product helps the driver understand what is coming ahead on the road before the situation changes: speed-limit changes, settlements, cameras, hazardous road segments, poor road surface, and hard-to-see signs.

## Always-on Invariants

Apply these invariants even when the current task does not explicitly mention them:

1. **External data is not truth.** Datakam/OpenSpeedcam, Driver Helper, Signsign, OSM, and similar sources are candidate inputs only.
2. **Verified RoadEvent is the trusted product layer.** External observations must be manually, visually, or field-verified before becoming trusted road events.
3. **WIP is not Canon.** Working notes and hypotheses are not implementation requirements until promoted to Canon or captured in an explicit decision.
4. **Do not build a navigator by accident.** Routing, turn-by-turn navigation, map replacement, or full navigation UX are out of scope unless explicitly approved.
5. **Do not build an anti-radar by accident.** Cameras are one road-event type, not the product identity.
6. **Driver safety dominates feature richness.** Any in-drive UI must be glanceable, low-distraction, and preferably one-tap.
7. **Private and external raw data stay local by default.** Do not commit full external datasets, personal GPS tracks, or private trip data unless explicitly approved.
8. **Direction matters.** Road events are often directional. Do not treat camera/sign points as directionless unless the source semantics or verification says so.

## Current Phase

Current milestone:

**MVP-001: Datakam regional web viewer**

Goal:

Build a local web viewer that loads a Datakam/OpenSpeedcam-style `speedcam` file, filters it to a familiar region, and visualizes road-event candidates on a map for manual visual QA.

This milestone is not about Android overlay implementation, navigation, routing, backend, accounts, or crowdsourcing.

## Primary Responsibilities

For AI-assisted work, prioritize:

- Product architecture and boundaries
- Data model design
- Road-event taxonomy
- Data-source analysis
- Documentation structure and canon discipline
- Small, reviewable implementation slices
- Test and validation planning
- Risk identification before implementation

## Forbidden Actions Unless Explicitly Asked

Do not do the following unless the user explicitly requests it:

- Make broad multi-file code changes.
- Refactor unrelated code.
- Mix refactor and behavior change in one step.
- Convert WIP notes into Canon.
- Treat external source data as verified product truth.
- Commit raw external datasets or personal GPS tracks.
- Add backend, accounts, sync, social/crowd features, or Android overlay code during the Datakam viewer milestone.
- Scrape, reverse engineer, or OCR third-party navigation apps.
- Add dependencies or frameworks without explaining why they are needed.
- Merge, close, or delete branches/PRs without explicit approval.
- Force-push without explicit approval.

## When to Stop

Stop and ask for direction or produce an audit/plan instead of implementing when:

- The task is ambiguous or can be solved in materially different ways.
- The requested work crosses product, data, UI, and implementation boundaries.
- The task would introduce new architecture or persistent data semantics.
- The task would commit or publish external/private data.
- The task requires changing Canon or promoting WIP to Canon.
- The task touches safety-critical driving UX.
- The task would require broad refactoring or unrelated cleanup.

Small obvious fixes may proceed directly when the path is genuinely unambiguous.

## RoadAhead Critical Zones

Changes in these areas require explicit plan or confirmation:

- RoadEvent canonical schema and semantics
- ExternalObservation schema and source normalization
- Datakam/OpenSpeedcam type/direction interpretation
- Direction matching and event-ahead logic
- Warning timing and comfortable deceleration model
- Driver-facing overlay UX and in-drive interactions
- Data-source licensing and repository data policy
- Any future Android background location / overlay permission behavior

## Data Policy

Use this pipeline:

```text
ExternalSource
  -> ExternalObservation
  -> manual / visual / field verification
  -> VerifiedRoadEvent
  -> warning layer
```

Rules:

- Preserve raw source fields when importing external data.
- Normalize type names separately from raw source type values.
- Keep source provenance: source name, source object id, import date, and raw payload/line when reasonable.
- Mark imported data as `external_candidate` by default.
- Do not show external candidates as trusted warnings unless explicitly enabled for test mode.
- Do not silently overwrite verified road events with external source data.
- Do not commit full external datasets to the repository.
- Do not commit personal GPS tracks, trip logs, or private location data.

## Work Area vs Tech Area

Classifier for where work lives is **Work Area**, not issue existence.

- **Work Area** = type of work: Product Specs WIP / Implementation / Docs / Test / Research / Org
- **Tech Area** = component or domain: Web Viewer / Data Import / RoadEvent Model / Android Overlay / UX / Backend / Documentation / Dev Workflow

### Routing Rules

Use these default locations once the folders exist:

- **Product Specs WIP**  
  Product options, hypotheses, road-event concepts, UX ideas, competitor/source research → `docs/product/wip/**`.  
  WIP is not implementation truth until promoted.

- **Canon**  
  Stable product definitions, accepted data models, warning principles, and implementation-facing product truth → `docs/product/areas/**` or another explicit Canon location.

- **Decisions**  
  ADR-style decisions and tradeoffs → `docs/decisions/**`.

- **Research**  
  Durable external source analysis, format notes, and licensing notes → `docs/research/**`.

- **Implementation**  
  Source code, tools, schemas, and app code → relevant source folders. Temporary implementation notes may use `_working/**` if the directory exists.

- **Test / Validation**  
  Temporary logs and local experiments → `_working/**` or local untracked files. Durable validation reports → tracked docs.

- **Org / Process**  
  Repo workflow, AI instructions, planning rules → root docs, `docs/dev/**`, or `CLAUDE.md`.

## `_working/` Policy

`_working/` is an ephemeral sandbox only.

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
- personal GPS tracks if the repository is public or the file may be accidentally committed.

Durable outputs belong in tracked docs or GitHub issues/PRs, not in `_working/`.

## Audit-First Before Implementation

Audit-first is mandatory when any of the following is true:

- The task is a product behavior slice rather than a narrow code edit.
- The task touches data semantics, source interpretation, or schemas.
- The task spans multiple files or layers.
- The task affects driver-facing UX or warning behavior.
- The task depends on external data quality or licensing assumptions.
- The task may require more than one PR.

A meaningful audit/report should cover:

- goal and non-goals;
- current repo/file inventory;
- relevant Canon/WIP/Research sources;
- data/source assumptions;
- risks and ambiguity;
- recommended technical execution slices;
- test or visual validation plan;
- explicit follow-up checklist.

## Product-Level Slice vs Technical Execution Slice

**Product-level slice**

A user-facing or spec-facing package of work, such as:

- Datakam regional viewer;
- personal road-event layer;
- Android overlay warning mode;
- comfortable deceleration planner.

**Technical execution slice**

A small reviewable unit derived from audit/planning, such as:

- parse Datakam format;
- render points on a map;
- add bbox filtering;
- export GeoJSON;
- define ExternalObservation schema;
- write validation report for a familiar region.

Rule:

Do not execute a product-level slice directly when it hides architecture, validation, sequencing, or data-policy decisions. First split it into technical execution slices.

## Start-of-Task Checklist

Before making changes:

1. Identify Work Area and Tech Area.
2. State goal and non-goals.
3. Check relevant existing files.
4. Decide whether audit-first is required.
5. Choose correct file location.
6. Keep the change small and reviewable.
7. Confirm no raw/private data will be committed.

## PR / Branch Discipline

Unless explicitly stated otherwise:

- One issue = one branch = one PR.
- Always create the branch from up-to-date `main`.
- Branch naming convention: `issue/<number>-<short-slug>` when an issue exists; otherwise use `docs/<short-slug>`, `tool/<short-slug>`, or `viewer/<short-slug>`.
- A PR must contain changes relevant to a single bounded task only.
- Substantial technical execution slices should open as Draft PRs by default.
- Never mix unrelated docs, tools, app code, and data changes in the same PR.

### Pre-PR Sanity Check

Before opening a PR, run:

```bash
git log --oneline main..HEAD
git diff --stat main..HEAD
```

The output must show only intended commits and intended files/areas.

If unrelated commits or files are present: stop, recreate the branch from `main`, and re-apply only the intended changes.

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
- force-push;
- rewrite shared history.

## Shared / High-Churn Document Workflow

Treat these as shared/high-churn docs:

- `CLAUDE.md`;
- long-lived WIP product docs under `docs/product/wip/**`;
- Canon docs under `docs/product/areas/**`;
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

## Current First Deliverable

First deliverable remains:

**Datakam regional web viewer**

It should eventually:

1. Load a local Datakam/OpenSpeedcam `speedcam` text file.
2. Parse `IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION`.
3. Treat `X` as longitude and `Y` as latitude.
4. Preserve raw fields.
5. Normalize event type separately from raw `TYPE`.
6. Filter by bounding box.
7. Render points on a map.
8. Show event details in popup.
9. Show direction arrows for directional events.
10. Export filtered GeoJSON.

Do not implement Android, backend, accounts, sync, or crowd features as part of this first deliverable.
