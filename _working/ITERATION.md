RA-0003__POC_V1_Technical_Recommendations.v2_traceability

Work Area: Research / technical recommendations / documentation synthesis
Tech Area: RoadAhead POC V1, interactive web route emulator, direction applicability, route geometry provider feasibility, prepared event store, enforcement profile, threshold tuning strategy

Scope:
- All five Issue #20 Research recommendation documents are complete and merged.
- This follow-up step links the five merged recommendation docs from the main POC V1 WIP spec by reference (traceability / incorporation PR).
- Keep all output as WIP / Research, not Canon.
- Preserve unresolved technical/research questions as open items; recommendations are inputs, not Canon resolutions.

Explicit non-scope:
- No code implementation.
- No app/viewer code changes (inspect only as useful background).
- No Android overlay work.
- No route provider integration.
- No Canon promotion.
- No ADR / decision record creation.
- No implementation issue creation.
- No implementation slicing.
- No committing raw Datakam/OpenSpeedcam or private GPS/location data.
- No treating Datakam/OpenSpeedcam or any external source as verified truth.
- No claim of legal speed-limit correctness.
- No turning RoadAhead into a navigator or anti-radar.

Current product framing (unchanged):
- RoadAhead is an anticipatory road-understanding assistant.
- RoadAhead is not a navigator and not an anti-radar.
- POC V1 validates the three-circle UI and event/urgency behavior before Android overlay work.
- The first validation target is an interactive web route emulator.
- Route providers may supply route geometry only; provider speed, ETA, and traffic speed are not RoadAhead speed truth.
- Simulated speed in the emulator is manually controlled.
- External road-event data is candidate input only.
- Datakam/OpenSpeedcam candidate events are not verified product truth.
- Direction applicability must be route/path-based, not pure nearest-point lookup.

Input artifacts:
- docs/product/wip/roadahead-poc-v1-three-circle-assistant.md (main WIP spec, wins over workbook on conflict)
- docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md (rationale/input history)
- docs/research/datakam-speedcam-format-and-route-qa.md
- docs/research/datakam-manual-visual-validation.md
- docs/research/datakam-manual-qa-status-semantics.md
- docs/research/datakam-road-bump-direction-semantics.md
- web/datakam-viewer/ (background only; existing direction display / DIRTYPE / DIRECTION semantics)
- tools/datakam/ (background only; current parsing assumptions)

Related issue:
- #20 — Prepare POC V1 technical recommendations for open WIP questions

Order (this iteration):
1. Read CLAUDE.md.
2. Read this iteration descriptor.
3. Read the main WIP spec and all five Issue #20 recommendation docs.
4. Create branch issue/20-wip-traceability-links from fresh main.
5. Add traceability links from the main WIP spec to the five recommendation docs.
6. Open a small documentation-only PR linked to Issue #20. Do not merge.
7. Do not create Canon, decision records, implementation slices, implementation issues, or code changes.

Definition of Done (this traceability slice):
- docs/product/wip/roadahead-poc-v1-three-circle-assistant.md updated with:
  - new "Technical recommendation inputs from Issue #20" subsection in Related WIP docs area;
  - compact recommendation input notes in §4, §8.3, §9, §11.6, §14.6;
  - updated §20.1–§20.5 noting recommendations are available (still WIP, not Canon);
  - new §20.8 "Future review path" note;
  - updated §24 (Related research) listing the five recommendation docs.
- _working/ITERATION.md updated to reflect the traceability follow-up step.
- No raw data committed.
- No code changed.
- No Canon docs or decision records created.
- No implementation issues created.
- PR opened, linked to #20, not merged by the assistant.

Notes:
- This file is phase context, not Canon.
- Durable product truth belongs in product WIP, Canon docs, decision records, issues, or PRs as appropriate.
- Update this file again when the project moves to Canon promotion or implementation slicing.
