---
status: Product Canon
canon: true
area: product-boundary
source:
  - ../../wip/roadahead-poc-v1-three-circle-assistant.md
  - ../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md
  - ../../../research/roadahead-direction-applicability-recommendation.md
  - ../../../research/roadahead-route-geometry-provider-recommendation.md
  - ../../../research/roadahead-prepared-event-store-recommendation.md
  - ../../../research/roadahead-enforcement-profile-recommendation.md
  - ../../../research/roadahead-threshold-tuning-recommendation.md
  - https://github.com/AlexanderTsarkov/RoadAhead/issues/21
related_decisions: []
last_reviewed: 2026-05-20
---

# Product Boundary

## Purpose

This area defines **what RoadAhead is and is not**, together with the non-claims that constrain every other area of the product. It is the smallest, most stable layer of Product Canon: identity, scope, and the legal / safety / data-truth boundaries inside which all future design, data, UX, and implementation decisions must fit.

The area exists so that future Canon, ADRs, WIP, research, and implementation work can be checked against a short, citable product identity. When a more specific area (e.g., route geometry, event data, UI model) needs to interpret a detail, it should be consistent with this area; when a question is about identity or non-claims, this is the authoritative place to answer it.

## Canon truths

The truths below are stable RoadAhead product-boundary commitments. They are deliberately short and identity-level; specific algorithms, schemas, thresholds, providers, and UX numbers are explicitly **not** part of this area (see [Non-goals](#non-goals) and [Still WIP / not Canon](#still-wip--not-canon)).

1. **RoadAhead is an anticipatory road-understanding assistant.** Its purpose is to help the driver understand upcoming road events early enough to react smoothly. It is not a control system, not a braking system, and not an automation product.
2. **RoadAhead is not a turn-by-turn navigator.** It does not plan routes for the driver, does not deliver turn-by-turn voice / lane guidance, does not reroute, and does not present itself as a navigation product. Any consumption of route geometry is a means to anticipatory road understanding, not a navigation product offering.
3. **RoadAhead is not an anti-radar or enforcement-avoidance product.** It does not claim to detect, predict, or help drivers evade enforcement. Camera-related feedback, when present, is anticipatory and advisory; it does not assert violation, fine, ticket, confirmed capture, or guaranteed enforcement.
4. **RoadAhead does not claim legal speed-limit correctness.** It does not represent any displayed speed value, target, or threshold as the current legally valid speed limit. Speed-related guidance is anticipatory information sourced from candidate event data, not a legal-limit authority.
5. **RoadAhead does not claim safety certification or guarantee safe driving behavior.** It is not certified for driver-assistance use, does not establish standard reaction times, comfortable braking, or safe display distances, and does not replace the driver's responsibility to drive safely.
6. **External datasets are candidate inputs, not verified product truth.** Third-party / public datasets currently in use as RoadAhead inputs — including Datakam and OpenSpeedcam — are treated as external candidate observations. They are not asserted as confirmed, verified, or legally correct, regardless of how they are stored, normalized, or rendered.
7. **POC V1 validates driver-facing behavior in an interactive web route emulator before Android overlay work.** The web emulator is the first-class POC V1 validation environment; Android overlay and standalone Android prototype work are deferred. The emulator is a deliberate product / testing artifact, not a throwaway toy, but it is also not the eventual delivery surface.
8. **Route provider data is not RoadAhead truth, except for route geometry when explicitly used as a geometry source.** Route providers (when used) supply route geometry only. Provider speed, ETA, traffic speed, segment speed, posted-limit data, lane / turn instructions, and any other non-geometry signal are not RoadAhead product truth and must not be presented as such.
9. **RoadAhead guidance must be conservative when applicability or data truth is ambiguous.** When applicability to the current path is unclear (e.g., direction conflicts, branch / intersection ambiguity, parallel carriageway / ramp / side-road snap risk) or when external data truth is in doubt, the driver-facing posture is suppression / non-claim over confident display. Debug visibility is permitted (and expected) so that suppressed or ambiguous candidates remain inspectable.

## Scope

This area covers:

- **Product identity** — what RoadAhead is (anticipatory road-understanding assistant) and how it positions itself relative to adjacent product categories.
- **Product non-goals** — what RoadAhead deliberately does not do (navigation, anti-radar / enforcement avoidance, automated control).
- **Legal / safety non-claims** — what RoadAhead does not assert (legal speed-limit correctness, safety certification, guaranteed safe behavior, violation / fine / confirmed-capture claims).
- **External data truth boundary** — the rule that external datasets are candidate inputs, not verified product truth.
- **High-level POC validation boundary** — the rule that POC V1 validates behavior in a web route emulator before any Android overlay work, and that the emulator is not the eventual delivery surface.
- **Conservative ambiguity posture** — the rule that driver-facing guidance prefers suppression / non-claim over confident display when applicability or data truth is ambiguous.

## Non-goals

These topics intentionally do **not** live in `product-boundary`. They belong in other (current or future) areas, or remain WIP:

- Route geometry provider selection details (concrete provider, API choice, key / pricing / terms posture, adapter design). Belongs in a future `route-geometry` area; current input in [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md).
- Event data schema (prepared event fields, identity, normalization rules, validation-metadata layout, storage engine). Belongs in a future `event-data` area; current input in [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md).
- Event applicability algorithm (route projection, direction-delta thresholds, branch / intersection heuristics, `DIRTYPE` / `DIRECTION` interpretation). Belongs in a future `event-applicability` area; current input in [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md).
- Speed-reference state machine details (`unknown` / `approach_target` / `pass_feedback_hold` definitions, `provisional_limit` deferral mechanics, `recent_passed_speed_candidate` TTL). Belongs in a future `speed-reference` area.
- Pass-feedback and camera-risk behavior details (tier definitions, hold timing, unrecoverable-distance trigger, camera-icon pulse cadence, blink rules). Belongs in a future `feedback-and-enforcement` area; current input in [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md).
- Threshold tuning values (deceleration profiles, reaction times, hysteresis, alpha smoothing, per-type lookahead guardrails, scenario-sweep results). Belongs in a future `tuning-and-validation` area; current input in [`../../../research/roadahead-threshold-tuning-recommendation.md`](../../../research/roadahead-threshold-tuning-recommendation.md).
- UI layout details (three-circle composition, sign-like primitives, horizontal-only POC V1 layout, vertical deferral, visual states). Belongs in a future `ui-model` area.
- Implementation slicing (file layout, module boundaries, languages, frameworks, ticket sequencing). Belongs in implementation issues and PRs, not in Canon.
- Legal interpretation by jurisdiction (specific enforcement tolerances, jurisdiction-by-jurisdiction legal posture, including any specific Russia / Belarus / EU value). Belongs in a future `feedback-and-enforcement` area only after explicit legal verification — and even then, RoadAhead does not become a legal authority (truth #4).

## Product rules

The rules below are normative product rules derived from the [Canon truths](#canon-truths). They constrain product copy, UX, data behavior, and any implementation that touches the driver-facing surface.

- **Do not use navigator language for POC V1.** Product copy, UI labels, marketing-style language, debug labels, and emulator UI must not describe RoadAhead as a navigator, a navigation app, a route-planning product, a turn-by-turn assistant, or anything functionally equivalent. (From truth 2.)
- **Do not use anti-radar / fine-avoidance language.** Product copy and UI must not describe RoadAhead as an anti-radar, radar detector, fine-avoidance tool, enforcement-evasion product, or anything functionally equivalent. Camera-related language must remain anticipatory and advisory (e.g., "possible camera risk"). (From truths 3 and 5.)
- **Do not present external candidate data as verified truth.** Datakam, OpenSpeedcam, and any future external candidate dataset must be surfaced — in product copy, UI, debug, and exports — as candidate observations, not as confirmed / verified / legally-correct events. (From truth 6.)
- **Do not present route-provider speed / ETA / traffic speed as RoadAhead truth.** When a route provider supplies geometry, only the geometry feeds RoadAhead logic; the provider's speed, ETA, traffic, lane, and turn-instruction data must not flow into RoadAhead's driver-facing values. (From truth 8.)
- **When data applicability is ambiguous, prefer suppression / debug visibility over confident driver-facing display.** Wrong-road, wrong-direction, branch-ambiguous, or otherwise suspect candidates are suppressed in the driver-facing event selection by default; they remain visible in debug / QA surfaces for inspection and tuning. (From truth 9.)
- **Any legal- or safety-sensitive language must be framed as advisory / emulator / candidate unless future reviewed Canon says otherwise.** No legal-correctness claim, no safety certification claim, no automation claim, no enforcement assertion may be introduced silently; if a future product step needs to weaken any of these non-claims, it must do so through an explicit Canon / ADR PR. (From truths 4 and 5.)

## Implementation-facing implications

The implications below are intentionally high-level and stable. Concrete code, data, debug, and UX shape belongs to the more specific area / WIP / research docs they cite.

- **Product copy and UI labels must avoid navigator and anti-radar claims**, including in marketing copy, in-app text, emulator UI, screenshots, and debug strings. Reviewers should reject UI text that drifts toward navigator / anti-radar framing without an explicit Canon change.
- **Debug output may preserve suppressed or ambiguous candidates, but driver-facing UI must remain conservative.** Suppressed / ambiguous candidates are first-class debug citizens; they are not first-class driver-facing citizens. This is the only consistent way to keep ambiguity inspectable without misleading the driver.
- **Implementation slices must cite the more specific Canon area or WIP / research doc for details.** This Canon area does not name files, modules, classes, schemas, providers, thresholds, durations, or jurisdictions. Slices that need such detail cite the appropriate area's Canon doc (when it exists) or the relevant WIP / research doc (when the area is still WIP).
- **Emulator validation can use candidate data, but must not treat it as verified truth.** Whatever the emulator loads — fixture, generated local store, or future provider geometry — is candidate / geometry-only input, not RoadAhead-asserted product truth. The emulator's affordances (e.g., "save route as GeoJSON", "expose enforcement tolerance config", "show debug fields per candidate") inherit this constraint.
- **The web emulator is the validation surface for POC V1; it is not the eventual delivery surface.** Decisions justified only by "the emulator does it this way" are not automatically applicable to a future Android prototype or overlay — those will be re-evaluated when their Canon areas are added.

## Still WIP / not Canon

The items below are deliberately **not promoted to Canon** in this PR. They remain WIP / research / future-Canon candidates and are listed here so they cannot be mistaken for stable product-boundary truth.

- **Exact event applicability thresholds** — `direction_delta_deg` values, `route_projection_accept_m` / `_warn_m` / `_reject_m`, approach-window length, projection-competitor heuristics. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §4, §10.2.
- **Exact route projection / branch ambiguity heuristics** — `branch_zone_radius_m`, `projection_competitor_delta_m`, `competitor_heading_delta_deg`, the precise model for parallel carriageways / ramps / frontage roads. See [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §3.G, §10.2.
- **Final route provider choice** — including any decision among Yandex (HTTP Router API vs JS API v2.1 vs v3), OSRM, GraphHopper, GPX / KML / GeoJSON import, or manual / debug polyline as the production route geometry source. See [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1, §10.2.
- **Prepared event store engine and schema details** — JSON / GeoJSON vs SQLite vs GeoPackage; field names, types, constraints; spatial-index strategy; importer design; fixture directory layout. See [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §3, §5, §11.2.
- **Exact enforcement profiles and legal verification** — including the working Russia +20 km/h POC default (which is a working emulator profile, **not** a legal claim) and any other jurisdiction-specific tolerance value. Legal correctness of any tolerance value is explicitly **not** asserted by this Canon area. See [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1, §5, §11, §13.2.
- **Exact threshold tuning values** — `pass_feedback_hold_s`, `display_hysteresis_kmh`, `clear_hysteresis_kmh`, `alpha_smoothing_ms`, reaction-time defaults, deceleration profile values, per-type lookahead guardrails, and the scenario sweep that would justify any of them. See [`../../../research/roadahead-threshold-tuning-recommendation.md`](../../../research/roadahead-threshold-tuning-recommendation.md) §4, §10, §14.2.
- **Android overlay UX and implementation** — Phase 1 (standalone Android prototype) and Phase 2 (Android overlay on top of an existing navigator) scope, permissions, lifecycle, overlay UX, and any equivalent platform-specific behavior. See [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §2, §18, §21.
- **Future `VerifiedRoadEvent` lifecycle** — community / user / field validation workflow, account model, moderation, freshness / supersede / refresh policy, confirmation thresholds, and the boundary between `ExternalObservation` candidate data and a future `VerifiedRoadEvent` class. See [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §14.5, §20.6 and [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §5.6, §11.2.
- **Jurisdiction-specific legal behavior** — the precise legal interpretation of any speed-limit, enforcement-tolerance, camera, or violation rule in any specific country or region. See [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §11, §13.2.

## Source traceability

Each Canon truth above is supported by one or more sources. Links are relative to this file.

- **Truth 1 — RoadAhead is an anticipatory road-understanding assistant.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose) and §22 (Current working POC V1 summary).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §1 (Purpose of This Document) and §2 (Decision Principle).
- **Truth 2 — RoadAhead is not a turn-by-turn navigator.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose), §17 (OSM role in POC V1 — "no runtime OSM dependency"), §18 (Explicit non-goals — "full route engine or navigation"), §22 (Current working POC V1 summary).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1 (Executive recommendation — "POC V1 is not a navigator"), §2 (RoadAhead does not need ETA / traffic / lane guidance / turn-by-turn / rerouting), §10.1 ("RoadAhead is not a navigator").
- **Truth 3 — RoadAhead is not an anti-radar or enforcement-avoidance product.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose), §13.1 ("What camera-risk feedback must not say"), §16 (Datakam / OpenSpeedcam data source policy — "POC V1 is not a navigator and not an anti-radar").
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1 (no legal correctness claim), §2 (camera-risk feedback definition — "possible camera risk only"), §7.2 (tier names are severity, not legal verdicts).
- **Truth 4 — RoadAhead does not claim legal speed-limit correctness.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose — "without claiming legal correctness of speed limits"), §10 (Speed reference model — no active `provisional_limit`), §16 (Datakam / OpenSpeedcam data source policy — "must not claim legal correctness"), §18 (Explicit non-goals — "full legal speed-limit validity").
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1, §2 (legal truth / non-claim boundary), §11 (Russia +20 km/h is a working default, not legal truth).
- **Truth 5 — RoadAhead does not claim safety certification or guarantee safe driving behavior.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose), §13.1 ("What camera-risk feedback must not say"), §18 (Explicit non-goals — "a production-grade braking/physics model"; no Android overlay implementation; no automatic promotion of any external data to truth).
  - [`../../../research/roadahead-threshold-tuning-recommendation.md`](../../../research/roadahead-threshold-tuning-recommendation.md) §1 (no safety / human-factors certification), §6.3 (reaction-time defaults do not constitute human-factors certification), §12 (no real-world safety claims).
- **Truth 6 — External datasets are candidate inputs, not verified product truth.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §1 (Purpose — Datakam / OpenSpeedcam is `ExternalObservation` candidate data, not `VerifiedRoadEvent` truth), §14 (Data preparation), §16 (Datakam / OpenSpeedcam data source policy).
  - [`../../../research/roadahead-prepared-event-store-recommendation.md`](../../../research/roadahead-prepared-event-store-recommendation.md) §1 (raw external data is import-only; runtime uses prepared candidate events), §2 (ExternalObservation definition), §11.1 (Datakam / OpenSpeedcam remains candidate, not `VerifiedRoadEvent`).
- **Truth 7 — POC V1 validates driver-facing behavior in an interactive web route emulator before Android overlay work.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §2 (Validation target and staged path), §3 (Interactive web route emulator), §22 (Current working POC V1 summary).
  - [`../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../../wip/roadahead-poc-v1-initial-product-decisions-workbook.md) §3 (Summary of Recommended Direction), §5 (Decision Q1 — First Validation Target), §15 (Decision Q11 — Testing / Simulation Strategy).
- **Truth 8 — Route provider data is not RoadAhead truth, except for route geometry when explicitly used as a geometry source.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §4 (Route geometry provider boundary), §17 (OSM role in POC V1), §18 (Explicit non-goals — provider speed / ETA / traffic speed is not RoadAhead truth).
  - [`../../../research/roadahead-route-geometry-provider-recommendation.md`](../../../research/roadahead-route-geometry-provider-recommendation.md) §1 (Executive recommendation), §2 (RouteGeometry contract — RoadAhead does not need provider ETA / traffic / speed-limit data), §10.1 (provider supplies geometry only; provider speed / ETA / traffic / segment speed are not RoadAhead truth).
- **Truth 9 — RoadAhead guidance must be conservative when applicability or data truth is ambiguous.**
  - [`../../wip/roadahead-poc-v1-three-circle-assistant.md`](../../wip/roadahead-poc-v1-three-circle-assistant.md) §8.3 (Direction applicability / route-path applicability — conservative suppression), §16 (Datakam / OpenSpeedcam — direction applicability must follow §8.3).
  - [`../../../research/roadahead-direction-applicability-recommendation.md`](../../../research/roadahead-direction-applicability-recommendation.md) §1 (Executive recommendation — "deliberately favors suppression on doubt"), §5 (behavior when DIRECTION conflicts with route geometry — suppress by default, expose in debug), §10.1 (conservative suppression as future Canon candidate).
  - [`../../../research/roadahead-enforcement-profile-recommendation.md`](../../../research/roadahead-enforcement-profile-recommendation.md) §1, §6.3 (cautious treatment of `road_bump` under enforcement profile), §7.2 (tier names are severity, not legal verdicts).

Umbrella issue and governance:

- Issue [#21 — Promote stable RoadAhead POC V1 WIP decisions to Canon / decision records](https://github.com/AlexanderTsarkov/RoadAhead/issues/21) — umbrella issue under which this Canon promotion lives.
- [`../README.md`](../README.md) — area-based Canon structure, area document template, and area split / merge / cross-link rules (added by PR #29).
- [`../../README.md`](../../README.md) — product documentation map, status-layer rules, and Canon promotion rule (added by PR #29).

## Related areas

The areas below are the planned Canon areas listed in [`../README.md`](../README.md). At the time of this PR, only `product-boundary` exists as a Canon doc; the others are planned-but-not-created. Per the area README rules ("do not pre-link to areas that have not been created"), the related areas are referenced by name and routed through [`../README.md`](../README.md), not by direct path.

- **`validation-emulator`** (planned; not yet a Canon area) — Phase 0 web emulator scope, route-known validation mode first, Android deferral mechanics. Provides the specific shape of the validation surface that truth 7 commits to at the boundary level. See planning entry in [`../README.md`](../README.md).
- **`route-geometry`** (planned; not yet a Canon area) — provider-supplies-geometry-only contract, normalized `RouteGeometry` shape, projection / tangent / route-position utilities. Provides the specific mechanics behind truth 8. See planning entry in [`../README.md`](../README.md).
- **`event-data`** (planned; not yet a Canon area) — external-source data policy, raw-data-import-only rule, prepared normalized candidate event shape, future `VerifiedRoadEvent` boundary. Provides the specific data-shape behind truth 6. See planning entry in [`../README.md`](../README.md).
- **`event-applicability`** (planned; not yet a Canon area) — route / path applicability, direction applicability against the local route approach tangent, branch / intersection ambiguity handling, conservative suppression. Provides the specific selection mechanics behind truth 9. See planning entry in [`../README.md`](../README.md).
- **`speed-reference`** (planned; not yet a Canon area) — active POC V1 modes (`unknown`, `approach_target`), target-speed semantics from the event itself, `provisional_limit` deferral. Refines, at the modes level, parts of truths 4 and 6 without changing the boundary-level commitments. See planning entry in [`../README.md`](../README.md).
- **`feedback-and-enforcement`** (planned; not yet a Canon area) — pass-feedback tiers, camera-risk variant, configurable `enforcement_tolerance` severity buffer (not a legal claim), strict separation between `target_speed`, `enforcement_tolerance`, and `display_hysteresis_kmh`. Refines the camera / enforcement non-claim posture from truths 3 and 4. See planning entry in [`../README.md`](../README.md).
- **`ui-model`** (planned; not yet a Canon area) — three-circle UI, primary / secondary event roles, visual states, sign-like primitives, POC V1 horizontal-only layout. Refines, at the UI shape level, the conservative driver-facing posture from truth 9. See planning entry in [`../README.md`](../README.md).
- **`tuning-and-validation`** (planned; not yet a Canon area) — threshold tuning, scenario sweep methodology, validation evidence required before promoting a tuning value to Canon, what remains WIP until measured. Anchors the "no tuning values in this PR" rule expressed in [Still WIP / not Canon](#still-wip--not-canon). See planning entry in [`../README.md`](../README.md).
