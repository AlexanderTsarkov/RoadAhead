RA-0008__Issue_17_Web_Emulator_Implementation_Planning

Work Area: Documentation / Implementation planning (no code yet)
Tech Area: RoadAhead Phase 0 — interactive web route emulator (POC V1)

## Sprint goal

Turn the now-complete area-based Product Canon into a small, reviewable sequence
of implementation slices for the **Phase 0 interactive web route emulator**, under
Issue #17.

This is a **planning / dispatch sprint**. It does not implement the emulator.
It produces:

- a recommended emulator path decision (evolve `web/datakam-viewer` or new app);
- a drafted first minimal vertical slice;
- drafted fixture contracts (prepared events, route geometry, emulator tuning
  config) at the planning level only;
- a drafted sequence of follow-up implementation issues with dependency order
  and acceptance criteria;
- explicit labeling of which numeric values may be used as WIP emulator defaults
  vs which remain WIP-only and may not be promoted to Canon without validation.

## Umbrella issue

- [#17 — Plan RoadAhead POC V1 web emulator implementation slices from Product Canon](https://github.com/AlexanderTsarkov/RoadAhead/issues/17)

Issue #17 is the **umbrella / dispatcher / progress tracker** for the Phase 0
web emulator implementation work. Implementation itself happens in sub-issues
and their PRs; #17 itself does not contain the implementation work directly.

## Related completed prerequisites

- Issue #20 — five technical recommendation docs merged under `docs/research/`.
- Issue #21 — area-based Product Canon promoted; all nine planned areas merged:
  - `product-boundary` (PR #30),
  - `validation-emulator` (PR #31),
  - `route-geometry` (PR #33),
  - `event-data` (PR #34),
  - `event-applicability` (PR #35),
  - `speed-reference` (PR #36),
  - `feedback-and-enforcement` (PR #37),
  - `ui-model` (PR #38),
  - `tuning-and-validation` (PR #39, methodology-only; no numeric values promoted).
- Issue #21 is closed. No numeric tuning values are Product Canon at this stage.

## Source of truth

Product Canon (primary authority for stable product behavior):

- `docs/product/areas/product-boundary/product-boundary.md`
- `docs/product/areas/validation-emulator/validation-emulator.md`
- `docs/product/areas/route-geometry/route-geometry.md`
- `docs/product/areas/event-data/event-data.md`
- `docs/product/areas/event-applicability/event-applicability.md`
- `docs/product/areas/speed-reference/speed-reference.md`
- `docs/product/areas/feedback-and-enforcement/feedback-and-enforcement.md`
- `docs/product/areas/ui-model/ui-model.md`
- `docs/product/areas/tuning-and-validation/tuning-and-validation.md`

Documentation governance:

- `docs/product/README.md` — status-layer rules and Canon promotion rule.
- `docs/product/areas/README.md` — area taxonomy and Canon area template.
- `docs/product/wip/README.md` — WIP folder signpost.
- `CLAUDE.md` — stable AI / Cursor operating rules.
- `AGENTS.md` — Cursor Cloud / dev-environment instructions.

Secondary source material (WIP and research; input only, not stable product truth):

- `docs/product/wip/roadahead-poc-v1-three-circle-assistant.md`
- `docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`
- `docs/research/roadahead-direction-applicability-recommendation.md`
- `docs/research/roadahead-route-geometry-provider-recommendation.md`
- `docs/research/roadahead-prepared-event-store-recommendation.md`
- `docs/research/roadahead-enforcement-profile-recommendation.md`
- `docs/research/roadahead-threshold-tuning-recommendation.md`

Planning input for this sprint:

- `docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md` —
  planning doc drafted this sprint; not Canon, not implementation truth, not
  durable product truth.

If WIP / research and Canon disagree, **Canon wins**.

## Sprint scope

- Decide the Phase 0 emulator path (evolve `web/datakam-viewer` vs new
  `web/roadahead-emulator`) at the planning level.
- Draft the first minimal vertical slice for the route-known emulator.
- Draft principle-level fixture contracts for prepared candidate events,
  route geometry, and emulator tuning config.
- Draft the initial sequence of follow-up implementation issues, including
  acceptance criteria and dependency order.
- Identify which numeric values are usable as **WIP emulator defaults** and
  must remain labeled non-Canon.
- Keep Issue #17 updated as the umbrella / dispatcher / progress tracker.

## Sprint non-scope

- No emulator code, no fixture data, no provider integration in this sprint.
- No raw Datakam / OpenSpeedcam data commits.
- No Product Canon edits.
- No WIP spec rewrites (the WIP spec already cites the Issue #20 recommendations
  and the Canon area docs).
- No automatic promotion of numeric values to Canon.
- No Android overlay or standalone Android work (deferred per `validation-emulator`
  truths 2 and 5).
- No legal / safety / human-factors claims (per `tuning-and-validation` truth 9).
- No closure of Issue #17 (umbrella stays open across implementation slices).
- No per-PR rewriting of this file (`_working/ITERATION.md`).

## Recommended next step

After this planning PR merges, the next step is the first implementation slice
inside the Phase 0 web emulator track. The currently recommended first
implementation issue is:

> **App baseline / emulator path decision** — decide whether Phase 0 evolves
> `web/datakam-viewer` or creates a separate `web/roadahead-emulator` app, and
> set up the chosen baseline. No three-circle behavior, no fixtures, no
> applicability code — only the baseline.

Subsequent slices, dependency order, and acceptance criteria live in the planning
doc and in Issue #17's tracker section.

## Cursor / AI rules for this sprint

- Read `CLAUDE.md` and this file first.
- Read the Canon area doc(s) relevant to any task before reading WIP / research.
- Treat Product Canon as the primary authority; WIP / research are inputs.
- Treat this file as **sprint context**, not a per-PR task file. Do not rewrite
  it for each implementation slice. Per-slice tracking belongs on Issue #17.
- Per-PR summaries and final reports go in the PR body / comments — not here.
- Do not promote any numeric value to Canon. Numeric values from research
  recommendations are WIP emulator defaults only.
- Do not commit raw external data.
- Do not introduce backend, accounts, sync, cloud storage, or telemetry
  infrastructure without an explicit reviewed PR.
- If a requested task does not fit this sprint, stop and ask.

## Sprint Definition of Done

- Phase 0 emulator path decision drafted (planning level).
- First minimal vertical slice defined.
- Fixture contracts drafted at the planning level.
- Initial implementation-issue sequence drafted with dependency order and
  acceptance criteria.
- WIP emulator defaults explicitly labeled non-Canon in the planning doc.
- Issue #17 updated with an umbrella / dispatcher / progress tracker section.
- `_working/ITERATION.md` updated from RA-0007 to this RA-0008 sprint descriptor.
- No code, no fixtures, no Canon edits, no numeric promotions, no raw data
  commits in this planning PR.

## Historical note

RA-0007 covered the Issue #21 Canon Promotion Sprint (all nine area-based Canon
docs promoted). RA-0007 is now complete. RA-0008 supersedes it as the active
sprint-level descriptor and points at Issue #17 as the next umbrella issue.
RA-0005 and RA-0006 were per-area descriptors superseded by the sprint-level
RA-0007 model and remain superseded under RA-0008.
