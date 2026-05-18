---
status: Research / technical recommendation
canon: false
source: POC V1 WIP spec §8.3 and §20.1; companion decision workbook Q16; Datakam research notes
purpose: Recommend a practical technical model for direction applicability in the POC V1 interactive web route emulator
context: RoadAhead POC V1, route-known mode first; route-unknown is future strategy only
---

# RoadAhead — Direction applicability / route-path applicability recommendation (POC V1)

> **Status — Research / technical recommendation. Not Canon.**
> This document is input for a future Canon / decision review. It is not an implementation plan, not an implementation slice, not a decision record, and not Canon. It does not promote Datakam/OpenSpeedcam to verified product truth and does not claim legal correctness of any speed limit.

## 1. Executive recommendation

For POC V1 — validated first in the **interactive web route emulator** in **route-known mode** — RoadAhead should select candidate events using **route-path applicability**, not pure nearest-point lookup.

Concretely:

- Candidate events (Datakam/OpenSpeedcam rows in scope: `speed_limit`, `static_camera`, `road_bump`) should be projected onto the **route polyline** returned by the route geometry provider.
- A candidate is eligible only if it is:
  - **near the route** (small route-projection cross-track distance), and
  - **ahead** of the vehicle on route order (with a small pass/jitter tolerance), and
  - **not branch-ambiguous** with respect to the chosen route branch (no plausible competing projection on a parallel carriageway, ramp, side road, fork, or intersection branch), and
  - **direction-compatible** with the **local route approach tangent** near the event (averaged route bearing over a short approach window before the event), not the vehicle's instantaneous current heading.
- The Datakam `DIRECTION` field is treated as a **candidate signal**, not verified truth. The working assumption (from manual QA on the Yaroslavl-Moscow corridor) is that `DIRECTION` represents the **sign/camera facing** direction, and that the applicable vehicle direction is approximately `(DIRECTION + 180) mod 360`. This assumption is non-final and must not be hard-coded as global truth in product logic.
- Direction conflicts should **normally suppress the event** in the driver-facing event selection ("conservative default"), but **must remain visible in debug/QA views** so suppression can be inspected and tuned.

This recommendation deliberately favors **suppression on doubt**. It is better to not show a candidate than to confidently show a sign/camera/hazard from the wrong road, wrong branch, opposite carriageway, or wrong direction — especially given the safety-sensitive nature of driver-facing UX.

## 2. Definitions

These terms are used throughout this document. They are intended to align with the WIP spec and the emulator debug surface; exact field names belong to later implementation slicing and may differ.

- **candidate event** — a Datakam/OpenSpeedcam row in the POC scope (`speed_limit`, `static_camera`, `road_bump`) that has passed source/type and corridor prefilters. Still a candidate, not a confirmed event.
- **route polyline** — the ordered sequence of geographic points returned by the route geometry provider for the current route, used only as geometry (provider speed/ETA/traffic-speed are not RoadAhead truth — see WIP spec §4).
- **vehicle_route_position_m** — the along-route distance of the vehicle, measured from the route start to the projection of the current vehicle position onto the route polyline.
- **event_route_position_m** — the along-route distance from the route start to the projection of the candidate event onto the route polyline.
- **distance_ahead_m** — `event_route_position_m − vehicle_route_position_m`. Positive means the event is ahead on the route.
- **route_projection_distance_m / cross_track_distance_m** — the perpendicular distance from the candidate event point to its nearest point on the route polyline. Small values mean the candidate is near the route.
- **local route approach tangent** — the local bearing of the route polyline **before** the event, measured over a short approach window (typically averaged across the segment(s) immediately preceding the projection point). Used in place of the vehicle's instantaneous heading for direction comparisons.
- **source_direction_deg** — the raw `DIRECTION` value from the Datakam row, in degrees from north.
- **source_dirtype** — the raw `DIRTYPE` value from the Datakam row (`0`, `1`, or `2`; see WIP spec §7.1 and the `datakam-road-bump-direction-semantics.md` research note).
- **vehicle_applicable_direction_deg** — the inferred direction(s) of vehicle travel for which the candidate event is intended to apply, derived from `source_direction_deg` and `source_dirtype` under the working `DIRECTION + 180` assumption.
- **direction_delta_deg** — the absolute angular difference (wrapped to `[0, 180]`) between the local route approach tangent and the nearest applicable vehicle direction.
- **branch ambiguity** — a situation where the route projection of the candidate event is plausibly close to more than one road segment (e.g., parallel carriageway, ramp, frontage road, T-junction branch, fork). The emulator cannot confidently attribute the event to the chosen route branch.
- **projection competitor** — an alternative route or road segment whose projection of the candidate event is within a small delta of the best cross-track distance and whose local bearing differs materially from the chosen route's local bearing.
- **applicability decision / reason codes** — a small enumeration recording why an event was accepted, suppressed, or flagged ambiguous. Used in the emulator debug surface so that suppressions are inspectable.

