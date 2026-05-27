# RoadAhead Stage 2 — Lifecycle / Order Diagnostics

**Status:** WIP research / diagnostics — NOT Product Canon  
**Issue:** #102 — Stage 2 — lifecycle/order diagnostics for prepared-event evaluation  
**Parent issues:** #101, #86, #17  
**Follows:** #99 / PR #100 — bridge prepared route events into applicability evaluation  
**Date:** 2026-05-27  
**Threshold source:** `EMULATOR_TUNING_DEFAULTS` as of this PR (Issue #102).
All WIP threshold values in this document are read from that constant — not hardcoded.
Values may change in future WIP tuning iterations.

---

## 1. Current Evaluator Flow

This section documents the code path that drives prepared-event evaluation in the Phase 0 emulator as of PR #100 (the follow-on of #99). No changes to this flow are made in issue #102.

### 1.1 Active Event Source Selection

**Location:** `src/main.ts`, `deriveEventSourceMode()` + `getActiveEventsForSim()`

The event source is determined every render tick by `deriveEventSourceMode()`:

| Condition | Mode | Events fed to evaluator |
|---|---|---|
| `activeRegistryRouteId !== null` AND `routeEventsState.kind === "loaded"` | `prepared_route` | `adaptRouteEventsToPreparedEvents(dataset.events)` |
| `activeRegistryRouteId !== null` AND dataset not loaded | `no_prepared` | `[]` (empty — no silent synthetic fallback) |
| Synthetic/GeoJSON route, no registry route active | `synthetic` | `SYNTHETIC_PREPARED_EVENTS` |

Synthetic scenario mode always uses `SYNTHETIC_PREPARED_EVENTS` regardless of route source. Selecting a scenario resets `activeRegistryRouteId` to null.

### 1.2 Route Projection and Distance-Ahead Calculation

**Location:** `src/emulator/routeProjection.ts`, `projectEventsToRoute()` + `projectPointToRoute()`

For each render tick, `computeSimulationState()` (in `simulationState.ts`) calls:

1. `computeVehicleRoutePosition(progress, route)` — computes the vehicle's along-route position (`along_route_m`) from route progress [0, 1] via cumulative arc-length interpolation.
2. `projectEventsToRoute(events, route, vehiclePosition)` — for every prepared event, calls `projectPointToRoute(lon, lat, route)` to find the best (minimum cross-track) projection onto the route polyline.
3. `signed_distance_m = event.projection.best.along_route_m - vehicle.along_route_m`

Positive = event ahead; negative = event behind. This is the primary ahead/behind signal.

**Math model:** Local planar equirectangular approximation. 1° lat ≈ 111,320 m; 1° lon ≈ 111,320 × cos(lat) m (using segment midpoint latitude per segment). WIP — NOT Canon.

### 1.3 Direction Compatibility Evaluation

**Location:** `src/emulator/directionCompatibility.ts`, `computeDirectionCompatibilityRecords()`

Called by `computeSimulationState()` after projection. For each event:

1. Computes the local approach tangent from the route near the event's projected segment (using `approach_window_m`).
2. Compares `source_direction_deg` (vehicle travel direction — note: Datakam's DIRECTION field is the facing direction of the sign; the adapter inverts it by 180° before storing in `source_direction_deg`).
3. Returns a `DirectionCompatibilityRecord` with status: `compatible` / `bidirectional` / `incompatible` / `unknown` / `unsupported`.

Key thresholds (WIP defaults from `EMULATOR_TUNING_DEFAULTS`, not Canon):
- `direction_delta_accept_deg`: direction delta at or below which the event is accepted (default **45°**)
- `direction_delta_reject_above_deg`: above which the event is rejected as incompatible (default **60°**)
- Ambiguous band (45°–60°): `direction_unknown` or `direction_unsupported` (suppressed, debug-visible)

### 1.4 Cross-Track Filtering

**Location:** `src/emulator/minimalEventSelection.ts`, `selectEvents()`, step 5a

After distance-based window checks (too_far / too_close), before direction compatibility is applied:

```
if (cross_track_m > config.direction_applicability.route_projection_reject_m)
  → status: off_route_cross_track
  → reason code: route_projection_cross_track_rejected
  → kind: suppressed
```

WIP default threshold: `route_projection_reject_m = 50 m`. Not Canon.

**Important ordering note:** Cross-track suppression fires even before direction_unknown for events with null direction — an off-route event with null direction gets `off_route_cross_track` rather than `direction_unknown`.

### 1.5 Max Lookahead

**Location:** `src/emulator/minimalEventSelection.ts`, step 4

```
if (signed_distance_m > guardrails.max_lookahead_m)
  → status: too_far
  → reason code: outside_max_lookahead
  → kind: suppressed
```

Per-type WIP defaults from `EMULATOR_TUNING_DEFAULTS` (not Canon):
- `speed_limit`: max_lookahead_m = **900 m**
- `static_camera`: max_lookahead_m = **1100 m**
- `road_bump`: max_lookahead_m = **500 m** (per Issue #75)

**Critical observation (symptom 1 root area):** Each event type uses its own per-type max_lookahead_m. This means a `road_bump` event at 600 m is `too_far` (max 500 m) while a `speed_limit` event at the same distance is `candidate` (max 900 m). The evaluator does not compare across types when determining the window — an event's window is determined only by its own type's guardrails.

### 1.6 Min Display / Too_Close

**Location:** `src/emulator/minimalEventSelection.ts`, step 5

```
if (0 < signed_distance_m < guardrails.min_display_distance_m)
  → status: too_close
  → reason code: inside_min_display_window
  → kind: suppressed
```

Per-type WIP defaults from `EMULATOR_TUNING_DEFAULTS` (not Canon):
- `speed_limit`: min_display_distance_m = **175 m**
- `static_camera`: min_display_distance_m = **250 m**
- `road_bump`: min_display_distance_m = **100 m**

**Critical observation (symptom 2 root area):** When an event's `signed_distance_m` drops below its type-specific `min_display_distance_m`, the event transitions to `too_close` → `inside_min_display_window` and is **suppressed entirely** — it no longer qualifies as `candidate` and cannot be `selected` (primary). No lifecycle transition to an active/passing state exists in the current baseline. The event simply disappears from primary/next while still well ahead of the vehicle — at 175 m for speed_limit, 250 m for static_camera, or 100 m for road_bump under current WIP defaults.

### 1.7 Primary / Secondary Selection

**Location:** `src/emulator/minimalEventSelection.ts`, steps 7–8

1. Events surviving the pipeline reach status `candidate` (direction `compatible` or `bidirectional`).
2. Candidates are sorted **ascending by `signed_distance_m`** (closest first).
3. The first candidate (closest) → `selected` (primary). Reason code: `selected_primary`. Kind: `accepted`.
4. The second candidate → remains `candidate`. Reason code: `accepted_candidate`. Kind: `accepted`.
5. The second candidate's `event_id` is stored as `eventSelection.secondary?.event_id`.

**Critical observation (symptom 1 root area):** Sorting is by `signed_distance_m` — the signed along-route distance from the **vehicle** to the event's projected position on the route. This is correct in theory, but depends on how well the projection locates each event on the route. If an event's `along_route_m` projection is inaccurate (e.g., due to the equirectangular approximation, or if the event is physically close to the road but near a sharp curve), its computed `signed_distance_m` may differ from the visual map distance.

**Another critical observation:** Eligibility filtering (too_far, too_close, cross_track, direction) happens **event by event** before sorting. There is **no route-order-first step** — the pipeline does not first establish a route-ordered queue of all events and then apply filters top-down. It filters independently per event, then sorts survivors.

This means:
- A closer event (by along_route_m) that is `too_close` or `direction_conflict` is eliminated before sorting.
- The next closest eligible event (which may be further away by distance) becomes primary.
- This is the mechanism behind symptom 1: a farther event becomes primary because the closer one is filtered out before the sort.

### 1.8 Marker Eval State Mapping

**Location:** `src/main.ts`, `buildMarkerEvalStateMap()`

Maps `EventStatus` to map marker visual states:

| EventStatus | MarkerEvalState |
|---|---|
| `selected` | `primary` |
| `candidate` (and event_id == secondary) | `next` |
| `candidate` (other) | `eligible` |
| `behind`, `too_far`, `too_close` | `inactive` |
| `off_route_cross_track`, `direction_conflict`, `direction_unknown`, `direction_unsupported`, `projection_missing` | `suppressed` |
| `out_of_scope` | `out_of_scope` |

Applied in `render()` via `updateEventMarkerEvaluationStates(evalStateMap)` — only when `deriveEventSourceMode().kind === "prepared_route"`.

### 1.9 Evaluator Order: Event-by-Event First, Then Sort

The evaluator does **not** build a route-ordered queue first and then filter top-down.

**Actual execution order:**

```
for each event (in dataset array order):
  1. out_of_scope check (type not in scope)
  2. projection_missing check
  3. behind check (signed_distance_m <= 0)
  4. too_far check (> max_lookahead_m per type)
  5. too_close check (< min_display_distance_m per type)
  6. off_route_cross_track check (cross_track_m > route_projection_reject_m)
  7. direction compatibility checks (incompatible / unknown / unsupported)
  8. → candidate (compatible or bidirectional passes all above)

then:
  sort candidates ascending by distance_m → primary = first, secondary = second
```

No pre-sorting by along-route distance before filtering. No route-order-first queue. This is the architecture that creates the observed ordering symptoms.

---

## 2. Current Reason / Status Taxonomy

All codes below are WIP — not Product Canon. Defined in `src/emulator/applicabilityReason.ts`.

### 2.1 Accepted states (kind: "accepted")

| Code | Label | is_driver_facing_eligible | Notes |
|---|---|---|---|
| `selected_primary` | `selected_primary` | true | Closest eligible candidate; shown as primary in driver-facing three-circle display |
| `accepted_candidate` | `accepted_candidate` | true | Within window, direction OK, but not primary; second candidate is `secondary` context |

### 2.2 Suppressed states (kind: "suppressed")

| Code | Label | Notes |
|---|---|---|
| `behind_vehicle` | `behind_vehicle` | signed_distance_m ≤ 0; event behind or at vehicle position |
| `outside_max_lookahead` | `outside_max_lookahead` | ahead but > max_lookahead_m for this event type |
| `inside_min_display_window` | `inside_min_display_window` | ahead but < min_display_distance_m — **key cause of early disappearance** |
| `route_projection_cross_track_rejected` | `route_projection_cross_track_rejected` | cross_track_m > route_projection_reject_m (50 m WIP); off-route; checked before direction |
| `direction_conflict` | `direction_conflict` | direction status: incompatible |
| `direction_unknown` | `direction_unknown` | direction status: unknown or missing direction record |
| `direction_unsupported` | `direction_unsupported` | source dirtype not handled by baseline |
| `missing_projection` | `missing_projection` | no projection record; conservative suppression |
| `missing_direction_record` | `missing_direction_record` | no direction compat record at all (distinct from direction_unknown) |

### 2.3 Not-processed states (kind: "not_processed")

| Code | Label | Notes |
|---|---|---|
| `event_type_out_of_scope` | `event_type_out_of_scope` | normalized_type not in {speed_limit, static_camera, road_bump} |

---

## 3. Observed Behavior on Rostov1

### 3.1 Symptom 1 — Farther Event as Primary Before Closer Event

**Mechanism (from code analysis):**

When driving along the Rostov1 route, it is possible for a farther event (e.g., at 720 m ahead) to be `selected_primary` while a closer event (e.g., at 240 m ahead) exists on the route but is not primary.

Root causes (from code investigation, before runtime confirmation):

1. **Too_close suppression:** The closer event is < `min_display_distance_m` for its type (175 m for speed_limit, 250 m for static_camera, 100 m for road_bump — WIP defaults from `EMULATOR_TUNING_DEFAULTS`). If the closer event entered the `too_close` zone, it is suppressed entirely and the next eligible candidate (the farther event) becomes primary. With the current large min_display values, this is a very common condition on Rostov1.

2. **Direction conflict on closer event:** The closer event may have `direction_conflict` or `direction_unknown` status, causing it to be filtered before the sort. The farther event passes direction compatibility and becomes primary.

3. **Cross-track suppression on closer event:** The closer event may be off-route (cross_track_m > 50 m), suppressing it before direction evaluation.

4. **Lookahead window asymmetry:** If the closer event is `out_of_scope` or a different type with a smaller max_lookahead_m, it may be at too_far status for its type while the farther event of a different type is within its type's window.

**Ordering without route-order-first:** Because the evaluator does not establish route order before filtering, the observed "farther event becomes primary before closer event" pattern is structurally predictable: any closer event that fails any filter (too_close, direction, cross-track) will be eliminated before the sort, leaving a farther, eligible event as primary.

### 3.2 Symptom 2 — Event Disappears Before Vehicle Reaches Marker

**Mechanism (from code analysis):**

When the vehicle's `signed_distance_m` to the event drops below the type-specific `min_display_distance_m`, the event transitions from `selected` (or `candidate`) to `too_close` → `inside_min_display_window`. There is no lifecycle transition to an "active/passing" state — the event is simply suppressed.

Current WIP disappearance distances (from `EMULATOR_TUNING_DEFAULTS`, not Canon):
- **speed_limit:** disappears at 175 m ahead. At 90 km/h, 175 m ≈ 7 seconds before arrival.
- **static_camera:** disappears at 250 m ahead. At 90 km/h, 250 m ≈ 10 seconds before arrival.
- **road_bump:** disappears at 100 m ahead. At 90 km/h, 100 m ≈ 4 seconds before arrival.

This means:
- The map marker changes from `primary` / `eligible` → `inactive` visually while the event marker is still well ahead of the vehicle.
- The three-circle driver-facing display loses its primary context hundreds of metres before the physical event.
- The disappearance distance is much larger than the physical pass point.

**Note:** `too_close` has the code comment "WIP Slice 4.1 simplified minimum window only; not a general product rule that close events are always hidden. Future urgency/applicability behavior may revise this." This confirms the behavior is a known WIP simplification, not intended final behavior.

---

## 4. Root-Cause Findings / Hypotheses

### 4.1 Ordering Happens After Eligibility Filtering (Confirmed)

The evaluator filters each event independently, then sorts survivors. There is no route-order-first step. This is the confirmed architectural pattern.

**Consequence:** Any close-range event suppressed by too_close, direction, or cross-track will vacate the "primary slot" for whatever next eligible event exists — which may be much farther ahead.

**Fix direction:** A route-order-first selection approach would establish the route-ordered queue first (sorted by `along_route_m`), then apply filters top-down, selecting the first event that passes all checks. This would prevent a farther event from jumping to primary while a closer event is still ahead and only temporarily suppressed (e.g., direction_unknown may be overly conservative for Datakam data).

### 4.2 Different Thresholds Make Farther Events Eligible Earlier (Confirmed)

Because each event type has its own `min_display_distance_m` and `max_lookahead_m`, a `road_bump` at 600 m is `too_far` (max 500 m) while a `speed_limit` at 600 m is `candidate` (max 900 m) and a `static_camera` at 600 m is also `candidate` (max 1100 m). Similarly, within min_display: a `speed_limit` at 150 m is `too_close` (min 175 m) while a `road_bump` at the same distance is still `candidate` (min 100 m). Type mismatch effects are visible in mixed-type route event datasets like Rostov1 — WIP defaults from `EMULATOR_TUNING_DEFAULTS`, not Canon.

### 4.3 Too_Close Suppresses Instead of Transitioning to Active/Passing (Confirmed)

The current implementation suppresses events below `min_display_distance_m` rather than transitioning them to an "active" or "passing" lifecycle phase. The event simply disappears from primary/next before being physically passed. No hysteresis or passing state exists in the current baseline.

**Fix direction:** Introduce a lifecycle phase for events inside `min_display_distance_m` (e.g., `approaching` / `active` / `passing`) that keeps the event visible in primary through the pass and then transitions to `behind`. This is out of scope for issue #102 but is the recommended next child issue direction.

### 4.4 Secondary Selection Is Strict Closest-Eligible, Not Route-Order Next (Confirmed)

`secondary` is the second entry in the ascending-by-distance sorted candidate list. It is not the global next event on the route — it is the second closest eligible event within the lookahead window. Events outside the window (too_far, too_close, behind) are excluded from secondary consideration.

---

## 5. Recommendation for Next Child Issue

### 5.1 Route-Order-First Selection

**Problem addressed:** Symptom 1 — farther event as primary before closer event.

**Approach:** Pre-sort all in-scope events by `along_route_m` (ascending, ahead first). Apply eligibility filters in route order. Select the first event that passes all checks as primary, the second as next/secondary.

This changes the question from "which is the closest surviving event after filtering?" to "starting from the nearest event on the route, which is the first one that passes all checks?"

**Scope:** Only changes candidate selection order, not filtering rules.

### 5.2 Close-Range Lifecycle / No-Early-Hide Fix

**Problem addressed:** Symptom 2 — event disappears before vehicle reaches marker.

**Approach:** When an event enters `min_display_distance_m`, instead of suppressing it, transition it to a `close_range` or `approaching` lifecycle state that keeps it visible as primary through the pass. After `signed_distance_m <= 0` (physically passed), transition to `behind` / `passed`.

This requires adding lifecycle state tracking (per-event, per-session) to the simulation state.

**Scope:** Changes too_close behavior; requires new lifecycle phases.

### 5.3 Recommendation

**Implement both, potentially in the same child issue or as two closely coupled child issues under #101.**

Code analysis shows these two symptoms are related but independent:
- Symptom 1 (farther event as primary) requires route-order-first selection.
- Symptom 2 (disappears before passing) requires close-range lifecycle.

Implementing route-order-first selection alone will not prevent disappearance. Implementing close-range lifecycle alone will not prevent a farther event from becoming primary if the closer event has direction_unknown.

If resources allow, implementing both together avoids a transitional state where route-order-first works but close-range disappearance is still broken, which may produce confusing intermediate evaluation behavior.

---

## 6. Code Investigation Summary

### Key files

| File | Role |
|---|---|
| `src/emulator/minimalEventSelection.ts` | Core evaluator: filters + sorts + selects primary/secondary |
| `src/emulator/applicabilityReason.ts` | Reason code taxonomy: codes, kinds, is_driver_facing_eligible |
| `src/emulator/routeProjection.ts` | Route projection, along-route distance, cross-track distance |
| `src/emulator/directionCompatibility.ts` | Direction compatibility (compatible/incompatible/unknown/unsupported) |
| `src/emulator/simulationState.ts` | Integration point: calls projection → direction → selectEvents → speedReference |
| `src/main.ts` | Event source selection, marker eval state mapping, all render functions |
| `src/emulator/routeEventAdapter.ts` | Adapts RouteEvent[] (Datakam) to PreparedEvent[] for the evaluator |
| `src/contracts/tuningConfig.ts` | All WIP threshold constants (lookahead, direction, cross-track) |

### Evaluator execution order (confirmed)

```
computeSimulationState(progress, speedKmh, route, events, config):
  1. computeVehicleRoutePosition(progress, route) → along_route_m, projected_lon/lat
  2. projectEventsToRoute(events, route, vehiclePosition) → EventProjectionRecord[]
     (per-event: projectPointToRoute → best segment → along_route_m, cross_track_m, signed_distance_m)
  3. computeDirectionCompatibilityRecords(events, projections, route, config) → DirectionCompatibilityRecord[]
  4. selectEvents(events, projections, dirCompatRecords, config):
     for each event:
       a. getEventLookaheadGuardrails → null = out_of_scope
       b. no projection → projection_missing
       c. signed_distance_m ≤ 0 → behind
       d. > max_lookahead_m → too_far
       e. < min_display_distance_m → too_close
       f. cross_track_m > route_projection_reject_m → off_route_cross_track
       g. direction incompatible → direction_conflict
       h. direction unknown/null → direction_unknown
       i. direction unsupported → direction_unsupported
       j. → candidate (compatible or bidirectional)
     sort candidates ascending by distance_m
     primary = candidateRecords[0] → status = "selected", reason = "selected_primary"
     secondary = events matching candidateRecords[1].event_id
  5. computeSpeedReference(primary) → SpeedReferenceContext
```

### WIP thresholds in use (not Canon)

Values read from `EMULATOR_TUNING_DEFAULTS` as of Issue #102. The diagnostics UI reads from this same constant — no hardcoded stale values.

| Threshold | Config path | WIP default (as of #102) |
|---|---|---|
| speed_limit max_lookahead_m | `lookahead.speed_limit.max_lookahead_m` | **900 m** |
| speed_limit min_display_distance_m | `lookahead.speed_limit.min_display_distance_m` | **175 m** |
| static_camera max_lookahead_m | `lookahead.static_camera.max_lookahead_m` | **1100 m** |
| static_camera min_display_distance_m | `lookahead.static_camera.min_display_distance_m` | **250 m** |
| road_bump max_lookahead_m | `lookahead.road_bump.max_lookahead_m` | **500 m** |
| road_bump min_display_distance_m | `lookahead.road_bump.min_display_distance_m` | **100 m** |
| cross-track reject | `direction_applicability.route_projection_reject_m` | 50 m |
| direction accept delta | `direction_applicability.direction_delta_accept_deg` | 45° |
| direction reject delta | `direction_applicability.direction_delta_reject_above_deg` | **60°** |

---

_WIP research/diagnostics — not Product Canon. Issue #102 / Stage 2._
