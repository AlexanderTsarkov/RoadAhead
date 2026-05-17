RA-0002__POC_V1_WIP_Spec_Revision.v1

Work Area: Product Specs WIP / documentation synthesis / technical-research framing
Tech Area: RoadAhead POC V1, three-circle UI, interactive web route emulator, Datakam/OpenSpeedcam candidate data, event selection, UX state model, data preparation, direction applicability

Scope:
- Revise the RoadAhead POC V1 WIP spec using the current decision workbook.
- Use the existing baseline WIP spec as the main product WIP artifact.
- Integrate accepted working decisions from the initial product decisions workbook.
- Keep the output as WIP, not Canon.
- Clarify the POC V1 validation target: interactive web route emulator first.
- Clarify event selection, speed urgency, pass feedback, camera feedback, data preparation, and direction applicability.
- Preserve unresolved technical/research questions as open items for recommendation and later validation.
- Prepare documentation so later Canon promotion and implementation slicing can happen deliberately.

Explicit non-scope:
- No code implementation.
- No Android overlay implementation.
- No backend, accounts, sync, cloud, or community validation implementation.
- No Canon promotion.
- No decision record creation.
- No implementation issue creation.
- No committing raw Datakam/OpenSpeedcam data or private GPS/location data.
- No treating Datakam/OpenSpeedcam or any external source as verified truth.
- No turning RoadAhead into a navigator or anti-radar.

Current product framing:
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
- docs/product/wip/roadahead-poc-v1-three-circle-assistant.md
- docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md

Related issue:
- #17 — Planning tracker for RoadAhead POC V1 WIP revision, decisions, and later implementation slices

Order:
1. Read CLAUDE.md.
2. Read this iteration descriptor.
3. Read the baseline WIP spec.
4. Read the initial product decisions workbook.
5. Revise the baseline WIP spec into a clearer updated WIP spec.
6. Add reciprocal cross-links between the WIP spec and workbook.
7. Keep remaining technical/research questions explicit.
8. Do not create Canon, implementation slices, implementation issues, or code changes in this iteration.

Definition of Done:
- The main POC V1 WIP spec reflects the accepted working decisions from the workbook.
- The decision workbook remains available as a companion WIP input document.
- Internal relative links between the two WIP docs work.
- The updated WIP spec clearly separates:
  - accepted working decisions;
  - open technical/research questions;
  - future/post-POC ideas;
  - explicit non-scope.
- No raw data is committed.
- No code is changed.
- No Canon docs or decision records are created.
- No implementation issues are created.
- The next step after review is clear: decide what is stable enough for Canon, then only later slice implementation.

Notes:
- This file is phase context, not Canon.
- Durable product truth belongs in product WIP, Canon docs, decision records, issues, or PRs as appropriate.
- Update this file again when the project moves from WIP revision to Canon promotion or implementation slicing.
