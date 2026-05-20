RA-0007__Issue_21_Canon_Promotion_Sprint

Work Area: Documentation / Product Canon
Tech Area: RoadAhead Product Canon — Issue #21 sprint (all area-based Canon promotions)

## Sprint goal

Promote stable RoadAhead POC V1 WIP decisions to area-based Product Canon and/or ADRs,
area by area, under Issue #21.

## Umbrella issue

- [#21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records](https://github.com/AlexanderTsarkov/RoadAhead/issues/21)

## Related completed prerequisites

- Issue #20 technical recommendations completed (five research recommendation docs merged).
- PR #29 — documentation governance / area-based Canon structure merged.
- PR #30 — `product-boundary` Canon promotion merged.
- PR #31 — `validation-emulator` Canon promotion merged.
- PR (this one) — iteration descriptor process clarified; sprint-level RA-0007 descriptor created.

## Source of truth

- `CLAUDE.md` — stable AI / Cursor operating rules (updated this sprint to clarify iteration descriptor policy).
- `AGENTS.md` — Cursor Cloud / dev-environment instructions.
- `docs/product/README.md` — documentation map and status-layer rules.
- `docs/product/areas/README.md` — area-based Canon taxonomy and Canon doc template.
- `docs/product/wip/README.md` — WIP signpost.
- `docs/product/areas/product-boundary/product-boundary.md` — promoted Canon area.
- `docs/product/areas/validation-emulator/validation-emulator.md` — promoted Canon area.
- `docs/product/wip/roadahead-poc-v1-three-circle-assistant.md` — main WIP spec.
- `docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md` — companion rationale workbook.
- `docs/research/roadahead-direction-applicability-recommendation.md`
- `docs/research/roadahead-route-geometry-provider-recommendation.md`
- `docs/research/roadahead-prepared-event-store-recommendation.md`
- `docs/research/roadahead-enforcement-profile-recommendation.md`
- `docs/research/roadahead-threshold-tuning-recommendation.md`
- Issue #21 tracker (canonical per-area status lives there; do not duplicate the full tracker here).

## Sprint scope

- Evaluate stable decisions area by area using the area taxonomy in `docs/product/areas/README.md`.
- Create small area-based Canon PRs (one area per PR as the default).
- Create ADRs only when explicitly scoped.
- Keep Issue #21 tracker updated after each area is merged.
- Keep unresolved tuning / implementation / legal / algorithmic details WIP or Research.

## Sprint non-scope

- No implementation.
- No raw data commits.
- No Android overlay work.
- No web emulator implementation.
- No automatic whole-WIP promotion.
- No tuning values without validation evidence.
- No legal/safety certification claims.
- No per-slice rewriting of this file (`_working/ITERATION.md`).

## Current promotion tracker summary

Canonical tracker lives in Issue #21. Compact summary as of this descriptor:

| Area | Status |
|---|---|
| `product-boundary` | promoted — PR #30 |
| `validation-emulator` | promoted — PR #31 |
| `route-geometry` | pending — recommended next after this process PR |
| `event-data` | pending |
| `event-applicability` | pending |
| `speed-reference` | pending |
| `feedback-and-enforcement` | pending |
| `ui-model` | pending |
| `tuning-and-validation` | blocked pending validation / methodology split decision |

## Current next step

Continue Issue #21 with the next area Canon promotion: likely `route-geometry`.

## Cursor / AI rules for this sprint

- Read `CLAUDE.md` and this file first.
- Treat this file as sprint context, not a per-PR task file.
- Do not rewrite this file for each area PR.
- If a requested task does not fit this sprint, stop and ask.
- Durable product truth goes to Canon / WIP / Research / ADR — not here.
- PR summaries and final reports go in the PR body / comments — not here.

## Sprint Definition of Done

- Stable areas promoted or explicitly kept WIP with a stated reason.
- Blocked items marked in Issue #21 tracker.
- ADR candidates identified and either created or deferred explicitly.
- Issue #17 updated if still required after promotions are complete.
- Project ready for implementation slicing of the web route emulator in follow-up issues.

## Historical note

RA-0005 and RA-0006 were per-area descriptors created before this policy was clarified.
This RA-0007 descriptor supersedes them with a sprint-level model for the rest of Issue #21.
Do not revert to per-area iteration descriptors for subsequent Canon promotion slices within this sprint.
