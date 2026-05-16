---
status: Product Specs WIP
canon: false
source: Google Doc working draft
purpose: Baseline POC V1 concept for review
context: Datakam QA viewer / RoadAhead overlay assistant
---

# RoadAhead POC V1 — Three-Circle Anticipatory Speed Assistant

> **WIP — Not Canon.**
> This document is a working draft. It captures a baseline POC V1 concept for discussion and review.
> Product decisions here are not final and have not been promoted to Canon.

---

## 1. Purpose

RoadAhead POC V1 is a compact anticipatory driving assistant based primarily on Datakam/OpenSpeedcam candidate data.

The goal is to test whether a minimal overlay-style interface can help the driver understand upcoming road events early enough to react smoothly — without requiring a full navigation app or route engine — and potentially by overlaying this information on top of existing navigation software.

POC V1 is **overlay-style**. It:

- does not replace a navigator;
- does not require a route engine;
- does not require a map UI;
- uses Datakam/OpenSpeedcam candidate data as its primary event source.

POC V1 is not intended to prove legal correctness of speed limits, replace a navigator, or create a verified production road-event database.

**Primary question:**

> Does a compact 3-element anticipatory UI help the driver understand what speed-related or caution-related action is needed next?

---

## 2. POC V1 Implementation Assumptions

POC V1 is assumed to be an overlay-style assistant. It may run above existing navigation apps during testing, but it must not depend on routing, map rendering, or replacing the navigator.

Initial implementation assumptions:

- Android overlay or overlay-like prototype is the likely target.
- No route engine.
- No map UI required.
- Event selection is based on current GPS position, movement direction, Datakam candidate points, and approximate direction semantics.
- Datakam source data may be preprocessed into a local subset for the familiar test corridor.
- The first test route is expected to be a familiar Moscow–Yaroslavl / Yaroslavl–Moscow corridor.

---

## 3. Core UI Concept

The main UI consists of up to three circular visual elements.

When all three are visible, they represent:

1. current speed / current speed conformity;
2. primary upcoming event;
3. secondary chained event.

The circles may be arranged:

- horizontally left-to-right;
- or vertically bottom-to-top in a future layout option.

For POC V1, horizontal layout is the preferred default.

Each later event circle is visually "behind" the previous one:

- partial overlap;
- smaller size when farther away;
- more transparency when farther away;
- full size and full opacity when the event requires action.

This creates a visual perspective of events approaching along the road.

---

## 4. UI Elements

### 4.1 Left circle — current speed indicator

The left circle is always visible.

It shows:

- current vehicle speed;
- whether that speed is acceptable, risky, or too high relative to the current speed reference.

The left circle is **not merely a speedometer**. It is a behavioral indicator:

> Am I currently driving at a speed that makes sense for what is happening now or what is about to happen?

#### Left circle visual states

##### Idle / unknown reference

Used when the system does not currently know a reliable speed reference.

Visual:

- white circle;
- black or neutral border;
- current speed shown;
- no strong warning state.

Meaning: current speed is shown, but RoadAhead is not claiming whether it is correct.

##### Provisional current limit mode

Used after passing a recent speed-limit event.

Visual:

- current speed shown;
- ring/border indicates relation to the provisional speed limit.

Meaning: RoadAhead temporarily assumes the recently passed speed-limit candidate is active.

##### Active approach mode

Used when an upcoming event requires action.

Visual:

- current speed shown;
- red border/ring becomes visible;
- red ring transparency decreases (ring becomes more prominent) as required deceleration becomes more urgent;
- strong red state (blinking/flashing) if the vehicle is unlikely to reach the target speed comfortably.

Meaning: the driver should already be adapting speed for the upcoming event.

##### Pass feedback mode

Used immediately after passing an event too fast.

Visual options:

- red flash;
- short pulse;
- full red state for a short time;
- special camera-risk feedback for cameras.

Meaning: the vehicle passed the event faster than the target speed.

For cameras, this may be interpreted as: **Possible camera risk** — not "confirmed violation" or "confirmed fine".

---

### 4.2 Middle circle — primary upcoming event

The middle circle represents the next relevant upcoming event. It visually resembles a road sign.

