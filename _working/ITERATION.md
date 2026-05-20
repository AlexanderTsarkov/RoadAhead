RA-0005__Product_Boundary_Canon_Promotion_for_Issue_21

Work Area: Documentation / Product Canon
Tech Area: RoadAhead Product Canon — `product-boundary` area (first area-based Canon promotion under Issue #21)

Scope:
- Promote stable RoadAhead product-boundary truths to Product Canon under `docs/product/areas/product-boundary/`.
- Add a single Canon area document at `docs/product/areas/product-boundary/product-boundary.md`, following the Canon area template from `docs/product/areas/README.md`.
- Cite the WIP spec, the companion workbook, the five Issue #20 research recommendation docs, and Issue #21 as sources.
- Cross-link planned areas (`validation-emulator`, `route-geometry`, `event-data`, `event-applicability`, `speed-reference`, `feedback-and-enforcement`, `ui-model`, `tuning-and-validation`) by name; do not link to area folders that do not exist yet.
- Update this iteration descriptor to reflect the first per-area Canon promotion step under Issue #21.

Explicit non-scope:
- No code changes.
- No dependencies added.
- No raw or external data committed.
- No WIP spec edits.
- No edits to the companion workbook.
- No edits to any of the five Issue #20 research recommendation docs.
- No edits to `docs/product/README.md`, `docs/product/areas/README.md`, or `docs/product/wip/README.md`.
- No ADRs / decision records created (`docs/decisions/` is not created in this PR).
- No new area Canon docs other than `product-boundary`.
- No empty area folders created for other planned areas.
- No promotion of tuning values, threshold defaults, route/event algorithm details, route provider choice, event schema, enforcement profile values (including Russia +20 km/h), Datakam `DIRECTION` interpretation details, Android overlay scope, or any other implementation-specific detail to Canon.
- No legal-correctness claim about any speed limit or jurisdiction profile.
- No edits to Issue #21 itself.
- No merge of the resulting PR by the assistant.
- No closing of Issue #21.

Current product framing (unchanged from RA-0004; restated here for orientation only — durable framing lives in the Canon doc this iteration produces):
- RoadAhead is an anticipatory road-understanding assistant.
- RoadAhead is not a navigator and not an anti-radar.
- POC V1 validates driver-facing behavior in an interactive web route emulator before Android overlay work.
- Datakam / OpenSpeedcam candidate events are not verified product truth.
- Tuning values and safety-sensitive UX rules require validation evidence before Canon promotion.

Input artifacts (read-only for this iteration):
- `CLAUDE.md` (stable AI / Cursor operating rules).
- `AGENTS.md` (Cursor Cloud / dev-environment instructions).
- `docs/product/README.md` (documentation map and status-layer rules).
- `docs/product/areas/README.md` (area-based Canon taxonomy and area document template).
- `docs/product/wip/README.md` (WIP signpost).
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

Order (this iteration):
1. Read `CLAUDE.md`, `AGENTS.md`, this iteration descriptor, and the documentation governance docs (`docs/product/README.md`, `docs/product/areas/README.md`, `docs/product/wip/README.md`).
2. Re-read the WIP spec, the companion workbook, and the five Issue #20 research recommendation docs to identify product-boundary truths that are stable enough for Canon and to separate them from tuning / implementation / legal claims that must remain WIP.
3. Create branch `issue/21-product-boundary-canon` from fresh `main`.
4. Update this iteration descriptor (this file) for the first per-area Canon promotion step under Issue #21.
5. Add `docs/product/areas/product-boundary/product-boundary.md` following the Canon area template from `docs/product/areas/README.md`.
6. Run the pre-PR sanity check (`git log --oneline main..HEAD`; `git diff --stat main..HEAD`).
7. Open a small documentation-only PR linked to Issue #21. Do not merge. Do not close Issue #21.

Definition of Done (this product-boundary Canon promotion slice):
- `docs/product/areas/product-boundary/product-boundary.md` exists and:
  - uses the Canon area template frontmatter from `docs/product/areas/README.md`, with `status: Product Canon`, `canon: true`, `area: product-boundary`, today's date in `last_reviewed`, and a `source` list that includes the WIP spec, the companion workbook, the five Issue #20 research recommendation docs, and Issue #21;
  - has a `Purpose` section that frames the area as RoadAhead's identity and non-claims;
  - has a `Canon truths` section that promotes only stable product-boundary truths (product identity, navigator non-goal, anti-radar non-goal, legal-correctness non-claim, safety-certification non-claim, external-data candidate boundary, web-emulator validation boundary, route-provider geometry-only boundary, conservative posture under ambiguity);
  - has a `Scope` section covering product identity, product non-goals, legal / safety non-claims, external-data truth boundary, high-level POC validation boundary, and conservative ambiguity posture;
  - has a `Non-goals` section that explicitly lists the items that belong in other areas or remain WIP (route geometry provider selection details, event data schema, event applicability algorithm, speed-reference state machine details, pass-feedback / camera-risk behavior details, threshold tuning, UI layout details, implementation slicing, legal interpretation by jurisdiction);
  - has a `Product rules` section that derives implementation-facing rules from the Canon truths (no navigator language, no anti-radar / fine-avoidance language, no presenting external candidate data as verified truth, no presenting provider speed / ETA / traffic speed as RoadAhead truth, conservative posture when applicability or data truth is ambiguous, advisory framing for legal / safety-sensitive language);
  - has an `Implementation-facing implications` section that stays stable and high-level (UI copy boundaries, debug visibility for suppressed / ambiguous candidates, citation rule for slice details, emulator-uses-candidate-data-as-non-truth);
  - has a mandatory `Still WIP / not Canon` section listing items that remain WIP (exact event applicability thresholds, route projection / branch ambiguity heuristics, final route provider choice, prepared event store engine / schema details, exact enforcement profiles and legal verification, exact threshold tuning values, Android overlay UX and implementation, future `VerifiedRoadEvent` lifecycle, jurisdiction-specific legal behavior);
  - has a mandatory `Source traceability` section that links each Canon truth back to the WIP spec section(s), workbook section(s), Issue #20 research doc(s), Issue #21, and PR #29 governance docs as relevant — no vague "see WIP spec";
  - has a `Related areas` section that cross-links the other planned areas by name with a note that those area folders may not exist yet (using `../README.md` for navigation), per the area README rules ("do not pre-link to areas that have not been created").
- This iteration descriptor (`_working/ITERATION.md`) is updated to RA-0005 for the product-boundary Canon promotion step.
- No code changed; no dependencies changed; no raw data committed; no WIP / Research / governance docs edited; no Issue #21 body edited.
- No empty area folders created for other planned areas.
- No ADRs created; no implementation issues created; no implementation slicing performed.
- One area only: `product-boundary`.
- PR opened, linked to Issue #21, not merged by the assistant. Issue #21 is not closed.

Notes:
- This file is phase context, not Canon.
- Durable product truth lives in the Canon doc created by this iteration and in the WIP / Research / future ADR docs it cites — not in this file.
- This iteration is the first per-area Canon promotion under Issue #21. Subsequent per-area iterations under Issue #21 (e.g., `validation-emulator`, `event-applicability`) will each be scoped and tracked in their own iteration descriptor.
- Update this file again when the project moves to the next per-area Canon evaluation step under Issue #21.
