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
