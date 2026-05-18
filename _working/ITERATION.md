RA-0003__POC_V1_Technical_Recommendations.v1

Work Area: Research / technical recommendations / documentation synthesis
Tech Area: RoadAhead POC V1, interactive web route emulator, direction applicability, route geometry provider feasibility, prepared event store, enforcement profile, threshold tuning strategy

Scope:
- Prepare technical/research recommendation documents for the open WIP questions called out in the POC V1 WIP spec and in Issue #20.
- Use the current reader-facing POC V1 WIP spec as source of truth; the companion decision workbook is rationale/input only.
- This iteration begins with the direction applicability / route-path applicability recommendation document.
- Other recommendation areas from Issue #20 (route geometry provider, prepared event store, enforcement profile, threshold tuning) remain in-scope for this overall iteration but are handled as separate small branches/PRs.
- Keep all output as Research, not Canon.
- Preserve unresolved technical/research questions as open items, with proposed starting defaults and validation needs for the web emulator.

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
3. Read the main WIP spec and the relevant research notes.
4. Write technical/research recommendation document(s) under docs/research/.
5. Start with the direction applicability / route-path applicability recommendation in a separate small PR.
6. Open follow-up small branches/PRs for the remaining Issue #20 topics as they are tackled.
7. Do not create Canon, decision records, implementation slices, implementation issues, or code changes in this iteration.

Definition of Done (per recommendation slice):
- One self-contained recommendation document under docs/research/, clearly marked Research / not Canon.
- Document distinguishes proposed starting defaults, rationale/tradeoffs, risks/unknowns, emulator validation needs, future strategy, and Canon-candidate vs WIP-tuning items.
- Cross-links to the main WIP spec, workbook, and relevant research notes.
- No raw data is committed.
- No code is changed.
- No Canon docs or decision records are created.
- No implementation issues are created.
- One issue = one branch = one PR; PR linked to #20; PR not merged by the assistant.

Notes:
- This file is phase context, not Canon.
- Durable product truth belongs in product WIP, Canon docs, decision records, issues, or PRs as appropriate.
- Update this file again when the recommendation work concludes and the project moves to Canon promotion or implementation slicing.