## 3. Route-known POC V1 applicability pipeline

The pipeline below describes an **ordered** sequence of checks that the emulator should run for every candidate, in route-known mode. Each step has clear failure semantics (accept / suppress / flag). All thresholds in this document are **starting defaults for emulator tuning**, not Canon (§4).

### 3.A. Source/type filter

Only POC-enabled types are eligible by default:

- `speed_limit` (Datakam `TYPE=101`);
- `static_camera` (Datakam `TYPE=1`);
- `road_bump` (Datakam `TYPE=102`).

`TYPE=106 other_danger` and other types remain excluded by default (see WIP spec §7.1 and §7.4).

The source/type filter is the cheapest gate; it should run first.

### 3.B. Route corridor candidate filter

Load or select candidates within a broad route corridor (bounding box plus a buffer around the route polyline). This is a coarse prefilter intended only to limit the working set; it is not an applicability decision.

Suggested default buffer: `route_corridor_prefilter_m ≈ 100–200 m`.

The corridor filter must not be used to suppress candidates for product reasons — its only purpose is performance.

### 3.C. Route projection

For each candidate that survives §3.B:

- Project the event point to the nearest point on the route polyline; record `projected_route_segment_index`.
- Compute `route_projection_distance_m` (cross-track distance) and `event_route_position_m` (along-route distance).
- Read `vehicle_route_position_m` from the emulator.
- Compute `distance_ahead_m = event_route_position_m − vehicle_route_position_m`.
- Apply the projection-distance bands (see §4):
  - `route_projection_distance_m ≤ route_projection_accept_m` → eligible, continue;
  - `route_projection_distance_m ≤ route_projection_warn_m` → eligible but flag `projection_warn`;
  - otherwise → **suppress** with reason `projection_too_far`.
- Apply the ahead/behind rule:
  - `distance_ahead_m ≥ −pass_or_behind_tolerance_m` → treat as ahead (a small negative value is tolerated to absorb GPS/projection jitter around the pass point);
  - otherwise → **suppress** with reason `behind_vehicle`.

### 3.D. Local route approach tangent

Compute the local route approach tangent **at the event**, not from the vehicle's current position or heading:

- Take the route polyline segments immediately **before** the event projection point.
- Compute the **averaged bearing** of those segments across an approach window of length `approach_window_m`.
- If the available window is shorter than `approach_window_min_m` (very short segment, sharp turn, polyline noise), fall back to a shorter valid window and set a debug flag (e.g., `approach_window_truncated = true`); do not refuse the candidate solely for this reason.

Recommended starting values:

- `approach_window_m` default = `50 m`;
- `approach_window_min_m` = `25 m`;
- `approach_window_max_m` = `100 m`.

Use the averaged bearing rather than a single tiny segment bearing to avoid noise/jitter from coarse polylines. The averaged tangent represents the direction the vehicle would be travelling as it approaches the event, which is what direction applicability is actually about.

