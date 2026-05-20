RA-0006__Validation_Emulator_Canon_Promotion_for_Issue_21

Work Area: Documentation / Product Canon
Tech Area: RoadAhead Product Canon — `validation-emulator` area (second area-based Canon promotion under Issue #21)

Scope:
- Promote stable RoadAhead validation-emulator truths to Product Canon under `docs/product/areas/validation-emulator/`.
- Add a single Canon area document at `docs/product/areas/validation-emulator/validation-emulator.md`, following the Canon area template from `docs/product/areas/README.md`.
- Cite the existing product-boundary Canon doc, the WIP spec, the companion workbook, the five Issue #20 research recommendation docs, and Issue #21 as sources.
- Cross-link the existing `product-boundary` Canon area and the other planned areas (`route-geometry`, `event-data`, `event-applicability`, `speed-reference`, `feedback-and-enforcement`, `ui-model`, `tuning-and-validation`) by name. The existing `product-boundary` Canon doc is linked directly; planned areas that do not exist yet are referenced via `../README.md` only, per the area README rule "do not pre-link to areas that have not been created".
- Update this iteration descriptor to reflect the second per-area Canon promotion step under Issue #21.

Explicit non-scope:
- No code changes.
- No dependencies added.
- No raw or external data committed.
- No WIP spec edits.
- No edits to the companion workbook.
- No edits to any of the five Issue #20 research recommendation docs.
- No edits to `docs/product/README.md`, `docs/product/areas/README.md`, or `docs/product/wip/README.md`.
- No edits to the existing `docs/product/areas/product-boundary/product-boundary.md` Canon doc.
- No ADRs / decision records created (`docs/decisions/` is not created in this PR).
- No new area Canon docs other than `validation-emulator`.
- No empty area folders created for other planned areas.
- No promotion of route provider choice, exact route geometry contract, prepared event store schema/engine, event applicability algorithm, speed-reference state machine details, exact pass-feedback / enforcement-profile values (including Russia +20 km/h), exact threshold tuning values, exact emulator UI layout / debug field list / speed-control mechanics, Android overlay UX or implementation, or any other implementation-specific detail to Canon.
- No legal-correctness claim about any speed limit, jurisdiction profile, or real-world safety validation.
- No edits to Issue #21 itself.
- No merge of the resulting PR by the assistant.
- No closing of Issue #21.

Current product framing (unchanged from RA-0005; restated here for orientation only — durable framing lives in the Canon doc this iteration produces and in the existing `product-boundary` Canon doc):
- RoadAhead is an anticipatory road-understanding assistant.
- RoadAhead is not a navigator and not an anti-radar.
- POC V1 validates driver-facing behavior in an interactive web route emulator before Android overlay work; the emulator is a deliberate product/testing artifact, not the eventual delivery surface.
- Route-known mode is the primary POC V1 validation mode; route-unknown / no-route mode is future strategy only.
- Datakam / OpenSpeedcam candidate events are not verified product truth.
- Tuning values and safety-sensitive UX rules require validation evidence before Canon promotion.

Input artifacts (read-only for this iteration):
- `CLAUDE.md` (stable AI / Cursor operating rules).
- `AGENTS.md` (Cursor Cloud / dev-environment instructions).
- `docs/product/README.md` (documentation map and status-layer rules).
- `docs/product/areas/README.md` (area-based Canon taxonomy and area document template).
- `docs/product/wip/README.md` (WIP signpost).
- `docs/product/areas/product-boundary/product-boundary.md` (existing Canon area; the boundary-level commitments this iteration refines at the validation-surface level).
- `docs/product/wip/roadahead-poc-v1-three-circle-assistant.md` (main WIP spec).
- `docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md` (companion rationale workbook).
- `docs/research/roadahead-direction-applicability-recommendation.md`.
- `docs/research/roadahead-route-geometry-provider-recommendation.md`.
- `docs/research/roadahead-prepared-event-store-recommendation.md`.
- `docs/research/roadahead-enforcement-profile-recommendation.md`.
- `docs/research/roadahead-threshold-tuning-recommendation.md`.

Related issue:
- #21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records.

Related prior iterations:
- RA-0003 — Issue #20 WIP traceability follow-up (complete; merged via PR #27).
- RA-0004 — Product documentation structure for Issue #21 (complete; merged via PR #29).
- RA-0005 — Product-boundary Canon promotion under Issue #21 (complete; merged via PR #30).

Order (this iteration):
1. Read `CLAUDE.md`, `AGENTS.md`, this iteration descriptor, and the documentation governance docs (`docs/product/README.md`, `docs/product/areas/README.md`, `docs/product/wip/README.md`).
2. Re-read the existing `product-boundary` Canon doc, the WIP spec, the companion workbook, and the five Issue #20 research recommendation docs to identify validation-emulator truths that are stable enough for Canon and to separate them from route-provider / event-algorithm / UI-layout / tuning / legal claims that must remain WIP.
3. Create branch `issue/21-validation-emulator-canon` from fresh `main`.
4. Update this iteration descriptor (this file) for the second per-area Canon promotion step under Issue #21.
5. Add `docs/product/areas/validation-emulator/validation-emulator.md` following the Canon area template from `docs/product/areas/README.md`.
6. Run the pre-PR sanity check (`git log --oneline main..HEAD`; `git diff --stat main..HEAD`).
7. Open a small documentation-only PR linked to Issue #21. Do not merge. Do not close Issue #21.

Definition of Done (this validation-emulator Canon promotion slice):
- `docs/product/areas/validation-emulator/validation-emulator.md` exists and:
  - uses the Canon area template frontmatter from `docs/product/areas/README.md`, with `status: Product Canon`, `canon: true`, `area: validation-emulator`, today's date in `last_reviewed`, and a `source` list that includes the existing `product-boundary` Canon doc, the WIP spec, the companion workbook, the five Issue #20 research recommendation docs, and Issue #21;
  - has a `Purpose` section that frames the area as the POC V1 validation surface — the interactive web route emulator used to validate RoadAhead driver-facing behavior before Android overlay or mobile delivery work — and clarifies that the emulator is a first-class product/testing artifact, not a throwaway toy, but is not the eventual delivery surface;
  - has a `Canon truths` section that promotes only stable validation-emulator truths (POC V1 validation starts with the interactive web route emulator; the emulator validates driver-facing event / urgency behavior before Android overlay or standalone Android prototype work; the emulator is a first-class product/testing artifact, not the delivery surface; route-known mode is the primary POC V1 validation mode; route-unknown / no-route mode is future strategy only; the emulator may simulate route progress and use deterministic / manually controlled speed; the emulator may expose richer debug and tuning information than the future driver-facing surface; emulator-visible debug data does not imply driver-facing display; candidate external event data is candidate input, not verified truth; the emulator validates behavior and product assumptions and does not itself Canonize tuning values, provider choices, event algorithms, or legal claims);
  - has a `Scope` section covering the web emulator as POC V1 validation surface, route-known validation mode, simulated route progress / speed control at principle level, debug / tuning visibility as validation support, separation between emulator-visible debug and driver-facing UI, and the relation to the existing `product-boundary` Canon area;
  - has a `Non-goals` section that explicitly lists items that belong in other areas or remain WIP (Android overlay implementation, standalone Android prototype implementation, route provider API choice, route geometry contract details, event data store schema, event applicability algorithm, speed-reference state machine details, feedback / enforcement profile details, exact threshold tuning values, final production UI layout, legal / safety certification);
  - has a `Product rules` section that derives implementation-facing product rules from the Canon truths (POC V1 implementation slicing should start from emulator behavior, not Android overlay; emulator design must support route-known validation first; emulator may include controls and debug panels inappropriate for driver-facing mobile UX; debug visibility must not be mistaken for driver-facing eligibility; emulator fixtures and candidate data must preserve candidate / non-truth labeling; scenario sweeps may use the emulator to generate validation evidence, but evidence must be recorded before tuning values become Canon; Android-specific assumptions must not be inferred from emulator-only behavior);
  - has an `Implementation-facing implications` section that stays stable and high-level (implementation issues for POC V1 target web emulator behavior before mobile / overlay work; the emulator should make relevant internal state inspectable for QA / tuning, but specific debug fields belong in more specific areas; route geometry / event data / applicability / feedback / tuning details cite the relevant area / WIP / research docs; emulator validation outputs can inform future Canon / ADR but do not automatically promote values to Canon);
  - has a mandatory `Still WIP / not Canon` section listing items that remain WIP (exact route provider and API; exact route geometry data contract; exact emulator UI layout and controls; exact debug field list; exact speed control mechanics; exact event applicability thresholds; exact feedback / tuning values; exact scenario sweep matrix and acceptance criteria; Android overlay UX / permissions / lifecycle; production mobile architecture; real-world safety / legal validation);
  - has a mandatory `Source traceability` section that links each Canon truth back to source material (product-boundary Canon where relevant; main WIP spec; companion workbook where relevant; Issue #20 recommendation docs where relevant; Issue #21) without vague "see WIP spec";
  - has a `Related areas` section that cross-links the existing `product-boundary` Canon area directly and references the other planned areas (`route-geometry`, `event-data`, `event-applicability`, `speed-reference`, `feedback-and-enforcement`, `ui-model`, `tuning-and-validation`) by name via `../README.md`, per the area README rule "do not pre-link to areas that have not been created".
- This iteration descriptor (`_working/ITERATION.md`) is updated to RA-0006 for the validation-emulator Canon promotion step.
- No code changed; no dependencies changed; no raw data committed; no WIP / Research / governance docs edited; no existing Canon doc edited; no Issue #21 body edited.
- No empty area folders created for other planned areas.
- No ADRs created; no implementation issues created; no implementation slicing performed.
- One area only: `validation-emulator`.
- PR opened, linked to Issue #21, not merged by the assistant. Issue #21 is not closed.

Notes:
- This file is phase context, not Canon.
- Durable product truth lives in the Canon doc created by this iteration, in the existing `product-boundary` Canon doc, and in the WIP / Research / future ADR docs they cite — not in this file.
- This iteration is the second per-area Canon promotion under Issue #21. Subsequent per-area iterations under Issue #21 (e.g., `event-applicability`, `route-geometry`) will each be scoped and tracked in their own iteration descriptor.
- Update this file again when the project moves to the next per-area Canon evaluation step under Issue #21.