It shows:

- event target speed or advisory speed;
- event type symbol;
- distance to event when active;
- size and opacity based on distance and urgency.

Examples of event type symbols:

- `speed_limit` — typical speed limit road sign;
- `static_camera` — speed limit with camera symbol under limit numbers;
- `road_bump` — single bump symbol under limit numbers;
- `other_danger` (railway-like) — railway symbol under limit numbers;
- potentially other hazard types later.

#### Middle circle stages

##### Hidden

No event is relevant enough to show.

##### Preview

The event is known ahead but does not yet require action.

Visual:

- smaller size — starting at approximately ½ of the current speed circle size;
- partial transparency;
- no distance label or a very subtle distance label.

The idea is to represent perspective: the current speed circle is close (full size); the upcoming event starts smaller and less visible, and grows/becomes more visible as the car approaches.

Meaning: there is something ahead, but no immediate action is required yet.

##### Active

The event requires driver reaction.

Visual:

- full size;
- full opacity;
- distance label shown;
- left circle switches to active approach mode.

Meaning: the driver should now adapt speed for this event.

---

### 4.3 Right circle — secondary chained event

The right circle represents the next event after the primary upcoming event, but only when it matters for current planning.

It is shown when a chain of events is close enough that the driver should understand the sequence early.

Example:

```
60 sign ahead
then camera shortly after
then road_bump / 20 shortly after
```

Purpose: avoid sudden information switching after the first event.

The right circle uses the same visual language as the middle circle:

- smaller/farther appearance when less urgent — starting at approximately ⅓ of the current speed circle size;
- full display only if it becomes important.

---

## 5. Visual Design Principles

The UI should imitate the visual language of road signs rather than invent an unrelated icon system.

Principles:

- circular sign-like elements;
- red border for speed/warning relevance;
- recognizable symbols for event types;
- distance plate under active event sign;
- size and transparency encode urgency/distance;
- overlapping circles encode event sequence and perspective.

The UI must remain compact enough for overlay use.

The UI must not behave like a full map.

---

## 6. Event Classes

POC V1 separates events into two broad classes.

### 6.1 Speed-regime events

These events can temporarily define the current speed reference after passing.

Initial POC example: Datakam `TYPE=101` (`speed_limit`).

These may include:

- ordinary speed-limit signs;
- settlement speed-regime points (e.g., 60 km/h inside settlements).

**Important:** Datakam `TYPE=101` is treated as a **speed-regime candidate**, not necessarily a literal speed-limit sign.

### 6.2 Local target / hazard events

These events have a target or advisory speed at the event point, but do not define the continuing speed regime after passing.

Initial POC examples:

- `static_camera`;
- `road_bump`;
- `other_danger` (railway-crossing-like candidate only — see event types).

After passing these events, they must not automatically become the current speed limit.

Example:

```
road_bump  SPEED=20
```

Means: target/advisory speed at the bump is 20.
Does **not** mean: the road after the bump is now limited to 20.

---

## 7. POC V1 Event Types

POC V1 should not try to support every Datakam type.

Initial included types:

1. `speed_limit`
2. `static_camera` — initial camera scope; other camera types are deferred unless trivial to support with the same logic
3. `road_bump`
4. `other_danger` — only as a railway-crossing-like candidate, where manually familiar or visually plausible; `TYPE=106` must **not** be globally renamed to "railway crossing"

Potentially included later:

- dangerous turn;
- bad road;
- pedestrian crossing;
- average-speed zone;
- red-light camera;
- mobile camera;
- dangerous intersection.

Reason to defer these:

- semantics may be less clear;
- target speed may be ambiguous;
- too many types may obscure the core UX test.

---

## 8. Speed Reference Model

POC V1 needs a speed reference model because Datakam provides point events, not full speed-limit segments.

The system must not pretend it always knows the current legal speed.

### 8.1 Speed reference states

#### Unknown

The system does not currently know a valid speed reference.

Left circle shows current speed only.

#### Provisional limit

After passing a `speed_limit` event, the system temporarily treats that speed as the current speed reference.

Example:

```
Passed speed_limit 60
provisional current limit = 60
valid for ~60 seconds (simple TTL)
```