### 3.E. Datakam direction interpretation

The current WIP assumption (from `datakam-manual-qa-status-semantics.md`, finding 1) is used, but kept **explicitly non-final**:

> Datakam `DIRECTION` likely represents the direction the sign/camera is facing, usually opposite to vehicle travel direction.

Therefore, for one-direction records:

```
vehicle_applicable_direction_deg = (source_direction_deg + 180) mod 360
```

For records with `source_dirtype = 2` (bidirectional in the source; common for `TYPE=102` road bumps — see `datakam-road-bump-direction-semantics.md`):

- Treat the candidate as **bidirectional** for POC V1.
- Compare the local route approach tangent to either of the two opposite applicable bearings (`vehicle_applicable_direction_deg` and `(vehicle_applicable_direction_deg + 180) mod 360`), accepting the smaller `direction_delta_deg`.
- Preserve the source `DIRECTION` in debug fields.
- Do not overinterpret `DIRTYPE=2` as verified global truth.

For records with `source_dirtype = 0` or unknown:

- Recommend **suppressing by default** for driver-facing event selection unless a later manually curated fixture explicitly allows the candidate through.
- Continue to show such candidates in debug/QA views.
- Rationale: `DIRTYPE=0` is a small, anomalous slice (≈0.04% of `TYPE=102` rows per the `datakam-road-bump-direction-semantics.md` audit); its semantics are unclear and the conservative posture is to not surface it to the driver until it is understood.

### 3.F. Direction delta check

Compute the angular delta between the local route approach tangent and the applicable vehicle direction(s) from §3.E. Wrap to `[0, 180]`.

Recommended starting thresholds (degrees, see §4):

- `direction_delta_confident_deg` ≤ 30 — strongly compatible;
- `direction_delta_accept_deg` ≤ 45 — accept if other checks pass;
- `direction_delta_ambiguous_deg` 45–60 — flag as ambiguous;
- `direction_delta_reject_deg` > 60 — reject as direction conflict.

Default POC behavior:

- `direction_delta_deg ≤ 45` and other checks pass → **eligible**;
- `45 < direction_delta_deg ≤ 60` → **suppress by default** in the driver-facing selection, mark `direction_ambiguous` in debug for tuning;
- `direction_delta_deg > 60` → **suppress** with reason `direction_conflict`.

`45°` is a deliberate starting value for emulator tuning, not Canon. The emulator should make it easy to flip thresholds among `30 / 45 / 60` and to inspect the resulting accept/reject counts on the same route.

### 3.G. Branch / fork / T-junction ambiguity

In route-known mode the **chosen** route branch is known, but the projection step can still accidentally snap a candidate from a nearby branch, a parallel carriageway, a ramp, a frontage/service road, or a side road. The conservative model below detects that ambiguity and suppresses on doubt.

Starting heuristic:

- For each candidate, after projection onto the route polyline, also project onto **nearby off-route road segments** if road geometry is available, or onto **alternative interpretations of the route polyline** (e.g., points within a small radius where the polyline doubles back near an intersection).
- Mark the candidate `projection_competing` / `branch_ambiguous` when:
  - another plausible projection exists within `projection_competitor_delta_m` of the best cross-track distance, **and**
  - the competing segment bearing differs from the chosen route's local bearing by more than `competitor_heading_delta_deg`, **or** the implied along-route position differs materially from the chosen route's along-route position.
- For events located inside a **branch zone** (within `branch_zone_radius_m` of a junction/fork/ramp), require a stricter accept:
  - both the projection step (§3.C) and the local tangent comparison (§3.D + §3.F) must clearly match the chosen route branch;
  - otherwise mark `branch_ambiguous`.

Default behavior for `branch_ambiguous`:

- **suppress** in driver-facing selection;
- keep visible in debug/QA views;
- record the competing segment(s) so the suppression can be inspected.

