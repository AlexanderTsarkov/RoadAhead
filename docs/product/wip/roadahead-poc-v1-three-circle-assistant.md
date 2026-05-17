---
status: Product Specs WIP
canon: false
source: Baseline WIP spec + Initial Product Decisions Workbook
purpose: Updated POC V1 product WIP spec for review
context: RoadAhead POC V1 three-circle anticipatory road-understanding assistant
---

# RoadAhead POC V1 — Three-Circle Anticipatory Road-Understanding Assistant

> **Status — WIP, not Canon.**
> This document is a working draft. It revises the baseline POC V1 WIP spec by integrating accepted working decisions from the companion decision workbook.
> Nothing here is implementation truth, legal correctness, or a verified road-event database. Open technical/research questions are explicitly preserved.

## Status

- WIP — Product Specs (not Canon).
- Not an implementation plan.
- Not a decision record.
- Source documents:
  - the baseline POC V1 WIP spec (this file's prior version), and
  - the companion decision workbook ([`roadahead-poc-v1-initial-product-decisions-workbook.md`](roadahead-poc-v1-initial-product-decisions-workbook.md)).

## Related WIP docs

- This file (main reader-facing POC V1 product WIP): `roadahead-poc-v1-three-circle-assistant.md`.
- Companion decision/input workbook: [`roadahead-poc-v1-initial-product-decisions-workbook.md`](roadahead-poc-v1-initial-product-decisions-workbook.md).

A WIP index may be introduced later if the POC V1 documentation splits into multiple area-specific files. For now, these two WIP files cross-link to each other directly.

The companion decision workbook ([`roadahead-poc-v1-initial-product-decisions-workbook.md`](roadahead-poc-v1-initial-product-decisions-workbook.md)) is retained as rationale and input history. This file is the current reader-facing POC V1 WIP specification. If the workbook conflicts with this file, this file wins until stable decisions are promoted to Canon or decision records.

---

## 1. Purpose

RoadAhead is an anticipatory **road-understanding** assistant.

It is **not** a navigator and **not** an anti-radar.

POC V1 tests a compact three-circle UI whose purpose is to help the driver understand upcoming road events early enough to react smoothly — without claiming legal correctness of speed limits, replacing a navigator, or producing a verified road-event database.

POC V1 uses Datakam/OpenSpeedcam candidate data as its primary event source. That data is treated as **ExternalObservation candidate data**, not VerifiedRoadEvent truth.

**Primary product question:**

> Does a compact three-circle anticipatory UI help the driver understand what speed-related or caution-related action is needed next?

---

## 2. Validation target and staged path

POC V1 validates behavior in an interactive web environment first. Android work is deferred until behavior is validated.

Staged path:

- **Phase 0 — Interactive web route emulator.** POC V1 validation target.
- **Phase 1 — Standalone Android prototype.** Deferred.
- **Phase 2 — Android overlay on top of an existing navigator.** Deferred.

This supersedes earlier "web replay prototype" wording in any informal draft. The phrase to use going forward is **interactive web route emulator**. The emulator is a deliberate product/testing artifact, not a throwaway toy.

Why the emulator first:

- the hardest POC questions are not Android-specific — they are about event selection, preview vs active, urgency response, chain context, speed-reference behavior, and overall UX feel;
- emulator iteration is fast, deterministic, repeatable, and reviewable;
- Android overlay permissions and platform lifecycle are a distraction before the behavior itself is validated;
- once the behavior feels right in the emulator, Android overlay becomes a later technical execution topic instead of an open product question.

---

## 3. Interactive web route emulator

The emulator is the first-class POC V1 environment. It must let the user:

- choose start and finish points on a map;
- build a road-following route through a route geometry provider;
- render the route polyline;
- move a simulated vehicle along the route;
- manually control simulated speed using simple controls such as ±1 / ±5 / ±10 km/h, play/pause, and reset;
- react to RoadAhead indications during the simulation by slowing down, accelerating, braking late, or passing too fast;
- inspect debug fields exposed by the engine (see §9 and §11).

The emulator should also expose **brake-to-target controls** (smooth / normal / strong / emergency). These are testing tools used to check whether warnings appear early enough for realistic human anticipation. They do not imply automatic braking in the future product.

---

## 4. Route geometry provider boundary

The route provider is used **only** to obtain route geometry (the route polyline). It is not part of RoadAhead's product/runtime logic.

Hard boundaries:

- provider speed, ETA, traffic speed, and segment speed are **not** RoadAhead speed truth;
- simulated vehicle speed in POC V1 is **manually controlled** by the user;
- candidate Datakam events are projected onto the route polyline by the emulator/event-selection layer (see §8.3); this projection does not make the provider part of RoadAhead product logic.

Conceptual layering:

```
Route Geometry Provider
  -> returns route polyline only

Vehicle Simulator
  -> moves along route polyline
  -> derives heading from route geometry
  -> uses manually controlled speed

RoadAhead Engine
  -> receives simulated position / heading / speed
  -> selects candidate events
  -> updates three-circle UI
```

Route geometry provider candidates (working assumption — see §20.2 for the open technical question):

- Yandex route-geometry provider — primary candidate for the first Russia-focused POC if integration is straightforward;
- OSM-based provider such as OSRM or GraphHopper — fallback / future provider;
- imported GPX / KML / GeoJSON track;
- recorded GPS track;
- manually defined polyline fallback for debug.

---

## 5. Core UI concept

The main UI consists of up to three circular visual elements.

When all three are visible, they represent:

1. current speed / current speed conformity;
2. primary upcoming event;
3. secondary chained event.

POC V1 uses **horizontal layout only**. Vertical layout is deferred (see §18 and §21).

Each later event circle is visually "behind" the previous one:

- partial overlap;
- smaller size when farther away;
- more transparency when farther away;
- full size and full opacity when the event requires action.

This creates a visual perspective of events approaching along the road.

---

## 6. UI elements

### 6.1 Left circle — current speed indicator

The left circle is always visible.

It is **not merely a speedometer**. It is a behavioral indicator:

> Am I currently driving at a speed that makes sense for what is happening now or what is about to happen?

Active POC V1 visual states:

- **Idle / unknown reference** — current speed shown, neutral black/dark outline, no compliance claim.
- **Approach mode** — current speed shown plus a red required-deceleration urgency ring (see §11). Ring intensity reflects how urgently the driver needs to slow down for the next speed-relevant event.
- **Pass-feedback hold** — temporary visual confirmation after the vehicle passes a speed-relevant event above target (see §12).

Important: the earlier "provisional current limit mode" is **not** an active POC V1 state. `provisional_limit` is preserved as a future/deferred concept only (see §10).

### 6.2 Middle circle — primary upcoming event

The middle circle represents the next relevant upcoming event. It visually resembles a road sign.

It shows:

- event target speed or advisory speed;
- event type symbol;
- distance to event when active;
- size and opacity that reflect distance and urgency.

Examples of event type symbols:

- `speed_limit` — typical speed-limit road sign;
- `static_camera` — speed limit with camera symbol under the limit numbers;
- `road_bump` — single bump symbol under the limit numbers.

Stages:

- **Hidden** — no event is relevant enough to show.
- **Awareness / preview** — event is in the dynamic visibility window but does not yet require action; smaller size, partial transparency, no or subtle distance label.
- **Active** — event requires driver reaction; full size, full opacity, distance label visible; left circle switches to approach mode.
- **Passed / handoff** — event has just been passed; brief pass-feedback may show; next event may take over (see §8 and §12).

### 6.3 Right circle — secondary chained event

The right circle represents the next applicable event after the primary event along the route.

It is shown when that secondary event is close enough to matter for the driver's current planning, using the same dynamic visibility model as the primary event but under the conservative assumption that current speed continues (see §8.2).

Visual language matches the middle circle: smaller and fainter when less urgent, larger and more visible as the vehicle approaches.

The secondary event **does not** drive the left-circle urgency ring. It only becomes the urgency reference once it becomes the primary event (see §8.2 and §11).

---

## 7. Event scope

### 7.1 Initial event types (POC V1)

Included by default:

- `speed_limit` (Datakam `TYPE=101`);
- `static_camera` (Datakam `TYPE=1`);
- `road_bump` (Datakam `TYPE=102`).

Deferred by default:

- `TYPE=106 other_danger`;
- other camera types (red-light, average-speed, mobile, traffic-light);
- dangerous turn;
- bad road;
- pedestrian crossing;
- dangerous intersection.

### 7.2 Camera scope (POC V1)

POC V1 starts with `static_camera` only.

Other camera types are deferred until later analysis shows they can safely reuse identical point-event semantics (a static target speed at a single point with simple direction applicability and pass feedback). Average-speed cameras are segment-based; red-light cameras are intersection-specific; mobile cameras are less reliable. Mixing these too early may obscure the core UX test.

### 7.3 Speed-regime vs local target / hazard events

Two broad event classes are still useful conceptually, even though active POC V1 logic uses route-order priority and a single `approach_target` speed-reference mode (see §8.1 and §10):

- **Speed-regime events** — could in principle define a continuing speed reference after passing (e.g., `speed_limit`). In POC V1, this category does **not** become an active provisional limit; see §10 on `provisional_limit` deferral.
- **Local target / hazard events** — have a target/advisory speed at the event point but do not define the continuing speed regime after passing (e.g., `static_camera`, `road_bump`).

Example:

```
road_bump  SPEED=20
```

Means: target/advisory speed at the bump is 20.
Does **not** mean: the road after the bump is now limited to 20.

### 7.4 `TYPE=106 other_danger` deferral

`TYPE=106` is excluded from default POC V1 scope.

Manual QA suggested many `other_danger` points may correspond to railway-like crossings in familiar inspected areas, but Datakam `TYPE=106` is **not** globally proven to mean "railway crossing". A later experiment may include `TYPE=106` only as a **railway-like danger candidate** in manually familiar regions / corridor mode, and must not silently rename `TYPE=106` to "railway crossing" globally.

---

## 8. Event selection

### 8.1 Route-order primary event

POC V1 uses a route-order event model. No event-type override priority is implemented.

```
primary_event = nearest applicable event ahead along the route
```

Minimal eligibility filters:

- ignore events behind the vehicle;
- ignore direction-inapplicable events (see §8.3);
- ignore disabled event types;
- optionally suppress near-duplicate same-location/same-type events.

Special priority resolvers such as "camera outranks `speed_limit`" or "lower target speed outranks nearer event" are **not** introduced in POC V1. Road events are normally consumed in route order; introducing override rules early risks unpredictable behavior.

### 8.2 Route-order secondary / chain logic

```
secondary_event = next applicable event after primary_event
```

Secondary visibility uses the same dynamic action-horizon model as the primary event (see §9), but under the simplifying assumption that the vehicle continues at the current speed. The system does not try to predict how much the driver will slow down for the primary event. As the driver actually slows down or accelerates, secondary visibility is recomputed continuously.

Critical boundary:

- until the primary event is passed or cleared, the secondary event **does not** affect the current-speed urgency ring, **does not** change the current target speed, **does not** trigger red speed urgency, and **does not** override the primary event;
- when the primary event is passed/cleared, the secondary event becomes the new primary, and urgency is recomputed against the new target speed and remaining distance.

Example:

```
primary:   speed_limit 60
secondary: road_bump 20
```

Before passing `speed_limit 60`, urgency is computed only against 60; `road_bump 20` is shown as secondary context but does not drive the speed ring. After passing `speed_limit 60`, `road_bump 20` becomes primary and urgency is then computed against 20.

### 8.3 Direction applicability / route-path applicability

Direction applicability in POC V1 is **route/path applicability**, not pure nearest-point matching.

Core principle:

> The system should not show a sign merely because it is geographically near the vehicle.

A candidate event is eligible only when there is enough evidence that it applies to the path the vehicle is currently or assumedly following. Required checks:

- the event projects near the current route polyline;
- `event_route_position_m > vehicle_route_position_m` (event is ahead, not behind);
- no unresolved branch ambiguity exists between the vehicle and the event;
- the event direction is compatible with the local route approach direction near the event.

Working assumption about Datakam `DIRECTION` (carried over from prior research, not globally proven):

> `DIRECTION` likely represents the direction the sign/camera is facing — usually opposite to vehicle travel direction.

So the approximate vehicle-applicable direction is:

```
vehicle_applicable_direction_deg ≈ (DIRECTION + 180) mod 360
```

This is used as **one signal**, not the only check. On curved roads, comparing `DIRECTION` only to the vehicle's current heading can be wrong: the sign may be correctly oriented to the road segment immediately before the event, while the vehicle's instantaneous heading is dominated by a curve. Direction compatibility should therefore be evaluated against the **local route approach tangent** near the event (or an averaged route bearing over a short approach window), not just straight-line bearing from the vehicle's current position to the event.

Branch / intersection ambiguity rule:

- if the vehicle is approaching a T-junction, fork, or intersection and the chosen branch is unknown, events beyond the unresolved branch must be suppressed — neither primary nor secondary;
- once the vehicle's path is explicit (route geometry resolves the branch, or the vehicle has visibly turned), recompute primary and secondary events for the new path.

Turn / deviation rule:

- if the vehicle deviates from the assumed path, clear or re-evaluate the current primary/secondary events, reproject the vehicle onto the new path, and select new events from that new context.

POC V1 scope on this topic:

- POC V1 does not attempt to solve all real navigation ambiguity;
- the WIP spec explicitly states that event selection is route/path applicability, not nearest-point lookup;
- the web emulator should expose debug fields for direction applicability decisions (see §11 and §20.1);
- exact thresholds and ambiguity heuristics are open technical/research items (see §20.1).

---

## 9. Dynamic preview / action thresholds

POC V1 does **not** use fixed distance-only preview/active thresholds as the primary rule.

Primary model: **dynamic action-horizon thresholds** based on current speed, target speed, route-projected distance, reaction time, and required deceleration.

Distance values remain useful, but only as guardrails:

- maximum lookahead caps;
- minimum display distance;
- fallback when target speed is unknown;
- per-event-type tuning caps;
- debugging / explainability constants in the emulator.

Reasoning: a fixed distance is too early at low speed and too late at high speed. RoadAhead should warn early enough for normal human anticipation, not merely early enough for emergency-level braking.

Computed values per applicable speed-relevant event:

```
vehicle_route_position_m
event_route_position_m
distance_ahead_m   = event_route_position_m - vehicle_route_position_m
time_to_event_s
current_speed_kmh
target_speed_kmh
required_deceleration_mps2
needed_distance_smooth_m
needed_distance_normal_m
needed_distance_strong_m
needed_distance_emergency_m
```

Conceptual formula for `needed_distance_m` at a given deceleration profile:

```
needed_distance_m =
    current_speed_mps * reaction_time_s
  + ((current_speed_mps^2 - target_speed_mps^2) / (2 * deceleration_mps2))
  + margin_m
```

Initial deceleration profiles (POC tuning starting point, not legal/engineering truth):

- smooth deceleration ≈ 1.0 m/s²;
- normal deceleration ≈ 1.5 m/s²;
- strong deceleration ≈ 2.5 m/s²;
- emergency / design deceleration ≈ 3.4 m/s².

Initial reaction defaults:

- ordinary-road reaction time ≈ 2.0 s;
- high-speed-road reaction time ≈ 2.5 s;
- optional UI margin ≈ 1.0 s.

These values are **starting points for emulator tuning**, not Canon. See §20.5.

UI states for the dynamic action horizon:

- `hidden` — no relevant upcoming event inside the effective lookahead window;
- `awareness` — event is close enough for perception/reaction plus smooth slowdown; driver still has comfortable room;
- `smooth_required` — smooth deceleration should begin now to reach target comfortably;
- `normal_required` — normal deceleration is required;
- `strong_required` — strong deceleration is required; warning is materially urgent;
- `emergency_required` — only emergency/design-level deceleration is likely to reach the target by the event;
- `unsafe_likely` — reaching `enforcement_threshold_speed` safely is unlikely (see §12.1 for definition).

---

## 10. Speed reference model

### 10.1 Active POC V1 modes

- `unknown` — the system does not claim to know the current valid speed reference. The current-speed circle shows current speed only, with a neutral outline and no compliance indication.
- `approach_target` — an upcoming primary speed-relevant event is active. The current-speed circle compares current speed against the target speed of the primary event and uses the required-deceleration urgency ring (see §11) when slowing is needed.

### 10.2 Temporary visual state

- `pass_feedback_hold` — a just-passed primary event entered one of the pass-feedback tiers (see §12). This is **not** a speed-reference mode; it is a temporary visual confirmation of how the previous event was passed, with severity defined by §12.

### 10.3 Deferred / future mode

- `provisional_limit` — **not active in POC V1.**

`provisional_limit` is preserved as a future product mode and stays in the document on purpose. It would mean the system has enough trusted information to treat a speed as the current road-segment speed reference for some period or segment. POC V1 does not have a reliable source of current road-segment speed truth, so it must not imply current legal speed-limit knowledge after passing a sign.

A future `provisional_limit` mode would likely require one or more of:

- reliable map / road-segment `maxspeed` data;
- confirmed sign pass plus valid zone/segment interpretation;
- settlement boundary / cancellation / intersection handling;
- explicit validity distance or validity rule;
- another trusted speed-regime source.

Until that exists, RoadAhead must not behave as if it knows the current legal speed limit.

### 10.4 `recent_passed_speed_candidate` — context only

After passing a `speed_limit`-like event, POC V1 may store a short-lived value:

```
recent_passed_speed_candidate
recent_passed_speed_candidate_ttl_s ≈ 30–60 s
```

This memory is **context only**. It must not:

- drive current-speed compliance UI;
- become an active provisional limit;
- be displayed as the current legal speed;
- influence red/green compliance of current speed.

It exists only to preserve the concept for future product logic, debugging, and later experiments.

### 10.5 State machine (POC V1)

Transitions:

- `unknown -> approach_target` when a primary speed-relevant event enters the action horizon;
- `approach_target -> pass_feedback_hold` when the primary event is passed under a pass-feedback tier (see §12);
- `approach_target -> approach_target(next_event)` when the primary event is passed at/below target and another event is already active;
- `approach_target -> unknown` when the primary event is passed at/below target and no next event is active;
- `pass_feedback_hold -> approach_target(next_event)` after the hold elapses if another applicable event is active;
- `pass_feedback_hold -> unknown` after the hold elapses if no next event is active.

---

## 11. Required-deceleration urgency model

The left/current-speed circle does **not** primarily indicate "an event exists" — the event itself is shown by the middle/right circles. The left circle indicates whether the driver currently needs to change speed for the **next speed-relevant primary event**.

Core inputs:

- `current_speed`;
- `target_speed` (from the primary event);
- `distance_ahead_m` (route-projected);
- `reaction_time_s`;
- deceleration profile thresholds (§9);
- `display_hysteresis_kmh`.

### 11.1 Neutral-at-target rule

If `current_speed <= target_speed + display_hysteresis_kmh`:

- the current-speed circle remains neutral;
- the default outline is shown;
- no red urgency ring is displayed;
- the upcoming event sign/card remains visible nearby as context.

If the driver later accelerates above `target_speed + display_hysteresis_kmh` before passing the same event, the red urgency ring reappears and is recalculated from the live speed and remaining distance.

### 11.2 Live recalculation rule

The urgency state is **not latched** when an event first appears. It is recomputed continuously from event activation until the event is passed or cleared.

Examples:

- driver starts above target speed → ring appears according to required deceleration;
- driver brakes smoothly → ring intensity decreases;
- driver reaches target speed → ring disappears, circle becomes neutral;
- driver accelerates again before the event → ring reappears;
- driver accelerates late → ring may jump directly to `strong_required` / `emergency_required` / `unsafe_likely` (blinking).

### 11.3 Ring intensity bands

Use **alpha** (not "transparency") to avoid ambiguity:

- alpha 0.2 — `awareness` (weak visible ring);
- alpha 0.4 — `smooth_required`;
- alpha 0.6 — `normal_required`;
- alpha 0.8 — `strong_required`;
- alpha 1.0 — `emergency_required`;
- blinking alpha 1.0 — `unsafe_likely`.

### 11.4 Normal guidance is based on `target_speed`

Normal guidance bands (`awareness`, `smooth_required`, `normal_required`, `strong_required`, `emergency_required`) are calculated against the actual event `target_speed`, **not** against `target_speed + enforcement_tolerance`.

Reasoning: RoadAhead should recommend correct driving behavior for the posted/recommended target. It should not teach the driver to consume the legal enforcement tolerance buffer as normal driving speed.

`enforcement_tolerance` is used **only** in three places (see §12 and §13):

- the `unsafe_likely` blinking pre-pass threshold;
- pass-feedback severity tiers;
- camera-risk feedback.

`display_hysteresis_kmh` is a **separate** value used only for UI smoothing around `target_speed`. It is not the legal/enforcement tolerance and must not be conflated with `enforcement_tolerance`.

### 11.5 Suggested POC tuning fields

- `display_hysteresis_kmh` ≈ 1–2 km/h;
- `clear_hysteresis_kmh` ≈ 2–3 km/h;
- `alpha_smoothing_ms` ≈ 500–1000 ms.

These are tuning starting points for the emulator, not Canon. Final values are open tuning items (see §20.5).

### 11.6 Emulator debug fields

The emulator should expose, at minimum:

- `current_speed_kmh`;
- `target_speed_kmh`;
- `distance_ahead_m`;
- `time_to_event_s`;
- `required_deceleration_mps2`;
- selected urgency state;
- `red_ring_alpha`;
- braking profile thresholds;
- reaction time;
- UI margin.

---

## 12. Pass feedback (`pass_feedback_hold`)

### 12.1 Definitions

- `target_speed` — the required/recommended speed from the event itself (e.g., `speed_limit 60`, `road_bump 20`).
- `display_hysteresis_kmh` — small UI smoothing value around `target_speed`; **separate** from any legal/enforcement concept.
- `enforcement_tolerance` — jurisdiction/profile-specific tolerance, used only for pass-severity and `unsafe_likely`/camera-risk thresholds. Resolved tolerance can be:
  - absolute km/h (e.g., +10 or +20);
  - percentage (e.g., +5%);
  - hybrid / country-specific rule (future).
- `enforcement_threshold_speed = target_speed + resolved_enforcement_tolerance`.

`enforcement_tolerance` is configurable. Do not hardcode a single global legal tolerance. Initial Russia-focused POC default is +20 km/h (see §20.4).

### 12.2 Pre-pass `unsafe_likely` (blinking)

The outer red urgency ring grows according to required deceleration toward `target_speed` (see §11). Blinking `unsafe_likely` is a stricter pre-pass condition:

> The vehicle can no longer realistically pass the event at or below `enforcement_threshold_speed` without unsafe/emergency-level braking.

Blinking is therefore **pre-pass only**, on the urgency ring. It does **not** transfer to the whole sign or to the full speed circle after pass/commit. Post-pass feedback is intentionally stable and readable.

### 12.3 Unrecoverable-distance pre-pass trigger

Before the actual pass point, the system may also enter the critical pre-pass path when:

```
distance_ahead_m <= minimum_unrecoverable_distance_m
AND current_speed > enforcement_threshold_speed
```

`minimum_unrecoverable_distance_m` can be derived from the emergency/design deceleration profile plus a small margin, or implemented as a tunable guardrail in the emulator.

### 12.4 Post-pass tiers

When the event is passed, compare `pass_speed` against `target_speed` and `enforcement_threshold_speed`:

- **Tier 0 — passed at or below target** (`pass_speed <= target_speed`):
  - no pass feedback;
  - speed circle remains/returns neutral;
  - clear primary event;
  - transition to next primary if one is active, otherwise return to `unknown`.
- **Tier 1 — above target but within enforcement tolerance** (`target_speed < pass_speed <= enforcement_threshold_speed`):
  - keep the just-passed event/sign visible for `pass_feedback_hold_s`;
  - show a stable red outer ring / red outline reminder on the speed circle;
  - **do not** fill the inner white speed-circle area red;
  - **do not** reverse speed digits to white;
  - **do not** blink.
- **Tier 2 — above enforcement threshold** (`pass_speed > enforcement_threshold_speed`):
  - keep the just-passed event/sign visible;
  - fill the inner white area of the speed circle with solid red;
  - reverse speed digits to white;
  - hold the visual state for `pass_feedback_hold_s`.

### 12.5 Hold timing

- `pass_feedback_hold_s` default ≈ 4 seconds;
- acceptable tuning range ≈ 3–5 seconds;
- the hold should be long enough to be understood, not an instant flash.

### 12.6 Transition after `pass_feedback_hold`

If another applicable event is already active:

- previous primary is cleared;
- next event becomes the new primary;
- the speed indicator enters `approach_target` for the new primary;
- urgency is recomputed from the current speed, new target speed, and new distance ahead.

If no next active event exists:

- the speed circle returns to `unknown`;
- the just-passed speed may be stored as `recent_passed_speed_candidate` for context only (see §10.4).

---

## 13. Camera-risk feedback

Camera-risk is a **semantic variant** of `pass_feedback_hold`, not a separate state machine.

### 13.1 What camera-risk feedback must not say

For `static_camera` events, the system must **not** claim:

- violation;
- fine;
- confirmed capture;
- guaranteed enforcement.

It should communicate only:

> Possible camera risk.

### 13.2 Camera-risk tiers

Same threshold model as §12 (`target_speed`, `enforcement_threshold_speed`):

- `pass_speed <= target_speed` → no special feedback; clear event / proceed to next event.
- `target_speed < pass_speed <= enforcement_threshold_speed` → non-critical over-target pass feedback; keep the camera event visible briefly; speed circle inner area stays normal; **do not** show the camera-risk icon variant; **do not** imply enforcement risk.
- `pass_speed > enforcement_threshold_speed`, or pre-pass unrecoverable distance is reached at speed above `enforcement_threshold_speed`:
  - enter `pass_feedback_hold` / camera-risk variant;
  - keep the just-passed camera event visible;
  - fill the inner white area of the speed circle with solid red;
  - show a camera symbol/icon **instead of** speed digits in the inner area;
  - optionally pulse/blink the camera symbol 2–3 times for extra noticeability;
  - **do not** blink the entire speed circle or whole sign;
  - hold the feedback state for `pass_feedback_hold_s`.

### 13.3 Pulse/blink rule

The optional camera-icon pulse is a short emphasis inside the stable hold state. It must not become an aggressive alarm. The red inner circle remains stable; only the camera symbol/icon may pulse briefly.

### 13.4 Suggested defaults

- `pass_feedback_hold_s` ≈ 4 seconds;
- `camera_icon_pulse_count` ≈ 2–3.

---

## 14. Data preparation and normalized event store

### 14.1 Boundary

Raw `speedcam.txt` / raw CSV-like text is **import / source material only**. It is **not** runtime product data.

POC V1 includes an explicit data-preparation step that converts raw Datakam/OpenSpeedcam input into a prepared local event store.

### 14.2 What the prepared store must support

- normalized event schema;
- event-type mapping;
- geo filtering / spatial lookup;
- route-proximity candidate selection;
- direction applicability fields;
- source metadata;
- **reserved** fields for future user/community validation (see §14.5).

### 14.3 Storage candidates (open technical question)

The exact storage engine is open to technical recommendation (see §20.3). Candidate directions:

- **SQLite event store with spatial index** — good default for POC and Android-oriented work; ordinary SQLite tables plus a spatial index strategy for bounding-box / nearby-event lookup.
- **GeoPackage-style store** — attractive future-compatible option; geospatial container built on SQLite, supports vector features, attributes, metadata, and extensions.
- **Plain JSON / GeoJSON** — acceptable only as an interchange/debug artifact or a tiny deterministic test fixture; not preferred as the real runtime store once geo lookup and validation metadata matter.
- **Server-side spatial database** — future work for aggregation, updates, validation, moderation, sync. Out of POC V1 scope; must not block POC V1.

### 14.4 Minimum normalized event fields

- `event_id`;
- `source`;
- `source_event_id` / `source_idx`;
- `raw_type`;
- `normalized_type`;
- `lat`;
- `lon`;
- route-projection fields when computed;
- `target_speed_kmh` (nullable);
- `direction_type`;
- `source_direction_deg`;
- `vehicle_applicable_direction_deg`;
- `confidence` / `source_confidence`;
- `enabled_for_poc`;
- `created_at` / `imported_at`;
- `source_dataset_version`.

### 14.5 Reserved future validation fields

The data model must not block the future validation lifecycle. Reserve schema space for fields such as:

- `validation_status` (e.g., `unknown` / `unconfirmed` / `confirmed` / `disputed` / `removed_candidate`);
- `confirmations_count`;
- `rejections_count`;
- `last_confirmed_at`;
- `last_rejected_at`;
- `last_seen_by_user_at`;
- `confirmation_score`;
- `confirmation_expires_at`;
- `user_added`;
- `user_added_at`;
- `user_added_by` (only if accounts exist later);
- `superseded_by_event_id`;
- `source_revision`.

POC V1 does **not** implement community validation, accounts, moderation, or production sync. The schema only needs to be rich enough that validation and freshness can be added later without redesigning the event model from scratch.

### 14.6 Repo / data-policy boundary

- raw Datakam/OpenSpeedcam files remain local/uncommitted;
- generated full data stores are not committed unless explicitly approved;
- small synthetic or manually curated fixtures may be committed for tests;
- raw text input is treated as source material only, not committed product data.

---

## 15. Visual design principles

The UI imitates the visual language of road signs rather than inventing an unrelated icon system.

Principles:

- circular sign-like elements;
- red border for speed/warning relevance;
- recognizable symbols for event types;
- distance plate under active event sign;
- size and alpha encode urgency/distance;
- overlapping circles encode event sequence and perspective;
- compact enough for overlay use in a future phase, while POC V1 itself runs in the web emulator;
- must not behave like a full map.

### 15.1 Visual primitive intent

The POC UI should not depend on raster image assets for the main circles or signs. All primary elements should be drawable in code using simple vector/UI primitives: circles, rings, borders, fills, text, small symbols, alpha, scale, and overlap.

Two related but visually distinct concepts:

**1. Current speed indicator (left circle)**

- Not a literal road sign.
- White center.
- Neutral/black outer outline in idle / unknown-reference mode.
- Red required-deceleration urgency ring appears in approach mode; ring intensity reflects urgency (see §11).
- Pass-feedback states use the §12 visual rules.
- Number represents the current vehicle speed.

**2. Upcoming event sign (middle and right circles)**

- Intentionally imitates a road speed-limit or warning sign.
- Red circular border/ring.
- White center.
- Number represents the event target/advisory speed.
- Optional small event symbol under the number — for example: camera icon, road-bump symbol, or railway-like danger symbol (the latter only if `TYPE=106` is enabled in a manually familiar corridor; see §7.4).

Reference-image ideas from earlier working drafts are **visual guidance only**, not a requirement to commit PNG or SVG assets. Future design work may add proper vector assets or design mockups, but POC V1 can start with programmatically drawn shapes.

---

## 16. Datakam / OpenSpeedcam data source policy

POC V1 is based primarily on Datakam/OpenSpeedcam candidate data.

Datakam/OpenSpeedcam events are treated as:

> **ExternalObservation candidate data** — not VerifiedRoadEvent truth.

Implications:

- POC V1 may use this data to test the interaction concept;
- the system **must not** claim legal correctness;
- the system **must not** present candidate events as confirmed/verified;
- direction applicability must follow §8.3 (route/path applicability), not pure nearest-point lookup;
- raw datasets are not committed; preparation flow is described in §14.

POC V1 is not a navigator and not an anti-radar. Camera-risk feedback (see §13) communicates only "possible camera risk", not enforcement claims.

---

## 17. OSM role in POC V1

OSM is useful for future improvement but must **not** be central to POC V1.

There is **no runtime OSM dependency in POC V1.**

Potential future OSM use cases (out of POC V1 scope):

- road geometry for offline route fallback;
- segment-level `maxspeed` to support a future `provisional_limit` mode;
- railway-crossing validation layer;
- comparison/validation layer against external candidates.

For POC V1, after passing a `speed_limit`-like event the speed reference returns to `unknown` (or to the next active `approach_target`). It does **not** turn into a `provisional_limit` (see §10.3).

---

## 18. Explicit non-goals for POC V1

POC V1 does **not** solve, implement, or claim:

- full legal speed-limit validity;
- end-of-settlement signs / cancellation handling;
- intersection effects on speed regime;
- distance plates / zone-of-validity signs;
- a full route engine or navigation;
- Android overlay implementation;
- standalone Android prototype implementation;
- backend, accounts, sync, cloud storage, telemetry, community validation;
- a verified RoadEvent database;
- production OSM integration / runtime OSM dependency;
- automatic promotion of any external data to "truth";
- support for every Datakam event type;
- a production-grade braking/physics model;
- an active `provisional_limit` mode (see §10.3);
- vertical layout (deferred);
- treating the route provider's speed/ETA/traffic speed as RoadAhead speed truth;
- treating the simulated vehicle's speed as anything other than manually controlled.

---

## 19. Success criteria

POC V1 is successful if it helps answer, primarily through interactive web route emulator sessions:

1. Does the three-circle UI communicate upcoming events clearly?
2. Is `awareness` / preview vs `active` reaction distinguishable and understandable?
3. Does the left speed indicator help the driver judge whether the current speed is appropriate for what is coming?
4. Is the route-order chain awareness useful (secondary visible without overriding the primary)?
5. Are dynamic action-horizon thresholds tuned well enough that warnings appear early enough for normal human anticipation, not just last-second emergency braking?
6. Are the pass-feedback tiers (§12) and camera-risk variant (§13) understandable at a glance and clearly **not** alarmist?
7. Is direction / route-path applicability (§8.3) good enough on familiar corridors that obviously-inapplicable signs are suppressed?
8. Does the interface feel calmer and more anticipatory than existing navigator warnings?

---

## 20. Open technical / research questions

These items are **not** silently answered as product decisions. They are explicitly preserved as open technical/research/tuning items, to be addressed by a later technical recommendation, emulator experiments, and (later) on-device validation.

### 20.1 Direction applicability tuning (open technical)

The product requirement is conservative route-path applicability (§8.3). Specific thresholds are open:

- initial `direction_delta_deg` threshold;
- route-approach window length near the event;
- branch-ambiguity detection at T-junctions / forks / intersections in the first emulator;
- behavior when Datakam `DIRECTION` conflicts with route geometry but visual QA suggests the candidate point is correct.

Working approach: use route/path projection; compare sign/camera direction to the local route approach tangent near the event; suppress events beyond unresolved branches; expose debug fields in the emulator; tune in the web emulator first, then in real-device movement tests later.

### 20.2 Route geometry provider (open technical)

Working assumption: Yandex first, if its route polyline is the simplest technically feasible option for a Russia-focused emulator. Open items:

- whether Yandex can provide the needed route polyline/geometry cleanly;
- API/key/pricing/terms constraints relevant to a local POC;
- whether integration complexity is lower than OSRM/GraphHopper for the first Russia-focused emulator.

Working fallback expectation:

- GPX / KML / GeoJSON imported route as an important fallback for the first emulator;
- manually defined polyline as a debug fallback;
- OSRM / GraphHopper deferred until after the basic emulator works, unless Yandex proves impractical.

### 20.3 Prepared event store engine (open technical)

Product requirement: prepared, normalized data — not raw `speedcam.txt` at runtime. Storage engine is open:

- start with **SQLite + spatial index** as the intended product/Android-friendly direction; or
- start with a **normalized JSON / GeoJSON fixture**, with an explicit migration path to SQLite/GeoPackage.

Either way:

- raw `speedcam.txt` stays import-only and uncommitted;
- any committed fixture must be small, synthetic or manually curated, and safe to keep in the repo.

### 20.4 Enforcement profile defaults (open product/technical)

Working defaults:

- POC default for the first Russia-focused emulator: Russia +20 km/h;
- generic future default may be percentage-based (e.g., +5%);
- known jurisdiction overrides should be supported (e.g., Russia +20, Belarus +10);
- user custom exceptions may be supported in the future.

POC requirement:

- the emulator should expose `enforcement_tolerance_profile` as a visible config field;
- profile switching in the emulator is a "nice to have" if cheap.

### 20.5 Threshold tuning ranges (open tuning)

Starting points only — final values come from emulator experiments:

- `pass_feedback_hold_s` ≈ 4 s (acceptable range 3–5 s);
- `display_hysteresis_kmh` ≈ 1–2 km/h;
- `clear_hysteresis_kmh` ≈ 2–3 km/h;
- `alpha_smoothing_ms` ≈ 500–1000 ms;
- deceleration profile values from §9 (smooth 1.0, normal 1.5, strong 2.5, emergency 3.4 m/s²);
- reaction-time defaults from §9 (ordinary 2.0 s, high-speed 2.5 s, optional UI margin 1.0 s);
- per-type lookahead caps and minimum display distances as guardrails for §9.

### 20.6 Validation lifecycle (out of POC V1 scope, open future)

User/community validation is **out of scope** for POC V1 and must not become a first-version implementation requirement.

Keep only data-model extensibility:

- reserve schema fields for future validation/confirmation lifecycle (see §14.5);
- do not implement validation prompts;
- do not implement accounts, moderation, sync, or community validation;
- do not finalize confirmation heuristics now.

Earlier brainstorm ideas (e.g., "≥ 5 confirmations and last confirmation not older than 3 months") are future product notes only, not POC V1 hard requirements.

### 20.7 `TYPE=106` corridor mode (open product)

`TYPE=106` is excluded by default (§7.4). A later experiment may include `TYPE=106` only as a "railway-like danger candidate" in known/familiar regions / corridor mode. The exact policy and corridor definition are open.

---

## 21. Future / post-POC ideas

Captured here so they are not confused with POC V1 working decisions:

- **Standalone Android prototype** (Phase 1).
- **Android overlay** on top of an existing navigator (Phase 2), once behavior is validated.
- **`provisional_limit` mode**, when reliable road-segment speed truth is available (e.g., OSM `maxspeed`, sign validity / cancellation / settlement-boundary / intersection rules).
- **Vertical layout** as an additional UI option.
- **Broader event-type set** — pedestrian crossings, dangerous turns, bad road, dangerous intersections.
- **Broader camera-type set** — average-speed camera, red-light camera, mobile camera — only if/when point-event semantics can safely be unified or extended.
- **Community / user validation lifecycle** — user-added events, lightweight confirmations / rejections, freshness/expiry, prompting policy. Schema reserves fields for this; UI does not implement it in POC V1.
- **Server-side spatial database** for aggregation, validation, moderation, and sync.
- **Real GPS source** in a real-device prototype (the simulated, manually controlled speed of POC V1 is replaced by real device telemetry).

---

## 22. Current working POC V1 summary

POC V1 is a compact anticipatory road-understanding assistant validated first in an **interactive web route emulator**, with:

- one always-visible current-speed indicator (left circle), driven by a continuously recomputed required-deceleration urgency model;
- one primary upcoming event sign (middle circle), selected by route order with route-path applicability;
- one optional secondary chained event sign (right circle), shown by the same dynamic action-horizon model under the conservative "current speed continues" assumption;
- Datakam/OpenSpeedcam-based candidate events, prepared into a normalized local geo-indexed event store before runtime;
- dynamic preview / action-horizon thresholds (not fixed distance only);
- two active speed-reference modes (`unknown`, `approach_target`) plus a temporary `pass_feedback_hold` visual state;
- `provisional_limit` preserved as a deferred future concept, with `recent_passed_speed_candidate` stored as context only;
- pass-feedback tiers and a camera-risk variant that use `enforcement_tolerance` only for severity / `unsafe_likely` / camera-risk thresholds;
- horizontal layout only;
- no claim of legal correctness, no navigator behavior, no anti-radar behavior, no overlay of any third-party app in this phase.

**Core product idea:**

> RoadAhead POC V1 helps the driver understand not just the current speed,
> but whether the current speed is appropriate for what is coming next.

---

## 23. Process / next planning step

This document is **WIP**, not Canon, and not an implementation plan.

After review of this revised WIP spec, the deliberate next steps are:

1. Decide which parts are stable enough to promote to Canon (e.g., the staged validation path, the route-provider boundary, the `provisional_limit` deferral, the `enforcement_tolerance` separation rule).
2. Capture stable decisions as ADR-style decision records under `docs/decisions/` when (and only when) they are ready.
3. Update issue **#17** with accepted decisions.
4. Only after that, slice technical execution and create implementation issues.

This PR does not perform any of the above. It only updates the WIP spec.

---

## 24. Related research / repo context

Supporting research and context for this WIP spec:

- [`docs/research/datakam-speedcam-format-and-route-qa.md`](../../research/datakam-speedcam-format-and-route-qa.md) — Datakam speedcam format notes and route QA.
- [`docs/research/datakam-manual-visual-validation.md`](../../research/datakam-manual-visual-validation.md) — manual visual validation of Datakam candidate points.
- [`docs/research/datakam-manual-qa-status-semantics.md`](../../research/datakam-manual-qa-status-semantics.md) — QA status semantics for the manual validation workflow.
- [`docs/research/datakam-road-bump-direction-semantics.md`](../../research/datakam-road-bump-direction-semantics.md) — direction semantics audit for `road_bump` entries.
- [`docs/research/driver-helper-gibdd-camera-map-source-review.md`](../../research/driver-helper-gibdd-camera-map-source-review.md) — Driver Helper / GIBDD camera map source review.
- [`docs/research/osm-road-metadata-source-review.md`](../../research/osm-road-metadata-source-review.md) — OSM road metadata source review.
- [`web/datakam-viewer/`](../../../web/datakam-viewer/) — local Datakam QA viewer tool.
- Companion decision/input workbook: [`roadahead-poc-v1-initial-product-decisions-workbook.md`](roadahead-poc-v1-initial-product-decisions-workbook.md).