For POC V1, a simple TTL is acceptable. Initial proposal: provisional limit valid for approximately 60 seconds after passing the sign.

After TTL expires: speed reference returns to unknown.

#### Approach target

When an upcoming event becomes active, the speed reference temporarily becomes the target speed trajectory needed to pass that event correctly.

Example:

```
current speed = 90
upcoming event = speed_limit 60 in 250 m
left circle evaluates whether current speed allows comfortable approach to 60
```

---

## 9. Target Speed

For POC V1, Datakam `SPEED` is used as the target/advisory speed for the event.

Examples observed:

- `road_bump` often has `SPEED=20`;
- railway-crossing-like events may have `SPEED=30`;
- dangerous turn may have `SPEED=90`;
- speed-limit event uses its source speed value.

**Important limitation:** Datakam `SPEED` is useful for POC behavior, but it is **not** treated as legally verified truth.

---

## 10. Active Approach Logic

When an upcoming event becomes active, the system should evaluate whether the current speed is appropriate for reaching the event target speed.

Inputs:

- current speed;
- event target speed;
- distance to event;
- event type;
- simple comfort/deceleration thresholds.

The left circle's red ring represents urgency:

- barely visible / high transparency: event is active, but current speed is still manageable;
- more visible red ring: driver should reduce speed soon;
- strong red state: required braking is becoming too sharp;
- flashing red ring: passing at the target speed is not possible without extreme deceleration;
- pass feedback: event was passed above target speed.

The first POC does not need a perfect braking model. It needs a consistent, simple model sufficient to test the UI concept.

---

## 11. Event Display Stages

Each event can be in one of these stages.

### 11.1 Hidden

Event is too far or not relevant enough.

### 11.2 Preview

Event is relevant but does not yet require action.

Visual:

- smaller circle;
- more transparent;
- no distance plate.

### 11.3 Active

Event requires driver action.

Visual:

- full-size circle;
- no transparency;
- distance plate visible;
- left speed indicator switches to approach mode.

### 11.4 Passed / handoff

Event has just been passed.

System may:

- show brief pass feedback;
- update provisional current limit if event is a speed-regime event;
- hand off to the next event in the chain.

---

## 12. Event Selection Without Routing

For POC V1, RoadAhead does not know the planned route.

Upcoming events should be selected from nearby Datakam candidates using:

- current GPS position;
- recent movement direction;
- candidate coordinates;
- approximate Datakam direction semantics;
- maximum lookahead distance;
- event priority.

This is sufficient for familiar corridor testing, but it is **not** a general navigation or routing solution.

Distance-to-event may be approximate in POC V1. It can initially use straight-line distance or a simple along-track approximation based on current movement direction rather than routed path distance.

Relevant event candidates should be filtered by approximate applicability to the current vehicle direction. See section 13 for Datakam direction semantics.

---

## 13. Chain Logic

The third circle appears when the next event after the primary event is close enough to matter now.

Purpose: the driver should not be surprised by a second event immediately after the first.

Examples:

```
speed_limit 60
then camera 60 shortly after
```

```
speed_limit 60
then road_bump 20 shortly after
```

POC V1 can use a simple chain rule:

> Show secondary event if it occurs within a fixed chain distance/time window after the primary event.

Exact thresholds can be tuned later.

---

## 14. Datakam Direction Semantics

Current Datakam QA findings suggest:

> `DIRECTION` likely means where the sign/camera faces — usually opposite to vehicle travel direction.

Therefore, the approximate applicable vehicle travel direction is:

```
(DIRECTION + 180) mod 360
```

This is a **strong source-level observation**, not globally proven truth.

POC V1 should use this carefully when deciding whether an event applies to the current vehicle direction.

---

## 15. Data Source Policy

POC V1 is based primarily on Datakam/OpenSpeedcam candidate data.

Datakam is treated as:

> **ExternalObservation candidate data** — not VerifiedRoadEvent truth.

POC V1 may use Datakam data to test the interaction concept, but the system must not claim legal correctness.

---

## 16. OSM Role in POC V1

OSM is useful for future improvement but should **not** be central to POC V1.

