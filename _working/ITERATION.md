RA-0009__Issue_74_Minimal_First_Usable_Emulator

Work Area: RoadAhead Phase 0 implementation / first usable web emulator
Tech Area: RoadAhead Phase 0 — interactive web route emulator, route-known mode

## Sprint goal

Build the **minimal first usable Phase 0 web emulator**: a route-known browser simulator that can be opened, driven through a known route, inspected, and used by the product owner / vision owner to decide whether RoadAhead's event-applicability and display model feel valuable enough to continue toward a POC.

This is not a finished product.
This is not the full POC.
This is not all of Phase 0.
This is the first usable emulator release for product/vision evaluation.

The goal is to make the emulator useful enough to answer:

> Does the RoadAhead concept feel useful when moving through a known route with speed-limit, camera, and road-hazard style events?

## Master issues

Top-level tracker:

- [#17 — Plan RoadAhead POC V1 web emulator implementation slices from Product Canon](https://github.com/AlexanderTsarkov/RoadAhead/issues/17)

Operational master for this sprint:

- [#74 — Phase 0 emulator — minimal first usable simulator](https://github.com/AlexanderTsarkov/RoadAhead/issues/74)

Role split:

- #17 remains the top-level master / tracker for implementation scope derived from the current Product Canon.
- #17 keeps historical status, completed slice records, Canon guardrails, and broader deferred areas.
- #74 is the active operational umbrella for this sprint and defines the bounded first-usable-emulator scope.
- New near-term implementation work must link to #74 and #17.
- Do not expand #17 directly with new near-term feature slices.

## Child issues for this sprint

This sprint is limited to the following child issues under #74:

1. [#75 — Phase 0 emulator — road_bump / hazardous road segment eligibility baseline](https://github.com/AlexanderTsarkov/RoadAhead/issues/75)
2. [#76 — Phase 0 emulator — event-type-aware display semantics](https://github.com/AlexanderTsarkov/RoadAhead/issues/76)
3. [#77 — Phase 0 emulator — route playback mode](https://github.com/AlexanderTsarkov/RoadAhead/issues/77)
4. [#78 — Phase 0 emulator — upcoming events strip](https://github.com/AlexanderTsarkov/RoadAhead/issues/78)
5. [#79 — Phase 0 emulator — local route geometry import, GeoJSON first](https://github.com/AlexanderTsarkov/RoadAhead/issues/79)
6. [#80 — Phase 0 emulator — first usable emulator review checkpoint](https://github.com/AlexanderTsarkov/RoadAhead/issues/80)

Execution order:

1. #75 — add road-hazard eligibility.
2. #76 — make display semantics type-aware.
3. #77 — add route playback.
4. #78 — add upcoming-events strip.
5. #79 — add local GeoJSON route geometry import.
6. #80 — stop and review the first usable emulator.

Scope-control rule:

- These six issues define this sprint.
- Do not add new feature slices under #74 unless one of these six is explicitly replaced or split.
- Broader ideas stay in #17 parking lot or a future Stage 2 master issue.

## Current completed foundation

The following foundation is already complete before RA-0009:

- separate `web/roadahead-emulator` app baseline;
- web app CI;
- synthetic route/events/tuning contracts;
- first speed-limit vertical slice;
- route projection baseline;
- direction compatibility baseline;
- suppression reason model;
- debug accepted/suppressed/not_processed view;
- synthetic applicability scenarios;
- scenario sweep harness;
- scenario sweep in CI;
- sticky operator simulation header;
- static camera eligibility baseline;
- cross-track/off-route suppression baseline;
- repo branch/PR hygiene instructions (`CLAUDE.md`, `.cursor/rules/roadahead-workflow.mdc`);
- browser scenario selector / scenario inspector;
- copyable manual evidence snapshot.

The emulator currently validates 14 synthetic scenarios / 106 checks. Scenario sweep remains WIP validation evidence only, not Product Canon.

## Sprint scope

This sprint should produce a reasonable, minimal web simulator that supports:

- route-known simulation;
- speed-limit events;
- static-camera events;
- road-hazard / road-bump style events;
- type-aware display semantics;
- Play / Pause route playback;
- upcoming-events visibility;
- local manually-created route geometry import, GeoJSON first;
- browser QA via scenario selector / inspector and evidence snapshot.

The first-release route model is intentionally simple:

- route is known;
- route geometry may be synthetic or manually supplied from a local file;
- RoadAhead does not build the route;
- RoadAhead does not decide route alternatives;
- RoadAhead does not predict future branches;
- route geometry is context input for applicability checks only.

## Sprint non-scope

Do not add any of the following in RA-0009:

- full routing;
- provider integration;
- Yandex / OSRM / GraphHopper integration;
- provider speed / ETA / traffic / posted-limit data;
- route alternatives;
- branch / ramp / parallel-carriageway topology reasoning;
- likely-next-road prediction;
- map matching;
- segment-aware fork choice;
- Android overlay;
- backend / sync / accounts;
- raw Datakam / OpenSpeedcam data commits;
- legal / enforcement / fine / violation / police / radar-detector claims;
- safety-certified behavior claims;
- Product Canon promotion;
- production UI polish.

These may be considered later only after the #80 review checkpoint, if the first usable emulator gives the right product signal.

## Source of truth

Product Canon remains the primary authority:

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

- `docs/product/README.md`
- `docs/product/areas/README.md`
- `docs/product/wip/README.md`
- `CLAUDE.md`
- `.cursor/rules/roadahead-workflow.mdc`
- `AGENTS.md`

Secondary source material remains WIP / research input only:

- `docs/product/wip/roadahead-poc-v1-three-circle-assistant.md`
- `docs/product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`
- `docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`
- `docs/research/roadahead-direction-applicability-recommendation.md`
- `docs/research/roadahead-route-geometry-provider-recommendation.md`
- `docs/research/roadahead-prepared-event-store-recommendation.md`
- `docs/research/roadahead-enforcement-profile-recommendation.md`
- `docs/research/roadahead-threshold-tuning-recommendation.md`

If WIP / research and Product Canon disagree, **Product Canon wins**.

## Canon guardrails for every PR

Every PR in this sprint must preserve these constraints:

- RoadAhead is not a navigator.
- RoadAhead is not an anti-radar.
- RoadAhead is not a legal speed-limit authority.
- RoadAhead is not safety-certified.
- External road-event data is candidate input only, not verified RoadAhead truth.
- Raw Datakam / OpenSpeedcam data must not be committed.
- Route providers or files may supply geometry only.
- Provider speed / ETA / traffic / posted-limit data must not become RoadAhead truth.
- Candidate events must pass applicability checks before driver-facing display.
- Debug visibility does not imply driver-facing eligibility.
- Speed reference is guidance context, not legal truth.
- Feedback / enforcement semantics are advisory only, not legal enforcement truth.
- No numeric tuning value is Product Canon.
- Scenario sweep and manual snapshots are WIP validation evidence only.

## Cursor / AI rules for this sprint

- Read `CLAUDE.md`, `.cursor/rules/roadahead-workflow.mdc`, and this file first.
- Start each child issue from latest `origin/main`.
- Never branch from a previous issue branch.
- One issue -> one branch -> one PR unless explicitly instructed otherwise.
- Every PR body must include branch hygiene evidence.
- Implement only the current child issue.
- Link PRs to both #74 and #17.
- Do not add new #74 scope while implementing a child issue.
- Do not promote numeric values to Canon.
- Do not commit raw external data.
- Do not introduce provider/API/network behavior unless the current issue explicitly allows it. Current #74 child issues do not allow provider/network work.
- If a requested task does not fit #74, stop and ask.

## Validation expectations

For changes under `web/roadahead-emulator`, run from that directory:

```bash
npm run build
npm run scenario:sweep
```

Include validation results in PR bodies.

Manual browser validation should use existing QA surfaces where relevant:

- sticky operator header;
- scenario selector / inspector;
- debug accepted/suppressed/not_processed table;
- manual evidence snapshot.

## Sprint Definition of Done

- #75 completed or explicitly deferred with reason.
- #76 completed or explicitly deferred with reason.
- #77 completed or explicitly deferred with reason.
- #78 completed or explicitly deferred with reason.
- #79 completed or explicitly deferred with reason.
- #80 review checkpoint completed.
- #74 updated with final status and decision.
- #17 updated with final status and next-stage direction.
- No out-of-scope routing/provider/topology/Android/Canon-promotion work added under this sprint.

## Historical note

RA-0008 covered Issue #17 implementation planning and the early implementation-dispatch phase. That work produced the initial emulator foundation and later accumulated enough scope that #17 became too broad for day-to-day execution.

RA-0009 narrows execution to #74: the minimal first usable emulator release. After #80, the project should stop, review the result, and decide whether to proceed toward POC, continue Phase 0 Stage 2, or adjust the product model.