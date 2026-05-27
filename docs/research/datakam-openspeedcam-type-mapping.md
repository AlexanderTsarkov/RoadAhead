# Datakam / OpenSpeedcam TYPE Code Mapping

**Status:** Stage 2 WIP source mapping — not Product Canon.

This document records the raw Datakam/OpenSpeedcam TYPE code mapping used for Stage 2 emulator work. It was first implemented and manually checked in the Datakam QA viewer (`web/datakam-viewer`). It is not Product Canon, not legal truth, and not safety-certified data.

Canon authority: `docs/product/areas/event-data/event-data.md`

---

## Raw format

```
IDX,X,Y,TYPE,SPEED,DIRTYPE,DIRECTION
```

Field semantics:

| Field     | Meaning                                                                 |
|-----------|-------------------------------------------------------------------------|
| IDX       | Row index (integer)                                                     |
| X         | **Longitude** (decimal degrees, WGS84) — note: X = longitude, not latitude |
| Y         | **Latitude** (decimal degrees, WGS84) — note: Y = latitude             |
| TYPE      | Integer type code (see mapping below)                                   |
| SPEED     | Advisory speed value in km/h; 0 means not applicable                   |
| DIRTYPE   | Direction type: 0 = all directions, 1 = one direction, 2 = both directions |
| DIRECTION | Direction in degrees (see semantics note below)                         |

Lines starting with `//` are comments and are skipped. The header row (`IDX,X,Y,...`) may optionally include a trailing `//` comment.

---

## TYPE code mapping (12-code WIP mapping)

This mapping is the canonical Stage 2 source mapping. The machine-readable version lives in `data/config/datakam-type-mapping.json`.

| raw TYPE | Source label            | Emulator normalized type | Notes                                                                                                          |
|----------|-------------------------|--------------------------|----------------------------------------------------------------------------------------------------------------|
| 1        | static_camera           | static_camera            | Fixed point speed/enforcement camera.                                                                          |
| 2        | traffic_light_camera    | static_camera            | Traffic-light camera. Mapped to static_camera for POC V1 scope.                                               |
| 3        | red_light_camera        | static_camera            | Red-light camera. Mapped to static_camera for POC V1 scope.                                                   |
| 4        | average_speed_camera    | static_camera            | Average-speed (section) camera. Mapped to static_camera for POC V1 scope.                                     |
| 5        | mobile_camera           | static_camera            | Mobile speed camera. Mapped to static_camera for POC V1 scope.                                                 |
| 100      | pedestrian_crossing     | road_bump                | Pedestrian crossing. Mapped to road_bump (hazard category) for POC V1 scope.                                  |
| 101      | speed_limit             | speed_limit              | See QA observation below.                                                                                      |
| 102      | speed_bump              | road_bump                | Speed bump / road bump. See QA observation below.                                                              |
| 103      | bad_road                | road_bump                | Bad road / road surface hazard. Mapped to road_bump (hazard category).                                        |
| 104      | dangerous_turn          | road_bump                | Dangerous turn / curve. Mapped to road_bump (hazard category).                                                 |
| 105      | dangerous_intersection  | road_bump                | Dangerous intersection. Mapped to road_bump (hazard category).                                                 |
| 106      | other_danger            | road_bump                | Other danger. See QA observation below. Mapped to road_bump (hazard category).                                |

**Emulator normalized type scope (POC V1):** `speed_limit` | `static_camera` | `road_bump` | `unknown`

The `source_type_label` field in each prepared event record preserves the source-level label (e.g. `dangerous_turn`, `speed_bump`) so the distinction is not lost even when the normalized type is the same category.

---

## Display and debug rule for source_type_label

Because several Datakam/OpenSpeedcam source labels collapse into the same broader RoadAhead/emulator normalized category (for example `speed_bump`, `bad_road`, `dangerous_turn`, and `other_danger` all normalize to `road_bump`), displaying only the normalized `type` would hide the source-specific meaning.

**Rule: `source_type_label` is the primary human-readable label for prepared Datakam/OpenSpeedcam events.**

All map markers, popups, legends, and debug tables that display Datakam/OpenSpeedcam prepared events must follow this display order:

1. `source_type_label` — primary label; shows the source-specific meaning (e.g. `dangerous_turn`, `speed_bump`, `other_danger`)
2. `raw_type` — raw integer code from the CSV; always visible for debugging
3. normalized `type` — coarse RoadAhead/emulator category (`road_bump`, `static_camera`, `speed_limit`, `unknown`); shown as context, not as the primary label

**Example:** an event with `raw_type=104`, `source_type_label="dangerous_turn"`, `type="road_bump"` must be labeled in debug UI as `dangerous_turn (raw: 104, norm: road_bump)` — not simply `road_bump`.

**Example:** an event with `raw_type=106`, `source_type_label="other_danger"`, `type="road_bump"` must show `other_danger (raw: 106, norm: road_bump)` — not `road_bump`, which would erase the railway-crossing evidence.

This rule applies to:
- future emulator map marker popups (when markers are added in a later stage)
- debug tables in the Route/Data panel or event inspector
- any export or snapshot that lists prepared events

This rule does **not** change applicability, suppression, or driver-facing display logic — the normalized `type` remains the field used for those decisions. The display rule is for operator/QA visibility only.

---

## Owner / manual QA observations

These are manual observations from earlier QA work on Datakam candidate data along the Yaroslavl–Moscow and Rostov corridors. They are source-level WIP evidence, not Canon.