There is **no runtime OSM dependency in POC V1**.

Potential future OSM use cases:

- road geometry;
- segment-level `maxspeed`;
- railway crossing validation;
- future comparison layer.

For POC V1: use provisional TTL after speed-limit events instead.

Future improvement: use OSM `maxspeed` / road metadata to improve current speed reference after passing signs — but this is deferred.

---

## 17. Explicit Non-Goals for POC V1

POC V1 does not solve:

- full legal speed-limit validity;
- end-of-settlement signs;
- intersections cancelling restrictions;
- distance plates / zone-of-validity signs;
- full route engine;
- Android production implementation;
- backend, accounts, or sync;
- verified RoadEvent database;
- OSM production integration;
- automatic promotion of external data to truth;
- support for every Datakam event type;
- perfect braking model.

---

## 18. Success Criteria

POC V1 is successful if it helps answer:

1. Does the 3-circle UI communicate upcoming events clearly?
2. Is preview vs. active warning understandable?
3. Does the left speed indicator help the driver understand whether speed is appropriate?
4. Is chain awareness useful?
5. Is Datakam good enough to test the concept on familiar routes?
6. Does the interface feel calmer and more anticipatory than existing navigator warnings?

---

## 19. Open Questions

1. What exact distance thresholds should define preview and active stages?
2. Should thresholds differ by event type?
3. How long should provisional speed limits remain active after passing?
4. Should provisional validity be time-based, distance-based, or both?
5. What is the best visual treatment for pass feedback?
6. How should camera-risk feedback differ from general too-fast feedback?
7. Should horizontal layout be the only POC layout?
8. Which Datakam camera types should be included in POC V1?
9. How should the app handle conflicting nearby events?
10. Should railway-like `TYPE=106` be included immediately or after more validation?

---

## 20. Next Planning Step

The open questions above need to be classified before implementation begins. This PR establishes the WIP baseline only — no answers are required here.

Suggested classification for a follow-up issue:

**A — Must answer before implementation:**

- Q1: preview/active distance thresholds (needed to implement event stages)
- Q2: whether thresholds differ by type (affects event stage logic)
- Q8: which camera types are in scope (affects data filtering)
- Q9: how to handle conflicting nearby events (affects event selection logic)

**B — Can tune during POC:**

- Q3 / Q4: provisional speed limit duration and mode (TTL ~60s is a reasonable starting point)
- Q5: pass feedback visual treatment
- Q6: camera-risk feedback distinction
- Q10: `TYPE=106` railway-like inclusion (can start excluded, add after field observation)

**C — Defer to V2:**

- Q7: layout options beyond horizontal

---

## 21. Current Working POC V1 Summary

POC V1 should be a compact overlay-style assistant with:

- one always-visible current speed indicator;
- one primary upcoming event sign;
- one optional secondary chained event sign;
- Datakam-based event candidates;
- simple preview / active / passed stages;
- simple provisional current speed reference;
- simple approach-speed urgency indicator;
- no claim of verified legal truth.

**Core product idea:**

> RoadAhead POC V1 helps the driver understand not just the current speed,
> but whether the current speed is appropriate for what is coming next.

---

## 22. Related Research / Repo Context

The following files in this repo provide supporting research and context for this spec:

- [`docs/research/datakam-speedcam-format-and-route-qa.md`](../../research/datakam-speedcam-format-and-route-qa.md) — Datakam speedcam format notes and route QA
- [`docs/research/datakam-manual-visual-validation.md`](../../research/datakam-manual-visual-validation.md) — Manual visual validation of Datakam candidate points
- [`docs/research/datakam-manual-qa-status-semantics.md`](../../research/datakam-manual-qa-status-semantics.md) — QA status semantics for manual validation workflow
- [`docs/research/datakam-road-bump-direction-semantics.md`](../../research/datakam-road-bump-direction-semantics.md) — Direction semantics audit for `road_bump` entries
- [`docs/research/osm-road-metadata-source-review.md`](../../research/osm-road-metadata-source-review.md) — OSM road metadata source review
- [`web/datakam-viewer/`](../../../web/datakam-viewer/) — Local Datakam QA viewer tool