Recommended starting debug thresholds (see §4):

- `branch_zone_radius_m` 30–50 m;
- `projection_competitor_delta_m` 10–15 m;
- `competitor_heading_delta_deg` 30–45 degrees.

Note: in route-known mode the route choice resolves most branch ambiguity *at the geometry level*. The ambiguity here is about **whether the candidate event truly belongs to that branch**, not about whether the vehicle will take the branch. The conservative default is appropriate because external candidate coordinates are often offset to the side of the road and may snap to a wrong segment in dense intersections.

Route-unknown mode is explicitly out of scope for this pipeline (see §8).

### 3.H. Final eligibility decision

A candidate is eligible (driver-facing) only if:

- §3.A — type is enabled;
- §3.C — route projection distance is acceptable (or only `projection_warn`, which still passes);
- §3.C — event is ahead, within the pass/jitter tolerance;
- §3.G — no unresolved branch / projection ambiguity;
- §3.F — direction is compatible (`direction_delta_deg ≤ direction_delta_accept_deg`);
- the candidate is not disabled by source QA / manual status (e.g., `wrong` in the `datakam-manual-qa-status-semantics.md` workflow); QA status is a soft override (see §5).

Any failed step records a `suppression_reason_codes` entry. Multiple reasons can apply to one candidate; the emulator should preserve all of them rather than only the first.

## 4. Recommended starting defaults

All values below are **recommended starting defaults / emulator tuning values**. They are **not Canon** and **must be validated** in the web emulator before any promotion. Use cautious language when referring to them: "recommended starting default", "emulator tuning value".

| Field | Recommended starting default | Tuning range | Rationale |
|---|---|---|---|
| `route_corridor_prefilter_m` | 100–200 m | 100–500 m | Coarse perf prefilter; broad enough to never accidentally drop a candidate inside accept/warn projection bands. |
| `route_projection_accept_m` | 25–30 m | 15–40 m | Typical urban/highway candidate offset to side of road; tight enough to reject parallel carriageway snaps in most cases. |
| `route_projection_warn_m` | 30–50 m | 25–75 m | Borderline candidates; allowed through but flagged for debug. |
| `route_projection_reject_m` | > 50 m | > 50 m | Beyond this, suppression is safer than display. |
| `pass_or_behind_tolerance_m` | 5–10 m | 3–15 m | Absorbs GPS/projection jitter around the actual pass point so pass-feedback isn't flickered. |
| `approach_window_m` | 50 m | 25–100 m | Long enough to average polyline noise; short enough to reflect the actual local approach. |
| `approach_window_min_m` | 25 m | 10–30 m | Lower bound for short segments / sharp turns. |
| `approach_window_max_m` | 100 m | 75–150 m | Upper bound when polyline is sparse. |
| `direction_delta_confident_deg` | 30 | 20–35 | Strong match; eligible. |
| `direction_delta_accept_deg` | 45 | 30–60 | POC accept boundary. Most curves near approach should still pass. |
| `direction_delta_ambiguous_deg` | 45–60 | 45–75 | Flagged ambiguous; suppress in driver-facing selection by default. |
| `direction_delta_reject_deg` | > 60 | > 60 | Direction conflict; suppress. |
| `branch_zone_radius_m` | 30–50 | 20–75 | Defines the "near a junction/fork/ramp" zone where stricter accept applies. |
| `projection_competitor_delta_m` | 10–15 | 5–25 | How close a competing projection must be (in cross-track distance) to count as ambiguity. |
| `competitor_heading_delta_deg` | 30–45 | 20–60 | How different a competing segment's bearing must be to count as ambiguity. |

Notes:

