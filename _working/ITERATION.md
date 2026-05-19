RA-0004__Product_Docs_Structure_for_Issue_21

Work Area: Documentation / governance
Tech Area: RoadAhead product documentation structure (status layers: WIP / Research / Canon / ADR), area-based Canon taxonomy, Cursor / AI work rules

Scope:
- Define the RoadAhead product documentation structure and rules for future Cursor / AI-assisted work, before Issue #21 starts promoting any stable POC V1 WIP decisions to Canon.
- Add a documentation-governance map at docs/product/README.md.
- Add an area-based Canon taxonomy and Canon area document template at docs/product/areas/README.md.
- Optionally add a short signpost README at docs/product/wip/README.md.
- Optionally update this iteration descriptor (this file) for the #21 documentation-structure step only.
- Suggest an Issue #21 Canon promotion tracker structure (per area) without editing the issue itself.
- Keep all output as documentation governance, not Canon, not Research, not WIP product truth.

Explicit non-scope:
- No Canon content promotion.
- No ADRs / decision records created.
- No edits to the WIP spec or any of the five Issue #20 recommendation docs (unless required to fix a broken link, which is not expected here).
- No code changes.
- No new dependencies.
- No raw or external data committed.
- No empty area folders created.
- No area Canon docs created.
- No edits to Issue #21 itself.
- No PR merge by the assistant.
- No closing of Issue #21.

Current product framing (unchanged from RA-0003):
- RoadAhead is an anticipatory road-understanding assistant.
- RoadAhead is not a navigator and not an anti-radar.
- POC V1 validates the three-circle UI and event/urgency behavior in an interactive web route emulator before Android overlay work.
- Datakam/OpenSpeedcam candidate events are not verified product truth.
- Direction applicability is route/path-based, not pure nearest-point lookup.
- Tuning values and safety-sensitive UX rules require validation evidence before Canon promotion.

Input artifacts (read-only for this iteration):
- CLAUDE.md (stable AI / Cursor operating rules).
- AGENTS.md (Cursor Cloud / dev-environment instructions).
- docs/product/wip/roadahead-poc-v1-three-circle-assistant.md (main WIP spec).
- docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md (companion rationale workbook).
- docs/research/roadahead-direction-applicability-recommendation.md
- docs/research/roadahead-route-geometry-provider-recommendation.md
- docs/research/roadahead-prepared-event-store-recommendation.md
- docs/research/roadahead-enforcement-profile-recommendation.md
- docs/research/roadahead-threshold-tuning-recommendation.md

Related issue:
- #21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records.

Related prior iteration:
- RA-0003 — Issue #20 WIP traceability follow-up (complete; merged via PR #27).

Order (this iteration):
1. Read CLAUDE.md and this iteration descriptor.
2. Read the main WIP spec and the five Issue #20 recommendation docs.
3. Create branch issue/21-product-docs-structure from fresh main.
4. Add docs/product/README.md (product documentation map and status-layer rules).
5. Add docs/product/areas/README.md (area-based Canon taxonomy, area document template, area split/merge/cross-link rules, Issue #21 promotion-tracker suggestion).
6. Add docs/product/wip/README.md (short WIP signpost).
7. Update this iteration descriptor for the #21 documentation-structure step.
8. Open a small documentation-only PR linked to Issue #21. Do not merge.

Definition of Done (this documentation-structure slice):
- docs/product/README.md exists and explains:
  - the four product documentation status layers (WIP / Research / Canon / ADR) plus the iteration context layer;
  - the WIP-to-Canon promotion rule (explicit PR; cited sources; validation evidence required for tuning and safety-sensitive UX);
  - the relationship between Canon and ADR;
  - Cursor / AI work rules for product docs (no generic canonN.md dumps; area-based Canon; do not silently resolve conflicts; do not promote without explicit review).
- docs/product/areas/README.md exists and:
  - defines docs/product/areas/ as the area-based Canon home;
  - provides an initial taxonomy (product-boundary, validation-emulator, route-geometry, event-data, event-applicability, speed-reference, feedback-and-enforcement, ui-model, tuning-and-validation), explicitly marked as initial / expected to evolve;
  - includes a Canon area document template;
  - documents the rules for splitting, merging, renaming, and cross-linking areas;
  - notes the Issue #21 Canon promotion tracker categories (pending / in review / promoted / kept WIP / blocked pending validation), without editing the issue.
- docs/product/wip/README.md exists as a short WIP signpost (added because two WIP files already live in this folder without one and a stable status signpost materially helps future contributors and Cursor agents identify the layer at a glance).
- _working/ITERATION.md (this file) is updated to RA-0004 for the documentation-structure iteration.
- No raw data committed.
- No code changed.
- No Canon docs or decision records created.
- No empty area folders created.
- No area Canon docs created.
- No implementation issues created.
- PR opened, linked to #21, not merged by the assistant. Issue #21 is not closed.

Notes:
- This file is phase context, not Canon.
- Durable product truth belongs in product WIP, Canon docs, decision records, issues, or PRs as appropriate.
- This iteration is the structural prerequisite for Issue #21 promotion work. Subsequent iterations under #21 will evaluate stable POC V1 WIP decisions per area and propose Canon / ADR PRs accordingly. Each subsequent Canon / ADR proposal is a separate, scoped iteration.
- Update this file again when the project moves to the first per-area Canon evaluation step under Issue #21.
