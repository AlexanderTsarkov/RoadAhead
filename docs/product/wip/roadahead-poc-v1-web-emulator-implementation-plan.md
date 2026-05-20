---
status: Implementation planning WIP
canon: false
source: docs/product/areas/* (Product Canon, primary); docs/product/wip/roadahead-poc-v1-three-circle-assistant.md; docs/research/* (Issue #20 recommendations)
purpose: Plan Phase 0 web route emulator implementation slices for RoadAhead POC V1 under Issue #17
context: RoadAhead Phase 0 — interactive web route emulator, route-known mode; planning doc only (no implementation)
---

# RoadAhead POC V1 — Phase 0 Web Emulator Implementation Plan

> **Status — Implementation planning WIP. Not Canon. Not implementation truth.**
> This document is **planning input** for a sequence of follow-up implementation
> issues under Issue [#17](https://github.com/AlexanderTsarkov/RoadAhead/issues/17).
> It does **not** itself implement the emulator. It does **not** define stable
> product behavior — Product Canon under [`../areas/`](../areas/) does. It does
> **not** promote any numeric value to Canon — per [`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
> truth 1, no numeric tuning value is Product Canon at this stage. The
> recommendations below are subject to revision by future implementation issues,
> ADRs, or Canon updates.

## 1. Goal and non-goals

### 1.1 Goal

Define a small, reviewable sequence of implementation slices for the Phase 0
**interactive web route emulator** ([`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
truths 1, 2, 4), so that follow-up issues can be created and implemented in
small PRs under the Issue #17 umbrella.

### 1.2 Non-goals

- Do **not** implement any emulator code, fixtures, or provider integration in
  this PR.
- Do **not** modify Product Canon under [`../areas/`](../areas/).
- Do **not** rewrite the WIP product spec or the companion workbook.
- Do **not** create implementation issues from this PR (issue titles and bodies
  drafted below are drafts only; their creation is a separate, explicit action).
- Do **not** commit raw external data (per [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 3).
- Do **not** add backend, accounts, sync, telemetry, or other infrastructure
  (per `CLAUDE.md` "Do not add infrastructure casually").
- Do **not** promote any numeric tuning value to Canon (per [`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truths 1, 2, 3).

## 2. Canon constraints that govern every implementation slice

Every implementation slice below is subject to the Canon truths in the
nine area-based Canon docs under [`../areas/`](../areas/). The short list
below is a working summary, not a re-statement of Canon.

- RoadAhead is **not** a navigator, **not** an anti-radar, **not** a legal
  speed-limit authority, **not** safety-certified
  ([`../areas/product-boundary/product-boundary.md`](../areas/product-boundary/product-boundary.md)
  truths 2, 3, 4, 5).
- External road-event data (Datakam, OpenSpeedcam) is **candidate input**, not
  verified RoadAhead truth ([`../areas/product-boundary/product-boundary.md`](../areas/product-boundary/product-boundary.md)
  truth 6; [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truths 1, 5).
- Raw Datakam / OpenSpeedcam `speedcam.txt` is **import / source material only**;
  the emulator consumes prepared, normalized candidate events ([`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truths 2, 4).
- Route providers may supply **geometry only**; provider speed / ETA / traffic /
  segment speed / posted-limit data is excluded from RoadAhead truth
  ([`../areas/product-boundary/product-boundary.md`](../areas/product-boundary/product-boundary.md)
  truth 8; [`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  truths 5, 6).
- Candidate events must pass **applicability checks** before driver-facing
  display or feedback; **geographic proximity alone is insufficient**
  ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truths 1, 2).
- POC V1 applicability is **route-known first**; route-unknown is future
  strategy only ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 3; [`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truths 4, 5).
- Speed reference is **guidance context**, not legal truth; only `unknown` and
  `approach_target` are active POC V1 states ([`../areas/speed-reference/speed-reference.md`](../areas/speed-reference/speed-reference.md)
  truths 1, 3, 4, 5).
- Feedback / enforcement is **advisory severity semantics**, not legal
  enforcement truth ([`../areas/feedback-and-enforcement/feedback-and-enforcement.md`](../areas/feedback-and-enforcement/feedback-and-enforcement.md)
  truths 1, 8, 9, 12).
- The three-circle UI is the POC V1 driver-facing information architecture; the
  primary event is selected by route-order applicability, not raw proximity;
  exact visual design remains WIP ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md)
  truths 3, 4, 5, 6, 7, 8, 15).
- No numeric tuning value is Product Canon; emulator defaults are WIP only and
  require validation evidence before any promotion ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truths 1, 2, 3, 7, 8).
- Route-specific derived fields (projection, approach tangent, applicability
  decision) are **per-route / per-session** and must not be persisted onto the
  base event record ([`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 11; [`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 13).

A slice that would violate any of the above is **not a tuning change**; it is a
Canon change and requires its own Canon / ADR PR.

## 3. Planning decisions

### 3.1 Emulator path decision (recommendation: separate app)

**Question:** Should Phase 0 evolve the existing `web/datakam-viewer` or create a
separate `web/roadahead-emulator` app?

**Recommendation:** Create a **separate `web/roadahead-emulator`** app. Keep
`web/datakam-viewer` unchanged as a local QA tool.

**Rationale:**

- `web/datakam-viewer` is a Leaflet + TypeScript QA tool that loads raw
  `speedcam.txt` directly via the browser file picker for manual visual QA. It
  is intentionally a raw-data tool ([`web/datakam-viewer/README.md`](../../../web/datakam-viewer/README.md)).
- The Phase 0 emulator is a different surface: it consumes **prepared
  normalized candidate events** ([`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 4), renders a known route polyline, simulates vehicle progress, and
  drives the three-circle anticipatory UI ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md)
  truth 3). It does not parse `speedcam.txt` at runtime.
- Mixing a manual-QA viewer and an anticipatory three-circle emulator into one
  app would entangle two distinct product / testing surfaces and would risk
  blurring the candidate-vs-prepared boundary that
  [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  protects.
- Reusable utilities (e.g., longitude-first coordinate helpers, type
  normalization tables, type-color conventions) can be shared via a small
  shared module **only if it materially reduces duplication later**. The first
  implementation slice should not pay a refactor tax to make this happen
  upfront.

**Alternative considered:** Evolve `web/datakam-viewer` into the emulator and
treat the QA mode as a sub-feature. Rejected because the QA tool's purpose
(direct raw data inspection) and the emulator's purpose (consume prepared
events, drive three-circle behavior on a known route) diverge enough that one
app would either constrain the other or grow into two apps with one
implementation.

**Open question:** Whether a future "QA-status export" path from
`web/datakam-viewer` informs a future `validation_status`-like field on
prepared events is out of scope for this planning doc; it remains a future
WIP / research question per [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
truth 10 / Still WIP.

### 3.2 First minimal vertical slice

**Goal:** Demonstrate end-to-end Canon flow on a single, non-ambiguous
scenario, so that the rest of the slices have a working baseline to build on.

**In scope for the first vertical slice:**

- Load **one** route geometry fixture (a single synthetic polyline; see §3.4).
- Load **one** small prepared candidate event fixture (one or two synthetic
  `speed_limit` events on the route; see §3.3).
- Render the route polyline on a map (visual reference only; not a navigator
  feature; per [`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  product rules).
- Simulate a vehicle along the route with manual speed control
  ([`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 6); no provider speed.
- Run a **minimal applicability gate**:
  - route projection (event-on-route distance);
  - simple route-order ahead/behind check;
  - simple direction compatibility against the local route approach tangent;
  - no branch-ambiguity logic yet — the chosen scenario must be unambiguous;
- Select a single applicable `speed_limit` event as the primary event
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truths 5, 7).
- Produce a `speed-reference` state of `approach_target` with
  `target_speed_kmh` sourced from the applicable event
  ([`../areas/speed-reference/speed-reference.md`](../areas/speed-reference/speed-reference.md)
  truths 4, 5).
- Render a **minimal three-circle UI**: current-speed circle, primary-event
  circle (target speed displayed), secondary-context circle (empty or "no
  upcoming secondary"). Visual styling is non-Canon and may be minimal
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truths 9,
  15).
- Expose a **debug panel** that explains, for each candidate event, the
  applicability decision and at least the route projection / direction-delta /
  decision-reason fields ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 12; [`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 7).

**Explicitly out of scope for the first vertical slice:**

- Branch ambiguity, parallel carriageway, ramp / off-ramp ambiguity
  (deferred to Slice 4 — Event applicability foundation).
- Pass-feedback hold, camera-risk feedback, `unsafe_likely`, enforcement
  tolerance (deferred to a later slice in the feedback / enforcement track).
- Multiple event types beyond `speed_limit` (`static_camera`, `road_bump`
  deferred to a later slice).
- Provider integration (no Yandex / OSRM / GraphHopper integration; synthetic
  fixtures only).
- Display hysteresis, smoothing, deceleration profiles, urgency bands
  (all numeric, all deferred to later slices and validated via scenario
  sweeps).
- Scenario sweep harness (deferred to Slice 5).
- Any Android work (deferred per [`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 2).

### 3.3 Prepared event fixture contract (planning level)

The first emulator slice should consume a small **synthetic** JSON fixture
shaped as a stable subset of the future prepared-event schema. The fixture
must respect [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md):
no raw rows, no committed external data (truths 3, 13), provenance preserved
(truth 8), candidate-only semantics (truths 1, 5).

**Recommended starting field set (planning level only; not Canon):**

- `event_id` — deterministic stable identifier for the synthetic event.
- `source` — e.g., `synthetic_fixture` for fixtures; `datakam`,
  `openspeedcam` for future imports (per [`../../research/roadahead-prepared-event-store-recommendation.md`](../../research/roadahead-prepared-event-store-recommendation.md)
  §5.1).
- `source_event_id` / `source_idx` — synthetic id for fixtures.
- `source_dataset_version` — `synthetic-fixture-v0` or equivalent for fixtures.
- `raw_type` — preserved for provenance; `null` allowed for synthetic fixtures.
- `normalized_type` — one of `speed_limit`, `static_camera`, `road_bump`
  (initial POC V1 supported set, per [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 6).
- `lon`, `lat` — WGS84 decimal degrees, longitude-first ([`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  truth 9).
- `target_speed_kmh` — nullable; required for `speed_limit`.
- `source_direction_deg` — nullable candidate signal ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 8); raw `DIRECTION`-like value for non-synthetic data; may be set
  deliberately on fixtures for direction-applicability tests.
- `source_dirtype` — nullable candidate signal; `0` / `1` / `2` semantics
  remain WIP per [`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  Still WIP and [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md)
  §3.E.
- `imported_at` — ISO timestamp; provenance only.

**Hard rules:**

- The fixture must not include verbatim raw rows from Datakam / OpenSpeedcam
  (per [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 13; [`../../research/roadahead-prepared-event-store-recommendation.md`](../../research/roadahead-prepared-event-store-recommendation.md)
  §6.2).
- The fixture must label itself synthetic at the file level.
- Route-specific fields (projection, tangent, applicability decision) must
  **not** appear in the fixture — they are computed per route at runtime
  ([`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 11).
- The fixture file format is JSON for the first slice; GeoJSON is a valid
  later option. The exact directory layout and schema details remain WIP per
  [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  Non-goals and Still WIP.

### 3.4 Route geometry fixture contract (planning level)

The first emulator slice should consume a **synthetic, hand-authored** route
geometry fixture; no provider integration. The fixture must respect
[`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md):
provider-derived geometry is not a long-lived committed fixture (truth 10);
event-selection consumes the normalized contract, not provider-specific objects
(truths 7, 8).

**Recommended starting shape (planning level only; not Canon):**

- A GeoJSON `LineString` `Feature` with longitude-first `[lon, lat]`
  coordinates (per [`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  truth 9 and [`../../research/roadahead-route-geometry-provider-recommendation.md`](../../research/roadahead-route-geometry-provider-recommendation.md)
  §2).
- A small set of `properties` recording provider provenance: `provider:
  synthetic_fixture`, `generated_at`, optional `notes`.
- An accompanying adapter that normalizes the GeoJSON `LineString` into the
  internal `RouteGeometry` representation (the exact shape of which remains
  WIP per [`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  Still WIP).

**Hard rules:**

- The fixture must label provenance as synthetic, not provider-derived
  ([`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  truth 10 / product rules).
- The fixture must not be a provider response that has been "renamed" to
  GeoJSON; even a one-time export of provider geometry is provider-derived.
- The emulator must consume the normalized geometry, not a provider-native
  object, so that the future provider adapter (Yandex / OSRM / GraphHopper /
  GPX / KML / GeoJSON-import / recorded GPS) can be added without rewriting
  event-selection logic.

### 3.5 Emulator tuning config contract (planning level)

A separate **emulator tuning config** object should exist from Slice 3
onwards; it is **not** Canon ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
truths 1, 2). The config is the single place where all numeric WIP defaults
live so they can be inspected, swept, and revised.

**Recommended starting shape (planning level only; not Canon):**

- A typed config object (TypeScript or equivalent) containing the WIP defaults
  from the threshold tuning research recommendation, the enforcement profile
  research recommendation, and the direction applicability research
  recommendation.
- Visibility: the active config must be surfaced in the emulator's debug
  panel ([`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 7; [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md)
  §1, §13).
- Mutability: at minimum, config is replaceable at emulator start; live
  switching is nice-to-have ([`../../research/roadahead-enforcement-profile-recommendation.md`](../../research/roadahead-enforcement-profile-recommendation.md)
  §1).
- Labeling: every numeric field must carry a comment / metadata noting that
  it is a WIP emulator default, not Product Canon.

**The exact config shape remains WIP** per [`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
Non-goals and Still WIP.

## 4. WIP emulator defaults vs Product Canon

The following numeric values appear in the Issue #20 research recommendations
and the WIP product spec. They are usable as **emulator starting defaults** in
implementation slices, but they are explicitly **not Product Canon**
([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
truths 1, 2). They may not be promoted to Canon without recorded validation
evidence and an explicit Canon / ADR PR
([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
truths 3, 7, 8).

| Concern | Working defaults (WIP only) | Source |
|---|---|---|
| Direction-applicability deltas (`direction_delta_*_deg`) | `confident` / `accept` / `ambiguous` / `reject` bands | [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md) §4 |
| Route projection bands (`route_projection_accept_m` / `_warn_m` / `_reject_m`) | starting bands | [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md) §4 |
| Branch / projection-competitor heuristics (`branch_zone_radius_m`, `projection_competitor_delta_m`, `competitor_heading_delta_deg`) | starting values | [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md) §3.G, §4 |
| Approach window length for local tangent | starting bounds | [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md) §3.D |
| Datakam `DIRECTION + 180` working interpretation | working assumption only | [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md) §3.E, §5 |
| Reaction time defaults (`reaction_time_default_s`, `reaction_time_high_speed_s`) | starting values | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §6 |
| Deceleration profile (`smooth` / `normal` / `strong` / `emergency`) | starting values | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §4 |
| Per-event-type lookahead guardrails (min / max) | starting values | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §8 |
| `display_hysteresis_kmh`, `clear_hysteresis_kmh` | starting values | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §7 |
| `alpha_smoothing_ms` | starting value | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §7 |
| `pass_feedback_hold_s` | starting value | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §8 |
| Enforcement profile (`russia_default_plus_20_kmh`, absolute +20 km/h) | working Russia POC default | [`../../research/roadahead-enforcement-profile-recommendation.md`](../../research/roadahead-enforcement-profile-recommendation.md) §1, §5, §11 |
| `enforcement_threshold_speed = target_speed_kmh + resolved_enforcement_tolerance_kmh` derivation formula | working derivation; not legal | [`../../research/roadahead-enforcement-profile-recommendation.md`](../../research/roadahead-enforcement-profile-recommendation.md) §3 |
| Pass-feedback tier boundaries (Tier 0 / Tier 1 / Tier 2) | working severity model | [`../../research/roadahead-enforcement-profile-recommendation.md`](../../research/roadahead-enforcement-profile-recommendation.md) §7 |
| `unsafe_likely` numeric formula | working formula | [`../../research/roadahead-threshold-tuning-recommendation.md`](../../research/roadahead-threshold-tuning-recommendation.md) §5.4 |
| Camera-risk pulse / blink cadence | working visual cadence | [`../../research/roadahead-enforcement-profile-recommendation.md`](../../research/roadahead-enforcement-profile-recommendation.md) §6.2 |

Every value above must be implemented as a field of the emulator tuning
config (§3.5), surfaced in the debug panel, and labeled as a WIP emulator
default at the type / comment level.

No value above may be hard-coded into product logic, into UI labels, or into
debug strings as legally / safety / regulatorily authoritative.

No Russia-specific value above (or any other jurisdiction value) is legally
verified. It is a configurable emulator profile only
([`../areas/feedback-and-enforcement/feedback-and-enforcement.md`](../areas/feedback-and-enforcement/feedback-and-enforcement.md)
truths 4, 12).

## 5. Proposed initial implementation issue sequence

The following are **drafted issues**, not created issues. Their creation is a
separate, explicit step that should happen after this PR merges.

Each draft issue has a title, a short body summary, dependency order, and
draft acceptance criteria. Numeric tuning is intentionally not in the first
three slices.

### Slice 1 — App baseline / emulator path decision (ordinary issue)

**Title (draft):** Phase 0 emulator — app baseline / path decision

**Body summary (draft):**

Decide whether to evolve `web/datakam-viewer` or create
`web/roadahead-emulator`, and set up the chosen baseline. No three-circle
behavior, no fixtures, no applicability code — only the baseline (project
scaffold, dev / build commands, README, TypeScript / Vite setup, lint /
type-check).

Recommended path: separate `web/roadahead-emulator` (see
[`docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`](roadahead-poc-v1-web-emulator-implementation-plan.md)
§3.1).

**Depends on:** none.

**Draft acceptance criteria:**

- Path decision documented in the issue / PR.
- Baseline app exists at the chosen path with `npm run dev` / `npm run build`
  / `npx tsc --noEmit` working.
- `web/datakam-viewer` remains unchanged (if new app path is chosen).
- README documents app purpose: Phase 0 emulator, not the eventual delivery
  surface, consistent with [`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 3.
- No fixtures, no event logic, no UI behavior beyond a placeholder page.
- No Canon edits.
- No numeric tuning values in code.

### Slice 2 — Fixture contracts (ordinary issue)

**Title (draft):** Phase 0 emulator — synthetic fixture contracts (route geometry, prepared events, emulator tuning config)

**Body summary (draft):**

Introduce **synthetic** fixtures and contract types for:

- one synthetic route geometry fixture (GeoJSON `LineString`, longitude-first;
  synthetic provenance);
- one small synthetic prepared candidate event fixture (JSON; one or two
  `speed_limit` events on the route; synthetic provenance);
- an emulator tuning config object (typed; WIP defaults from §4; surfaced in
  the debug panel).

Schema notes follow [`docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`](roadahead-poc-v1-web-emulator-implementation-plan.md)
§3.3, §3.4, §3.5. No provider integration. No raw external data. No durable
store decision.

**Depends on:** Slice 1.

**Draft acceptance criteria:**

- Fixtures live inside `web/roadahead-emulator/fixtures/` (exact path subject
  to the implementation issue).
- Each fixture file labels its provenance (`synthetic_fixture`).
- Prepared event fixture contains synthetic rows only (no Datakam /
  OpenSpeedcam verbatim rows; [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  truth 13).
- Route geometry fixture uses longitude-first coordinates
  ([`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  truth 9).
- Tuning config object contains WIP defaults with comments / metadata
  marking them non-Canon
  ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truths 1, 2).
- Type definitions documented; no Canon edits.

### Slice 3 — First minimal vertical slice (ordinary issue)

**Title (draft):** Phase 0 emulator — first minimal vertical slice (route-known, single applicable speed_limit)

**Body summary (draft):**

Implement the end-to-end Canon flow defined in
[`docs/product/wip/roadahead-poc-v1-web-emulator-implementation-plan.md`](roadahead-poc-v1-web-emulator-implementation-plan.md)
§3.2 on the Slice 2 fixtures: load route + event fixtures, simulate vehicle
progress with manual speed control, run minimal applicability gate, select
one applicable `speed_limit` event in an unambiguous scenario, produce
`approach_target` speed-reference with `target_speed_kmh`, show minimal
three-circle state, expose minimal debug panel.

**Depends on:** Slice 1, Slice 2.

**Draft acceptance criteria:**

- Route polyline renders on a map (visual reference; no navigator framing
  per [`../areas/route-geometry/route-geometry.md`](../areas/route-geometry/route-geometry.md)
  product rules).
- Simulated vehicle moves along the route under manual speed control
  ([`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 6); no provider speed used.
- Minimal applicability gate accepts the single applicable event in the
  chosen non-ambiguous scenario; debug panel records the decision and the
  projection / direction-delta values
  ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 12).
- Speed reference becomes `approach_target` only when an applicable event
  with a target speed is selected; otherwise `unknown`
  ([`../areas/speed-reference/speed-reference.md`](../areas/speed-reference/speed-reference.md)
  truths 3, 4).
- Three-circle UI shows current speed / primary event / empty secondary
  context; minimal styling acceptable
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truths
  3, 4, 5, 6, 15).
- Debug panel surfaces the active tuning config
  ([`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 7).
- No anti-radar / navigator framing in UI labels or copy
  ([`../areas/product-boundary/product-boundary.md`](../areas/product-boundary/product-boundary.md)
  product rules).
- Debug visibility does not promote any state to driver-facing eligibility
  beyond what is in this slice
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truth 14).
- No branch / ambiguity / pass-feedback / camera-risk / enforcement
  behavior yet.
- No numeric Canon promotion.

### Slice 4 — Event applicability foundation (likely sub-umbrella issue)

**Title (draft):** Phase 0 emulator — event applicability foundation (route projection, direction compatibility, suppression reasons)

**Body summary (draft):**

Expand the minimal applicability gate from Slice 3 into a full route-known
applicability pipeline per [`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md):

- route projection with cross-track distance and segment index;
- direction compatibility against local route approach tangent (not vehicle
  instantaneous heading; [`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 7);
- conservative handling of bidirectional / unknown / unclear source
  direction semantics ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truths 8, 9);
- ambiguity classes — parallel carriageway, ramp, T-junction, projection
  competitor — at least at the principle level
  ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 10);
- suppression-reason enum recorded in debug.

This slice is likely **too large** for one issue. The recommendation is to
mark it as a **sub-umbrella** under Issue #17, with child issues for:
projection pipeline; direction-compatibility pipeline; ambiguity heuristics;
suppression-reason debug surface. Exact split belongs to the sub-umbrella
issue.

**Depends on:** Slice 3.

**Draft acceptance criteria (umbrella-level):**

- Pipeline orderly per [`../../research/roadahead-direction-applicability-recommendation.md`](../../research/roadahead-direction-applicability-recommendation.md)
  §3; ordering itself remains WIP per [`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  Non-goals.
- All thresholds sourced from the emulator tuning config
  ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truths 1, 2).
- Suppressed candidates remain inspectable in debug
  ([`../areas/event-applicability/event-applicability.md`](../areas/event-applicability/event-applicability.md)
  truth 12).
- No driver-facing surfacing of suppressed candidates
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truth 13).
- No Canon promotion of any numeric.

### Slice 5 — Scenario sweep / validation recording (ordinary issue)

**Title (draft):** Phase 0 emulator — scenario sweep harness and validation evidence recording

**Body summary (draft):**

Add a minimal scenario sweep harness so that tuning candidates can be exercised
across a reproducible matrix of synthetic scenarios. Each run records: scenario
identity, active tuning configuration, observed behavior, and a reviewer
conclusion field ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
truths 4, 5).

Output format and acceptance gates remain WIP — this slice introduces the
harness, not the methodology Canon
([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
truth 16).

**Depends on:** Slice 3 (minimum); benefits from Slice 4.

**Draft acceptance criteria:**

- Scenario matrix is data-driven (e.g., JSON / TS table); not hard-coded.
- Each run record names scenario, configuration, observed behavior, and
  reviewer conclusion fields
  ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truth 5).
- Run records do not promote any numeric to Canon
  ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truth 7).
- Run records do not commit raw external data.

### 5.1 Dependency order

```
Slice 1 → Slice 2 → Slice 3 → Slice 4 (sub-umbrella) → Slice 5
                              ↓
                           (Slice 5 can also start once Slice 3 is in)
```

Slices 4 and 5 may proceed in parallel after Slice 3 if reviewer bandwidth
allows; Slice 4 is the larger of the two.

### 5.2 Ordinary issues vs sub-umbrella issues

- **Ordinary issues:** Slice 1, Slice 2, Slice 3, Slice 5. Each fits a small,
  reviewable PR.
- **Likely sub-umbrella issue:** Slice 4 (Event applicability foundation).
  Recommendation: keep Slice 4 as a sub-umbrella under Issue #17, with its own
  smaller child issues. This avoids one giant PR for projection + direction
  compatibility + ambiguity + suppression debug all at once.

### 5.3 Out-of-scope for the initial sequence

The following are **deliberately deferred** to later slices in the Issue #17
umbrella; they are not part of the initial five drafted above:

- Pass-feedback hold, camera-risk feedback, `unsafe_likely`, enforcement
  tolerance, jurisdiction profiles
  ([`../areas/feedback-and-enforcement/feedback-and-enforcement.md`](../areas/feedback-and-enforcement/feedback-and-enforcement.md)).
- Additional event types beyond the first slice's `speed_limit`
  (`static_camera`, `road_bump`).
- Provider integration (Yandex / OSRM / GraphHopper / GPX / KML / GeoJSON
  import / recorded GPS); fixture-only until validated.
- Production UI styling, accessibility, Android overlay UX, mobile permissions
  ([`../areas/ui-model/ui-model.md`](../areas/ui-model/ui-model.md) truth 15;
  [`../areas/validation-emulator/validation-emulator.md`](../areas/validation-emulator/validation-emulator.md)
  truth 2).
- Numeric Canon promotion for any value
  ([`../areas/tuning-and-validation/tuning-and-validation.md`](../areas/tuning-and-validation/tuning-and-validation.md)
  truths 1, 8).

## 6. Open questions

These are explicitly open and should be answered by the relevant implementation
issue, by a follow-up planning iteration, or by Canon / ADR work where Canon
review is the right venue:

- How should `web/datakam-viewer` QA exports inform a future `validation_status`
  on prepared candidate events? Out of scope for this planning doc; remains WIP
  per [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  Still WIP.
- Should the emulator load route geometry from a static fixture only in Slice 3,
  or already support a user-uploaded GPX / KML / GeoJSON path? Recommendation:
  fixture-only in Slice 3; user upload deferred to a later slice.
- Where in the repo should the fixtures, the tuning config, and the scenario
  sweep harness live? (Recommendation: under `web/roadahead-emulator/` with
  subfolders; exact layout left to implementation issues per CLAUDE.md "no
  Canon for file layout".)
- When does the prepared event fixture transition from JSON to a future SQLite
  store? Out of scope here; tracked under [`../areas/event-data/event-data.md`](../areas/event-data/event-data.md)
  Still WIP and [`../../research/roadahead-prepared-event-store-recommendation.md`](../../research/roadahead-prepared-event-store-recommendation.md)
  §3, §8.
- When does provider integration (most likely Yandex HTTP Router API or a GPX /
  KML / GeoJSON import path) become a slice? Recommendation: after Slice 3
  validates the route-known behavior on fixtures and after a deliberate
  provider-terms / key / domain-restriction review at integration time
  ([`../../research/roadahead-route-geometry-provider-recommendation.md`](../../research/roadahead-route-geometry-provider-recommendation.md)
  §3.A, §7).

## 7. What this document is not

- Not Product Canon. Does not change anything under [`../areas/`](../areas/).
- Not an implementation slice. Does not create code.
- Not a final list of implementation issues. The issue sequence above is a
  draft; the creation of those issues is a separate, explicit step.
- Not durable product truth. May be revised or superseded by future planning
  iterations, implementation issues, ADRs, or Canon updates.
- Not a numeric promotion. Numeric values cited from research recommendations
  are WIP emulator defaults only.

## 8. Related files

- [`../areas/`](../areas/) — Product Canon (primary authority).
- [`../areas/README.md`](../areas/README.md) — area taxonomy and Canon area
  template.
- [`../README.md`](../README.md) — product documentation map and status-layer
  rules.
- [`roadahead-poc-v1-three-circle-assistant.md`](roadahead-poc-v1-three-circle-assistant.md)
  — current WIP product spec (secondary source material).
- [`roadahead-poc-v1-initial-product-decisions-workbook.md`](roadahead-poc-v1-initial-product-decisions-workbook.md)
  — companion rationale workbook (secondary source material).
- [`../../research/`](../../research/) — five Issue #20 technical recommendation
  inputs (secondary source material).
- [`../../../_working/ITERATION.md`](../../../_working/ITERATION.md) — active
  sprint descriptor (RA-0008 — RoadAhead POC V1 Web Emulator Implementation
  Planning).
- [`../../../CLAUDE.md`](../../../CLAUDE.md) — stable AI / Cursor operating
  rules.
- [`../../../AGENTS.md`](../../../AGENTS.md) — Cursor Cloud / dev-environment
  instructions.

Umbrella issue:

- [#17 — Plan RoadAhead POC V1 web emulator implementation slices from Product Canon](https://github.com/AlexanderTsarkov/RoadAhead/issues/17)