- These defaults are intentionally **conservative**. The cost of a false positive (wrong-road or wrong-direction event) is higher than the cost of a false negative (missed display), particularly in safety-sensitive UX (see CLAUDE.md, "Safety-sensitive UX requires explicit review").
- The defaults should be made visible and adjustable in the emulator (config or debug UI), not buried in code.
- Final values must come from emulator experiments on known corridors before any move toward Canon (see §10).

## 5. Behavior when Datakam DIRECTION conflicts with route geometry but visual QA suggests the point is correct

This is one of the trickier real-world cases. The recommended posture is:

- **Do not silently trust Datakam `DIRECTION`.** It is a candidate signal, not verified truth (`datakam-manual-qa-status-semantics.md`, finding 1).
- **Do not silently trust visual QA as product truth either.** Manual QA is `looks_correct` evidence, not `VerifiedRoadEvent` (`datakam-manual-visual-validation.md`, "Validation level").
- When the route projection is strong (small `route_projection_distance_m`, clearly ahead, no branch ambiguity) but `DIRECTION` conflicts (`direction_delta_deg > direction_delta_accept_deg`):
  - **suppress by default** in the driver-facing event selection;
  - expose the candidate as `direction_conflict` in the emulator debug surface (full row visible);
  - allow the QA/research view to inspect the candidate alongside the route and the computed local approach tangent;
  - allow a **future, separate manually curated override mechanism** (e.g., a small reviewed fixture file with explicit per-event annotations) — **not** an implicit code-level rule.

Rationale: suppression protects against confidently displaying wrong-direction warnings. Preserving the evidence in debug protects against silently throwing away useful information that should inform future tuning, QA work, or a future manual override fixture.

The manual override mechanism is **out of scope for POC V1 driver-facing logic** and is **not** Canon. It is mentioned only so the data model does not foreclose it.

## 6. Debug fields for the emulator

The emulator should expose a debug surface per candidate event that makes accept/suppress decisions inspectable. Suggested minimum fields:

- `event_id`
- `source` (e.g., `datakam`)
- `source_idx` / `source_event_id`
- `raw_type` (Datakam `TYPE`)
- `normalized_type` (`speed_limit` / `static_camera` / `road_bump` / etc.)
- `target_speed_kmh`
- `source_dirtype` (Datakam `DIRTYPE`)
- `source_direction_deg` (raw)
- `applicable_vehicle_bearings_deg` (one or two bearings derived under the working `DIRECTION + 180` assumption)
- `local_route_approach_tangent_deg`
- `approach_window_m` (the window actually used, including a `approach_window_truncated` flag when applicable)
- `direction_delta_deg`
- `direction_check_state` (e.g., `confident` / `accept` / `ambiguous` / `reject` / `unknown_dirtype`)
- `route_projection_distance_m`
- `event_route_position_m`
- `vehicle_route_position_m`
- `distance_ahead_m`
- `projected_route_segment_index`
- `projection_competitors_count`
- `nearest_competitor_distance_delta_m`
- `nearest_competitor_heading_delta_deg`
- `branch_ambiguity_state` (e.g., `clear` / `in_branch_zone` / `branch_ambiguous`)
- `applicability_decision` (e.g., `eligible` / `suppressed` / `flagged`)
- `suppression_reason_codes` (list)
- `is_primary_candidate`
- `is_secondary_candidate`
- `qa_status` (from `datakam-manual-qa-status-semantics.md`, if available)
- `direction_interpretation_status` (from `datakam-manual-qa-status-semantics.md`, if available)
- `confidence` / `source_confidence` (if available)

These field names are informative, not prescriptive. The exact schema belongs to later implementation slicing of the emulator and the prepared event store (see WIP spec §14).

## 7. Validation plan (web emulator)

The validation plan is the path from "proposed defaults" to "tunable, then promotable" — not a substitute for it.

Use small **curated scenarios** on familiar corridors, not raw full-dataset truth. The Yaroslavl-Moscow corridor and the user's familiar local areas are the natural starting set (see `datakam-manual-visual-validation.md`).

