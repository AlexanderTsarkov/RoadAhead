---
status: Product Canon
canon: true
area: event-data
source:
  - ../product-boundary/product-boundary.md
  - ../validation-emulator/validation-emulator.md
  - ../route-geometry/route-geometry.md
  - ../../wip/roadahead-poc-v1-three-circle-assistant.md
  - ../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md
  - ../../../research/roadahead-prepared-event-store-recommendation.md
  - ../../../research/roadahead-direction-applicability-recommendation.md
  - ../../../research/roadahead-route-geometry-provider-recommendation.md
  - ../../../research/roadahead-enforcement-profile-recommendation.md
  - https://github.com/AlexanderTsarkov/RoadAhead/issues/21
related_decisions: []
last_reviewed: 2026-05-20
---

# Event Data

## Purpose

This area defines RoadAhead's stable product boundary for **event data** in POC V1: what kind of event data RoadAhead may consume, how external source data is treated, what prepared normalized candidate events are, what is and is not product truth, where route-specific derived values belong, and what remains future work for a `VerifiedRoadEvent` class and a community / field validation lifecycle.

Event data is an **input to RoadAhead behavior**, not a source of legal speed-limit correctness, enforcement truth, or safety certification. This area sits alongside [`product-boundary`](../product-boundary/product-boundary.md) — which establishes at the identity level that external datasets are candidate inputs, not verified product truth — and [`validation-emulator`](../validation-emulator/validation-emulator.md) — which establishes that candidate external event data may be used for emulator validation but remains candidate input. It refines those commitments at the event-data level: how raw source data is bounded, what a prepared normalized candidate event is at the principle level, what data is route-independent vs route-specific, and which questions remain WIP or research.

This area deliberately stops short of Canonizing the prepared event schema, the storage engine, the importer implementation, the deterministic event-identity formula, the route-candidate cache schema, the source-type mapping table, or any legal / licensing audit of Datakam / OpenSpeedcam. Those remain WIP / research and will be settled by future implementation slices, ADRs, or Canon promotions.

## Canon truths