### TYPE=101 — speed_limit

In manually inspected examples, TYPE=101 includes both ordinary speed-limit signs and settlement signs that imply a default speed regime (e.g. 60 km/h on entering a settlement). Treat as a speed-regime candidate, not necessarily a literal standalone speed-limit-sign object.

The `SPEED` field, when non-zero, provides the candidate advisory speed value.

### TYPE=102 — speed_bump

TYPE=102 rows with `DIRTYPE=2` (bidirectional direction arrows) are expected and appear correct — road bumps span both travel directions. Multiple rows at the same coordinates are a known display artefact; no fix is planned for the QA workflow.

### TYPE=106 — other_danger

In at least one manual QA observation, TYPE=106 appeared at a location that looked like a railway crossing. The source label `other_danger` is preserved. Railway crossing is a documented observed subtype/example. Other subtypes may exist.

---

## DIRECTION field semantics (WIP)

`DIRECTION` appears to represent the **sign or camera facing direction** rather than vehicle travel direction.

Across many manually checked points, the `DIRECTION` value was approximately opposite to the expected vehicle travel direction at the same location.

**Candidate formula:** vehicle travel direction ≈ `(DIRECTION + 180) mod 360`

This is WIP source-semantics evidence only. It has not been proven globally. Individual points should be interpreted per-point. Do not treat this formula as Canon.

`DIRTYPE` values:
- `0` — applies to all directions
- `1` — one-directional (one `DIRECTION` arrow in the QA viewer)
- `2` — bidirectional (two opposite arrows in the QA viewer)

### Stage 2 emulator implementation (Issue #99 follow-up)

**Owner/manual QA confirmed** the source direction convention for the Rostov1 route: `DIRECTION` is where the sign or camera is **facing** (generally toward approaching vehicles). It is not the vehicle travel direction for which the event applies.

The Stage 2 emulator (`web/roadahead-emulator`) now implements this convention in the prepared route event adapter (`src/emulator/routeEventAdapter.ts`):

```
source_facing_direction_deg = RouteEvent.direction_deg       (raw DIRECTION from dataset)
applicable_vehicle_travel_direction_deg = (source_facing_direction_deg + 180) % 360
```

The **effective vehicle travel direction** is passed to the existing `directionCompatibility.ts` evaluator as `PreparedEvent.source_direction_deg`. The **raw facing direction** is preserved in `PreparedEvent.route_raw_facing_direction_deg` for debug display only.

This convention applies **only to adapted route events** (Datakam/OpenSpeedcam prepared datasets). Synthetic fixture `PreparedEvent`s used for scenario testing are **not affected**.

Debug visibility: marker popups show both values:
- `facing dir (src)` — raw `DIRECTION` value from the dataset
- `travel dir (eff.)` — computed `(DIRECTION + 180) % 360` used by the evaluator

**WIP — NOT Product Canon.** This is source-semantics handling based on manual QA observation. It has not been globally verified across all route segments and event types. Do not promote to Canon without a wider systematic verification.

Manual QA observation that motivated this fix: a `dangerous_turn` event before a curve was incorrectly suppressed by the direction compatibility check, while a later `dangerous_turn` near/after the same curve was selected. This pattern is consistent with the evaluator comparing the route heading directly against the source-facing direction (which is approximately 180° opposite to the travel heading). After applying the `(DIRECTION + 180) % 360` inversion, the before-curve event is no longer suppressed solely by the direction mismatch.

---

## Stage 2 mapping history

The earlier Datakam QA viewer (`web/datakam-viewer`) contained the full 12-code mapping because it was needed for visual QA. The Stage 2 extractor introduced in Issue #93 used a partial conservative mapping:

```
101 → static_camera   (incorrect; should be speed_limit)
102 → speed_limit     (incorrect; should be road_bump / speed_bump)
104 → road_bump       (correct normalized type, but source label was not preserved)
all other codes → unknown
```

This caused the majority of Rostov1 events to appear as `unknown`. Issue #95 centralizes the mapping and aligns the extractor with the canonical 12-code table.

---

## Raw data policy

- Raw `speedcam.txt` files remain **local only** and are gitignored (`data/raw/`).
- Prepared bounded route-scoped outputs (e.g. `Rostov1.events.json`) may be committed only when explicitly generated for emulator use and explicitly approved.
- Every prepared output file must have `source.raw_source_committed = false`.

---

## Machine-readable canonical mapping

`data/config/datakam-type-mapping.json` — JSON file used by the Stage 2 extractor script (`web/roadahead-emulator/scripts/prepareRouteEvents.mjs`) at preparation time.

Both the Datakam QA viewer (`web/datakam-viewer/src/parseSpeedcam.ts`) and the emulator runtime (`web/roadahead-emulator/src/contracts/openSpeedcamTypeMap.ts`) must stay aligned with this canonical table. Any revision to the mapping must be reflected in all three locations.

---

## Related research and references

- `docs/research/datakam-manual-qa-status-semantics.md` — manual QA status semantics
- `docs/research/datakam-manual-visual-validation.md` — manual visual validation findings
- `docs/research/datakam-road-bump-direction-semantics.md` — road bump direction semantics
- `docs/research/datakam-speedcam-format-and-route-qa.md` — format notes and route QA
- `docs/product/areas/event-data/event-data.md` — Canon event data policy
- `docs/product/areas/product-boundary/product-boundary.md` — Canon product boundary