Validate event types separately to avoid cross-type confusion:

- `speed_limit` (`TYPE=101`);
- `static_camera` (`TYPE=1`);
- `road_bump` (`TYPE=102`) — especially because `DIRTYPE=2` is the majority encoding here (`datakam-road-bump-direction-semantics.md`).

Validate against representative road geometry cases:

- straight road;
- curve before the event;
- event placed just after a curve;
- divided carriageway (two physically separated directions);
- opposite-direction candidate placed near the route;
- T-junction;
- fork;
- ramp / branch;
- parallel road (frontage, service, separated direction);
- event just after a turn;
- overpass / nearby crossing roads (if data exists in the corridor).

Comparison axes to record in the emulator:

- current vehicle heading vs **local route approach tangent** (verify the latter is what actually controls direction applicability);
- direction delta thresholds: `30 / 45 / 60`;
- approach windows: `25 / 50 / 100 m`;
- projection accept thresholds: `25 / 30 / 50 m`;
- branch ambiguity thresholds (§3.G).

For each scenario, record:

- **false positives** — wrong-road or wrong-direction events shown;
- **false negatives** — plausible expected events suppressed;
- **ambiguous cases** that need drive verification or curated review;
- screenshots/notes — do **not** commit raw Datakam/OpenSpeedcam data.

Success criterion for moving toward Canon-candidate posture:

- Obvious wrong-road / wrong-direction events are reliably suppressed on the inspected corridors.
- Plausible known-route events survive (no broad over-suppression of obvious cases).
- Ambiguous branch / intersection cases are visible in debug but **not** confidently shown to the driver.

This document does not claim those criteria are met today. It defines what the emulator must demonstrate before any direction-applicability item is promoted past WIP.

## 8. Route-unknown / no-route future strategy (out of scope for POC V1)

No-route mode is **explicitly future-only** and **not** part of POC V1's route-known emulator. It is mentioned briefly so the route-known design does not accidentally foreclose it.

A future no-route mode would likely:

- use recent GPS heading / track history rather than a route polyline;
- accept candidates only inside a forward **candidate-ahead cone** with limited angular width;
- do short local "projection-like" reasoning on the GPS track (e.g., a local polyline from the last N seconds);
- be **more conservative near branches / intersections** than the route-known mode, because branch choice is unknown;
- explicitly **not** become a hidden navigator (no destination, no rerouting, no inferred route);
- **suppress events beyond unresolved branches**;
- require separate validation and tuning;
- **never** be treated as equivalent to route-known mode.

POC V1 does not implement this and does not depend on it. Any future no-route work is a separate research/recommendation/iteration.

## 9. Risks and unknowns

This document inherits known unknowns from the WIP spec and the Datakam research notes. They are restated here so the reader is not misled by the apparent precision of the proposed defaults.

- **Datakam `DIRECTION` semantics are not globally proven.** The strongest evidence (`datakam-manual-qa-status-semantics.md`, finding 1) is QA on a limited geographic sample, mostly the Yaroslavl-Moscow corridor. Every candidate should still be evaluated individually; the `(DIRECTION + 180) mod 360` assumption must remain a configurable interpretation, not a hard-coded global truth.
- **`DIRTYPE` semantics are source-specific and must be validated per dataset / version.** `DIRTYPE=2` clearly explains bidirectional `road_bump` rendering in the local audit (`datakam-road-bump-direction-semantics.md`), but `DIRTYPE=0` (≈0.04% of `TYPE=102`) is unexplained.
- **Route provider geometry can be coarse or shifted.** Polyline noise affects both projection distance and local tangent; this is the main reason the recommendation uses an averaged tangent over an approach window, not a single segment bearing.
- **Candidate coordinates may be offset to the side of the road** rather than placed on the road centerline. This biases projection distance and can cause snap-to-wrong-segment in dense areas.
- **Parallel carriageways / ramps / service roads can fool nearest projection.** This is the primary motivation for the branch ambiguity step (§3.G).
- **Overpasses and grade-separated crossings can look close in 2D.** All projection is currently 2D; there is no z-axis or grade-separation reasoning in POC V1.
- **Curves make current-heading comparison unreliable.** This is why the local route approach tangent is preferred over the vehicle's instantaneous heading (§3.D).
- **Visual QA increases confidence but does not create `VerifiedRoadEvent` truth.** Manual QA is `looks_correct` evidence (`datakam-manual-visual-validation.md`).
- **Conservative suppression may hide real, useful events.** This is an accepted trade-off for early POC; it can be revisited after the web emulator demonstrates the suppression behaves predictably.
- **All thresholds in this document require emulator tuning** before any move toward Canon. They are starting values, not final ones.
- **No DIRECTION semantics applies across all sources.** The model is written for the current Datakam/OpenSpeedcam source; a different source could imply different semantics and would need its own interpretation pass.