The truths below are stable RoadAhead event-data commitments. They are deliberately short and boundary-level; specific schemas, identifiers, storage engines, importer designs, validation lifecycles, and route-candidate cache structures are explicitly **not** part of this area (see [Non-goals](#non-goals) and [Still WIP / not Canon](#still-wip--not-canon)).

1. **External road-event datasets are candidate inputs, not verified RoadAhead truth.** Third-party / public road-event datasets — including Datakam and OpenSpeedcam — are treated as external candidate observations. They are not asserted as confirmed, verified, or legally correct, regardless of how they are stored, normalized, or rendered. This is a direct extension of [`product-boundary`](../product-boundary/product-boundary.md) truth 6.

2. **Raw Datakam / OpenSpeedcam source files are import / source material only, not runtime product data.** Raw `speedcam.txt` and equivalent vendor distributions are inputs to a preparation step, not files that RoadAhead runtime or emulator code reads directly during a route session.

3. **Raw external source data stays local and uncommitted by default.** Raw `speedcam.txt` files, vendor distributions, equivalent source dumps, and locally generated full normalized stores derived from them are not committed to the repository by default. Approval to commit any such artefact is a separate, explicit decision; the default is "stays local".

4. **POC V1 runtime / emulator consumes prepared normalized candidate events, not raw source files.** The route-known emulator (and any future POC V1 runtime surface) operates on a prepared normalized candidate event set. Raw vendor rows are not read directly by event-selection logic, applicability evaluation, or driver-facing UI.

5. **Prepared events are normalized candidate observations, not `VerifiedRoadEvent` truth.** Preparing / normalizing a source row into RoadAhead's internal shape does not promote it from candidate observation to verified road-event truth. A prepared event is still an `ExternalObservation`-derived candidate; the only thing normalization changes is its shape, not its truth status.

6. **The POC V1 prepared event scope is initially limited to `speed_limit`, `static_camera`, and `road_bump`.** These are the event classes the POC V1 emulator exercises at the principle level. The boundary is intentionally narrow so the three-circle behavior, applicability, and feedback can be validated on a small, well-understood set of event shapes. Additional event types may be added by future Canon / implementation work.

7. **`TYPE=106` and other unclear or unsupported source types are deferred unless explicitly reviewed.** Source rows whose RoadAhead-internal semantics are unclear (notably Datakam `TYPE=106`), and source types outside the initial supported set (additional camera variants, dangerous turn, bad road, pedestrian crossing, dangerous intersection, etc.), are not surfaced as RoadAhead events in POC V1. Including such rows requires a deliberate, reviewed step; defaulting them to "shown as RoadAhead candidates" is not allowed.

8. **Source provenance must be preserved through normalization.** A prepared candidate event must carry enough provenance information to identify which external source it came from, which source dataset / revision it was imported from, and how to trace it back to its raw row. The exact field names and types are implementation detail; the principle is that normalization does not erase origin.

9. **Source identifiers and deterministic event identity should be stable enough to support QA status references and future route-candidate cache references.** A prepared candidate event needs an identity that is stable across re-imports of the same source data, so that QA / validation status, debug references, and any future route-specific cache structures can refer to the same event without being invalidated by routine rebuilds. The exact identity construction (deterministic hash formula, UUID policy, source-id passthrough) is implementation detail and remains WIP.

10. **Validation metadata may describe visual plausibility or QA status, but does not turn a candidate into legal or safety truth.** Per-event metadata such as a "looks correct" / "wrong" / "needs drive" QA hint, or counts and timestamps reserved for a future community validation workflow, is a candidate-quality signal — useful as a soft suppression / surfacing hint — not a promotion to verified, legally correct, or safety-certified road-event truth. The conservative posture in [`product-boundary`](../product-boundary/product-boundary.md) truth 9 and the non-claims in truths 3, 4, and 5 of that area are not weakened by validation metadata.

11. **Route-specific derived fields are not part of the base event record.** Projection distance, along-route position, projected segment index, local route approach tangent, direction delta, distance-ahead, and the final applicability decision are computed against a specific route geometry and are valid only for that route. They must be computed per route / per session, or stored in route-specific cache structures keyed on the route; they must not be persisted on the base event record. This is a direct extension of [`route-geometry`](../route-geometry/route-geometry.md) truth 4 and implementation implication "Route-specific derived fields are per-route computed values, not global event truth".

12. **A future `VerifiedRoadEvent` is a distinct concept from POC V1 external candidate events; its lifecycle is not defined by this Canon area.** POC V1 produces prepared `ExternalObservation`-derived candidate events. A separate, future class — `VerifiedRoadEvent` — would be the result of an explicit verification / community / field validation workflow. That class, its lifecycle, its acceptance criteria, its supersede / refresh behavior, and any account / moderation model are out of scope for this area and remain WIP. POC V1 candidate events must not imply `VerifiedRoadEvent` semantics by their shape or by their UI presentation.

13. **Provider / source licensing and redistribution constraints apply to source-derived data; committed fixtures must be synthetic, manually curated, or otherwise explicitly approved.** External-source data and any artefact mechanically derived from it (locally generated normalized stores, exported subsets, blended files) may carry licensing and redistribution constraints that have not been legally audited by this Canon area. Long-lived committed fixtures in the repository must be synthetic, abstract, or manually curated; a verbatim raw row in a fixture turns the fixture into committed external data. Whether and under what terms any vendor-derived store could be redistributed is explicitly **not** decided here.

## Scope

This area covers:

- **External candidate data boundary** — the rule that external road-event datasets are candidate inputs, not verified RoadAhead truth; what "candidate" means for downstream selection, debug, and UI; how this connects to the boundary-level commitment in [`product-boundary`](../product-boundary/product-boundary.md).
- **Raw vs prepared distinction** — the boundary between raw vendor source files (import / source material only) and prepared normalized candidate events (the runtime-side shape).
- **Normalized prepared candidate events at the principle level** — the principle that runtime consumes a normalized candidate event shape, without committing to specific field names, types, or storage engines.
- **Source provenance** — the principle that normalization preserves enough information to trace a prepared event back to its source row and source dataset / revision.
- **Stable event identity at the principle level** — the principle that event identity must be stable enough to support QA status references and route-candidate cache references across re-imports of the same source, without committing to a specific identifier construction.
- **Validation metadata as QA / plausibility, not legal truth** — the principle that per-event QA / validation metadata is a candidate-quality signal, not a promotion of candidate data to verified, legal, or safety truth.
- **Initial event-type scope** — the boundary that POC V1 prepared events are initially limited to `speed_limit`, `static_camera`, and `road_bump`; other Datakam source types (including `TYPE=106`) are deferred unless explicitly reviewed.
- **Route-specific derived data boundary** — the rule that route-projection / applicability / tangent / distance-ahead fields are computed per route and must not live on the base event record; cross-link to [`route-geometry`](../route-geometry/route-geometry.md).
- **Future `VerifiedRoadEvent` boundary at the principle level** — the rule that a future `VerifiedRoadEvent` class is distinct from POC V1 candidate events and that its lifecycle is not defined here.
- **Committed fixture / source-data policy at the principle level** — the rule that committed fixtures must be synthetic, abstract, or manually curated; raw source files, full generated stores, and provider-derived data are not committed by default.

## Non-goals

These topics are explicitly **out of scope** for this area. They belong in WIP / research, future implementation issues, future ADRs, or future Canon areas:

- **Exact prepared event schema** — field names, types, constraints, required vs optional fields, nullability rules, default values, runtime-vs-debug field split. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.
- **Exact storage engine** — the JSON fixture vs GeoJSON fixture vs SQLite-with-spatial-index vs GeoPackage choice for the first emulator slice and for any later runtime. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §3, §8.
- **Exact importer implementation** — language, dependencies, CLI surface, output directory layout, transformation pipeline, error handling, batching, deterministic-rebuild semantics. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §4, §11.2.
- **Exact source-type mapping table** — the precise Datakam `TYPE` → `normalized_type` mapping (beyond the initial supported set named in truth 6), the precise handling of new or re-used source codes across dataset revisions, and any per-source mapping registry. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.3, §9.1.
- **Exact validation status enum beyond high-level semantics** — the precise active-state enum values, transitions between active QA states (e.g., `unknown` / `looks_correct` / `wrong` / `needs_drive`) and reserved future lifecycle states (e.g., `confirmed` / `disputed` / `removed_candidate`), and the rules under which a status alters runtime behavior. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.6, §11.2.
- **Exact event ID formula** — the deterministic-hash construction (or UUID policy, or source-id passthrough) used to assign `event_id` to a prepared candidate event. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.1.
- **Exact route candidate cache schema** — the table / structure / fields / keys used to materialize route-specific projection, tangent, applicability, and suppression-reason values for a given route session. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §7, §8.3, §8.4.
- **Exact file / folder layout for fixtures and stores** — the directory locations, file naming, generation cadence, and cleanup policy for committed fixtures and locally generated stores. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §6.3.
- **Datakam / OpenSpeedcam legal / licensing audit** — whether and under what terms any subset of Datakam / OpenSpeedcam data can be redistributed, normalized, or shared; what attribution is required; what jurisdictional constraints apply. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §9.2.
- **Future `VerifiedRoadEvent` lifecycle, moderation, freshness, account model, or community workflow** — confirmation thresholds, freshness / supersede / refresh policy, prompting cadence, moderator roles, user account model, sync infrastructure, and any backend that supports them. See [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.5, §20.6 and [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §11.2.
- **Implementation slicing** — file layout, module boundaries, languages, frameworks, ticket sequencing, build / test wiring. Belongs in implementation issues and PRs, not in Canon.

## Product rules

These rules are normative. They follow from the Canon truths and constrain implementation, data behavior, and UX:

- **Do not load raw `speedcam.txt` (or equivalent vendor source files) as ordinary runtime product state.** Raw vendor source files are inputs to a preparation step. The route-known emulator and any future POC V1 runtime surface must not consume raw rows directly during a route session. (From truths 2 and 4.)

- **Do not commit raw or full generated external-source datasets by default.** Raw `speedcam.txt`, equivalent vendor distributions, full normalized stores generated locally from them, and any blended files that mix raw rows with synthetic content are not committed. Committing any such artefact requires a separate, explicit approval. (From truths 3 and 13.)

- **Normalize external source rows into prepared candidate events before emulator / runtime use.** Event-selection logic, applicability evaluation, and any driver-facing surface consume the prepared normalized candidate event shape; they do not consume raw vendor row shapes. (From truths 2 and 4.)

- **Preserve source provenance and source identity through normalization.** A prepared candidate event must carry enough information to identify which external source it came from, which source dataset / revision it was imported from, and how it relates to its source row. Identity must be stable enough across re-imports that QA status and any future route-candidate cache references remain valid. (From truths 8 and 9.)

- **Treat validation status as QA / plausibility metadata, not legal or safety truth.** A `looks_correct` or equivalent QA hint reflects manual visual plausibility only; it does not assert that the candidate event is legally correct, safety-validated, or a `VerifiedRoadEvent`. Validation metadata may be used as a soft suppression / surfacing hint, not as a promotion to verified truth. (From truths 1, 5, 10, 12.)

- **Do not store route-specific projection / applicability fields on the base event record.** Route-projection distance, along-route position, projected segment index, local route approach tangent, direction delta, distance-ahead, and applicability decision are route-specific. They must be computed per route / per session, or stored in route-specific cache structures keyed on the route geometry. They must not be persisted as canonical properties of the base event. (From truth 11.)

- **Do not treat a Datakam / OpenSpeedcam event type as a verified RoadAhead type without normalization and supported-type filtering.** Source `TYPE` values are not RoadAhead `normalized_type` values. Mapping from source `TYPE` to RoadAhead-internal type lives inside the preparation step and is constrained by the initial POC V1 supported set (`speed_limit`, `static_camera`, `road_bump`). Adding additional source types is a deliberate, reviewed step. (From truths 1, 5, 6, 7.)

- **Suppress or defer unsupported / unclear source types rather than confidently surfacing them.** Source rows that fall outside the supported set, that have unclear semantics (notably Datakam `TYPE=106`), or that fail other safety / quality checks are not surfaced as RoadAhead candidates in POC V1. Conservative deferral is preferred over confidently displaying a candidate whose semantics are not understood. (From truths 7 and 10; consistent with [`product-boundary`](../product-boundary/product-boundary.md) truth 9.)

- **A future `VerifiedRoadEvent` requires a separate lifecycle and must not be implied by POC V1 candidate events.** POC V1 prepared candidate events must not be presented — in product copy, UI, debug, or export — in a way that implies they are `VerifiedRoadEvent`s. Any future `VerifiedRoadEvent` class needs its own Canon / ADR review before it can affect runtime semantics. (From truths 5, 10, 12.)

- **Committed fixtures must be synthetic, manually curated, or otherwise explicitly approved.** Long-lived committed fixtures used for emulator tests and scenario reviews must respect source provenance and redistribution constraints. A fixture that contains even one verbatim raw source row becomes committed external data for repo purposes. (From truths 3, 8, 13.)

## Implementation-facing implications

These implications are intentionally high-level and stable. Concrete code, schema, importer, store, and cache design belongs to future implementation slices or WIP / research:

- **Future importer slices should transform raw source data into a prepared normalized candidate event set.** Whether the importer lives as a Python tool, a build-time TypeScript script, or a generator embedded in the web app is implementation detail. What matters at the Canon level is that the importer reads raw external source data, applies normalization and supported-type filtering, preserves provenance, and emits a prepared normalized candidate event set — not that it changes the truth status of the data.

- **The emulator should consume prepared candidate events / fixtures, not raw vendor files directly.** Route-known emulator scenarios are exercised against the prepared normalized event shape (small committed synthetic fixtures by default; locally generated uncommitted stores for larger experiments). The emulator does not parse `speedcam.txt` at runtime.

- **Route-specific applicability and cache values should be computed per route / per session or stored in route-specific cache structures.** When the emulator (or any future runtime) evaluates a candidate event against a specific route geometry, the resulting projection / tangent / direction-delta / applicability values are route-specific. They are recomputed when the route changes; they are not promoted onto the base event record. The mechanics of this — in-memory only, per-session cache, or a future keyed cache table — are implementation detail. See also [`route-geometry`](../route-geometry/route-geometry.md) implementation-facing implications.

- **QA / validation UI may attach status to candidates, but this is not legal or safety verification.** When the emulator or any future QA surface attaches a `looks_correct` / `wrong` / `needs_drive` (or equivalent) status to a candidate, that status is a candidate-quality signal — useful for suppression hints, debug visibility, and later validation workflows — not a promotion to legally correct or safety-verified data. UI copy, debug output, and exports must remain consistent with this.

- **Fixture generation must respect source provenance and redistribution constraints.** Whether a fixture is hand-authored, programmatically generated from synthetic seeds, or assembled from a small set of manually curated locations, it must not silently incorporate verbatim raw source rows and must not be treated as a "small slice of real data" that is safe to commit. Provenance and redistribution constraints survive normalization.

- **Implementation slices that need precise event schema, identity formula, storage engine, importer design, validation status enum, source-type mapping, or route-candidate cache schema should cite the relevant research doc or future Canon area, not this area.** This area commits to event-data principles, not to schemas or implementations. Slices that need such detail cite [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md), [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md), the appropriate planned-Canon area, or a future ADR.

## Still WIP / not Canon

The items below are deliberately **not promoted to Canon** in this PR. They remain WIP, research, or future-Canon candidates and are listed here so they cannot be mistaken for stable event-data truth.

- **Exact prepared event schema** — field names, types, constraints, required vs optional fields, nullability rules, default values, and the precise runtime-vs-debug field split. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5, §11.2.
- **Exact JSON / GeoJSON / SQLite / GeoPackage choice** — both for the first emulator fixture and for any later runtime store. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §3, §8, §11.2.
- **Exact importer design** — language, dependencies, CLI surface, transformation pipeline, error handling, batching, deterministic-rebuild semantics, output paths. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §4, §11.2.
- **Exact source-type mapping beyond initial supported types** — the precise Datakam `TYPE` → `normalized_type` mapping (beyond `speed_limit` / `static_camera` / `road_bump` at the boundary level), the handling of new or re-used source codes across vendor dataset revisions, and any per-source mapping registry. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.3, §9.1.
- **Exact `event_id` deterministic formula** — including the precise inputs (source + dataset version + source id, or alternatives), the hash function or UUID policy, and how it behaves under source-row revisions. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.1.
- **Exact `source_dataset_version` format** — vendor revision string, file hash, header timestamp, or other identifier used to label a source dataset, and the rules under which it changes. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.1.
- **Exact `validation_status` lifecycle** — the precise active QA enum (e.g., `unknown` / `looks_correct` / `wrong` / `needs_drive`), reserved future lifecycle states (e.g., `confirmed` / `disputed` / `removed_candidate`), transitions, and the rules under which a status alters runtime behavior. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.6, §11.2.
- **Exact route candidate cache table / schema** — the table or structure, fields, keys, lifecycle, persistence mode (in-memory, per-session file, future SQLite table), and invalidation rules for materializing route-specific values. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §7, §8.3, §8.4.
- **Exact fixture directory and generated-store lifecycle** — where committed fixtures live, what they are named, how locally generated stores are produced and refreshed, and how they are cleaned up. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §6.3.
- **Exact licensing / legal audit for Datakam / OpenSpeedcam redistribution** — whether and under what terms any subset of Datakam / OpenSpeedcam data can be normalized, redistributed, or shared; what attribution is required; what jurisdictional constraints apply. No legal review has been conducted by this Canon area. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §9.2.
- **Future `VerifiedRoadEvent` lifecycle** — community / user / field validation workflow, confirmation thresholds, freshness / supersede / refresh policy, prompting cadence, and the boundary between an `ExternalObservation`-derived candidate event and a future `VerifiedRoadEvent`. See [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.5, §20.6 and [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §11.2.
- **User / community validation workflow** — accounts, moderation, sync, validation prompts, community confirmation / rejection rules. Out of POC V1 scope (WIP spec §20.6). See [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.5, §20.6.
- **Implementation file / module layout** — adapter / importer / store file names, module structure, type locations, directory hierarchy.

## Source traceability

Each Canon truth is supported by one or more sources. Links are relative to this file.

- **Truth 1 — External road-event datasets are candidate inputs, not verified RoadAhead truth.**
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 6 (External datasets are candidate inputs, not verified product truth) and product rules ("Do not present external candidate data as verified truth").
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose — Datakam / OpenSpeedcam is `ExternalObservation` candidate data, not `VerifiedRoadEvent` truth), §16 (Datakam / OpenSpeedcam data source policy — `ExternalObservation` candidate data, not `VerifiedRoadEvent` truth).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (raw external data is import-only; runtime uses prepared candidate events), §2 (`ExternalObservation` definition), §11.1 (Datakam / OpenSpeedcam remains candidate, not `VerifiedRoadEvent`).

- **Truth 2 — Raw Datakam / OpenSpeedcam source files are import / source material only, not runtime product data.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.1 (Boundary — raw `speedcam.txt` is import / source material only, not runtime product data), §14.6 (Repo / data-policy boundary), §16 (Datakam / OpenSpeedcam data source policy).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §19 (Decision Q15 — raw `speedcam.txt` is not the runtime event source; preparation step is explicit).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (raw `speedcam.txt` is import / source material only), §2 (raw source data definition), §11.1 (raw external data is import-only as future Canon candidate).

- **Truth 3 — Raw external source data stays local and uncommitted by default.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.6 (raw Datakam / OpenSpeedcam files remain local / uncommitted; generated full data stores are not committed unless explicitly approved).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (raw stays local and uncommitted), §6.2 (what must not be committed — raw `speedcam.txt`, full generated stores), §9.2 (repository / data policy risks), §11.1 (full generated stores are local / uncommitted by default).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) Still WIP / not Canon ("Datakam/OpenSpeedcam licensing has not been audited"; raw datasets stay local).
  - [`../route-geometry/route-geometry.md`](../route-geometry/route-geometry.md) truth 10 (committed fixtures must be synthetic, abstract, or user-provided — same data-policy principle applied to route geometry).

- **Truth 4 — POC V1 runtime / emulator consumes prepared normalized candidate events, not raw source files.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.1 (explicit data-preparation step that converts raw input into a prepared local event store), §14.2 (What the prepared store must support).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §19 (Decision Q15 — explicit data-preparation step; web emulator reads prepared store or generated subset; raw Datakam file remains local / ignored).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (runtime uses prepared, normalized event records), §4 (recommended first data path — emulator consumes the prepared shape), §11.1 (runtime uses prepared, normalized event records as future Canon candidate).
  - [`../validation-emulator/validation-emulator.md`](../validation-emulator/validation-emulator.md) truth 9 (candidate external event data may be used for emulator validation, but remains candidate input, not verified truth).

- **Truth 5 — Prepared events are normalized candidate observations, not `VerifiedRoadEvent` truth.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §16 (Datakam / OpenSpeedcam data source policy — `ExternalObservation` candidate data; system must not present candidate events as confirmed / verified).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §2 (prepared event definition — still candidate data, not verified truth, expressed in the RoadAhead-internal shape), §11.1 (Datakam / OpenSpeedcam remains ExternalObservation candidate data, not `VerifiedRoadEvent`).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truth 6 and Still WIP / not Canon ("Future `VerifiedRoadEvent` lifecycle").

- **Truth 6 — The POC V1 prepared event scope is initially limited to `speed_limit`, `static_camera`, and `road_bump`.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §7.1 (Initial event types — `speed_limit` Datakam `TYPE=101`, `static_camera` Datakam `TYPE=1`, `road_bump` Datakam `TYPE=102`), §7.2 (Camera scope — POC V1 starts with `static_camera` only).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) Decision Q2 / Q3 (Initial event types and camera scope — `speed_limit`, `static_camera`, `road_bump` only).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.3 (POC V1 `normalized_type` values: `speed_limit`, `static_camera`, `road_bump`; other Datakam types remain ineligible for POC by default).
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §6 (event-type applicability covers `speed_limit`, `static_camera`, `road_bump`).

- **Truth 7 — `TYPE=106` and other unclear / unsupported source types are deferred unless explicitly reviewed.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §7.1 (Deferred by default — `TYPE=106 other_danger`, other camera types, dangerous turn, bad road, pedestrian crossing, dangerous intersection), §7.4 (`TYPE=106 other_danger` deferral — not globally proven to mean "railway crossing"), §20.7 (`TYPE=106` corridor mode — open product question).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) Decision Q2 (Defer `TYPE=106`; reasoning that semantics are not globally verified).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §9.1 (source semantics risks — type mapping can change by dataset / version; `TYPE_MEANINGS` is best-effort).

- **Truth 8 — Source provenance must be preserved through normalization.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.4 (Minimum normalized event fields — `source`, `source_event_id` / `source_idx`, `raw_type`, `source_dataset_version`).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §2 (definitions — source dataset version), §5.1 (Identity / source — `source`, `source_event_id` / `source_idx`, `source_dataset_version`, `raw_type`, `imported_at` provenance fields), §9.1 (source semantics risks).
  - [`../route-geometry/route-geometry.md`](../route-geometry/route-geometry.md) product rules ("Preserve provenance for provider-derived geometry") — provenance principle applied at the route-geometry level; this area applies the same principle to event data.

- **Truth 9 — Source identifiers and deterministic event identity should be stable enough to support QA status references and future route-candidate cache references.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.4 (Minimum normalized event fields — `event_id`, `source_event_id` / `source_idx`).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.1 (`event_id` — prefer a deterministic ID based on stable source identity so that re-imports produce the same `event_id`; QA statuses and route-candidate cache foreign keys reference it), §7 (route-candidate fields reference the base `event_id` as foreign key).

- **Truth 10 — Validation metadata may describe visual plausibility or QA status, but does not turn a candidate into legal or safety truth.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.5 (Reserved future validation fields — schema only; POC V1 does not implement community validation, accounts, moderation, or production sync), §16 (system must not claim legal correctness; must not present candidate events as confirmed / verified), §20.6 (Validation lifecycle is out of POC V1 scope).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.6 (QA / validation fields are reserved; `looks_correct` reflects manual visual plausibility only, not `VerifiedRoadEvent` truth; reserved future lifecycle states must not imply product-verified road-event truth in POC V1).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) truths 3, 4, 5 (no anti-radar / enforcement claim; no legal speed-limit correctness claim; no safety certification claim).
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1 (no legal correctness claim), §11 (Russia +20 km/h is a working default, not legal truth).

- **Truth 11 — Route-specific derived fields are not part of the base event record.**
  - [`../route-geometry/route-geometry.md`](../route-geometry/route-geometry.md) truth 4 (route geometry as spatial reference for progress, projection, local approach tangent, applicability evaluation) and implementation-facing implications ("Route-specific derived fields (along-route positions, projection distances, tangent values) are per-route computed values, not global event truth").
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (route-projection / route-derived fields are not stored as global event truth; computed per route and optionally cached per route / session, separate from the base event record), §5.5 (Route-projection fields — see §7), §7 (Route-specific derived data — base event record is global, route-independent; route-candidate materialization is computed per route session), §8.3 (separation of base events vs route-derived candidates).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §2 (Definitions — `vehicle_route_position_m`, `event_route_position_m`, `distance_ahead_m`, `route_projection_distance_m`, local route approach tangent are all route-specific) and §3.C–§3.H (route-specific pipeline produces per-route projection, tangent, direction-delta, applicability decision).

- **Truth 12 — A future `VerifiedRoadEvent` is a distinct concept from POC V1 external candidate events; its lifecycle is not defined by this Canon area.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose — Datakam / OpenSpeedcam is `ExternalObservation` candidate data, not `VerifiedRoadEvent` truth), §14.5 (Reserved future validation fields — schema only; POC V1 does not implement community validation), §16 (Datakam / OpenSpeedcam data source policy), §20.6 (Validation lifecycle out of POC V1 scope).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §2 (`VerifiedRoadEvent` future, not POC V1 — POC V1 does not produce `VerifiedRoadEvent`s; only consumes `ExternalObservation`-derived prepared events), §11.2 (full validation lifecycle, confirmation thresholds, freshness rules, account model remain WIP).
  - [`../product-boundary/product-boundary.md`](../product-boundary/product-boundary.md) Still WIP / not Canon ("Future `VerifiedRoadEvent` lifecycle").

- **Truth 13 — Provider / source licensing and redistribution constraints apply to source-derived data; committed fixtures must be synthetic, manually curated, or otherwise explicitly approved.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.6 (Repo / data-policy boundary — raw files remain local / uncommitted; generated full data stores are not committed unless explicitly approved; small synthetic or manually curated fixtures may be committed for tests; raw text input is treated as source material only, not committed product data).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §6 (Fixture strategy — small synthetic fixtures are preferred; raw rows or full generated stores must not be committed; even one verbatim row turns a fixture into committed external data), §9.2 (repository / data policy risks — generated stores can accidentally smuggle raw external data into the repo; full data may have licensing / redistribution constraints; Datakam / OpenSpeedcam licensing has not been audited), §11.1 (small committed fixtures must be synthetic or safely curated as future Canon candidate).
  - [`../route-geometry/route-geometry.md`](../route-geometry/route-geometry.md) truth 10 (provider-derived route geometry has provenance and caching / licensing constraints; long-lived committed fixtures must be synthetic, abstract, or user-provided) — same data-policy principle applied to route geometry.
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §7 (provider terms / data policy concerns — provider-derived data exported to another format is still provider-derived; long-lived committed fixtures must be synthetic or user-provided).

Umbrella issue and governance:

- Issue [#21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) — umbrella issue under which this Canon promotion lives.
- [`../README.md`](../README.md) — area-based Canon structure, area document template, and area split / merge / cross-link rules.
- [`../../README.md`](../../README.md) — product documentation map, status-layer rules, and Canon promotion rule.

## Related areas

- **[`product-boundary`](../product-boundary/product-boundary.md)** (existing Canon area) — what RoadAhead is and is not; external-data candidate boundary; legal / safety non-claims; conservative posture under ambiguity. This `event-data` area refines the boundary-level commitment in `product-boundary` truth 6 (external datasets are candidate inputs, not verified product truth) at the event-data level, and it stays consistent with the legal / safety non-claims in truths 3, 4, 5.

- **[`validation-emulator`](../validation-emulator/validation-emulator.md)** (existing Canon area) — interactive web route emulator as POC V1 validation surface; candidate external event data may be used for emulator validation but remains candidate input. This `event-data` area defines the principle-level shape of the candidate event data that the emulator consumes (refining `validation-emulator` truth 9 at the data-shape level).

- **[`route-geometry`](../route-geometry/route-geometry.md)** (existing Canon area) — route geometry as spatial reference for route-known validation; route-specific derived fields are per-route computed values, not global event truth. This `event-data` area enforces the complementary rule: route-specific projection / applicability / tangent / direction-delta / distance-ahead fields are not part of the base event record (truth 11), they are computed per route or stored in route-specific cache structures defined elsewhere.

- **`event-applicability`** (planned; not yet a Canon area) — route / path applicability, direction applicability against the local route approach tangent, branch / intersection ambiguity handling, conservative suppression. The `event-applicability` area will define the per-route mechanics that consume the prepared candidate events established by this area and produce the route-specific derived values referenced in truth 11. See planning entry in [`../README.md`](../README.md).

- **`speed-reference`** (planned; not yet a Canon area) — active POC V1 speed modes, target-speed semantics from the event itself, `provisional_limit` deferral. Target speed is sourced from prepared candidate event data (e.g., Datakam `SPEED`) per this area's normalization principles; `speed-reference` will Canonize how that target is consumed at the mode level. See planning entry in [`../README.md`](../README.md).

- **`feedback-and-enforcement`** (planned; not yet a Canon area) — pass-feedback tiers, camera-risk feedback variant, configurable `enforcement_tolerance` severity buffer (not a legal claim), strict separation between `target_speed`, `enforcement_tolerance`, and `display_hysteresis_kmh`. The non-claim posture for camera / enforcement events depends on the event-data principle that candidate events are not verified or legally correct (truth 10). See planning entry in [`../README.md`](../README.md).

- **`ui-model`** (planned; not yet a Canon area) — three-circle UI, primary / secondary event roles, visual states, sign-like primitives, layout. Driver-facing presentation of candidate events must respect the candidate / non-truth labeling established by this area; the `ui-model` area will Canonize the specific visual shape under those constraints. See planning entry in [`../README.md`](../README.md).

- **`tuning-and-validation`** (planned; not yet a Canon area) — threshold tuning, scenario sweep methodology, validation evidence required before promoting a tuning value to Canon. The QA / validation metadata principles in this area (truth 10) are upstream of the methodology question; per-event QA status is candidate-quality metadata, while tuning values follow a separate scenario-sweep promotion path. See planning entry in [`../README.md`](../README.md).