## 10. Canon-readiness

This document is Research. Nothing here is being promoted to Canon by this PR. The classification below is informational and is intended only to help a later Canon / decision review separate stable principles from tuning values.

### 10.1 Possible future Canon candidates

These principles look **stable enough** to be considered for Canon promotion or an ADR after the web emulator validation demonstrates them:

- RoadAhead uses **route/path applicability**, not pure nearest-point lookup.
- **Route-known mode first** for the POC V1 web emulator; route-unknown is a separate future track.
- **External candidate data (Datakam/OpenSpeedcam) is not verified truth**, and the system must not present it as such.
- The **local route approach tangent** is the preferred direction-applicability reference, not the vehicle's instantaneous heading.
- **Conservative suppression** is the default response to wrong-road / wrong-direction / branch ambiguity in driver-facing UX.
- **Debug visibility for suppressed candidates** is a product/engineering requirement, not optional — suppression must be inspectable.

### 10.2 Must remain WIP / tuning

These items must **stay WIP / emulator tuning** and should **not** be promoted to Canon based on this document alone:

- Exact `direction_delta_deg` thresholds (`30 / 45 / 60`).
- Exact `approach_window_m` (and its min/max bounds).
- Branch ambiguity heuristics (`branch_zone_radius_m`, `projection_competitor_delta_m`, `competitor_heading_delta_deg`).
- Projection distance thresholds (`route_projection_accept_m`, `_warn_m`, `_reject_m`).
- Datakam `DIRECTION` semantics (still candidate, not globally proven).
- `DIRTYPE` treatment beyond the current dataset (especially `DIRTYPE=0` and any future source revision).
- Any manual override policy for `direction_conflict` candidates (kept as a future, separate validation/fixture mechanism, not a code-level rule).

## 11. Cross-links

WIP spec and decision context:

- [`../product/wip/roadahead-poc-v1-three-circle-assistant.md`](../product/wip/roadahead-poc-v1-three-circle-assistant.md) — main POC V1 WIP spec; this document expands §8.3 and §20.1.
- [`../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md`](../product/wip/roadahead-poc-v1-initial-product-decisions-workbook.md) — companion rationale / input history (workbook decision Q16).

Source-level research:

- [`datakam-speedcam-format-and-route-qa.md`](datakam-speedcam-format-and-route-qa.md) — Datakam/OpenSpeedcam format and Moscow-Yaroslavl corridor QA.
- [`datakam-manual-visual-validation.md`](datakam-manual-visual-validation.md) — source-level visual plausibility check on familiar corridors.
- [`datakam-road-bump-direction-semantics.md`](datakam-road-bump-direction-semantics.md) — `DIRTYPE` / `DIRECTION` distribution audit for `TYPE=102` road bumps.
- [`datakam-manual-qa-status-semantics.md`](datakam-manual-qa-status-semantics.md) — manual QA status and direction-semantics findings (basis for the `DIRECTION + 180` working assumption).
