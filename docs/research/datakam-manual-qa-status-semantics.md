# Datakam manual QA status semantics

## Status

Research / WIP note for the local Datakam QA Viewer.

This note defines lightweight manual QA statuses for individual Datakam/OpenSpeedcam candidate rows.

This is **not Canon** and does not define trusted product road-event data.

## Scope

The statuses in this note apply to Datakam/OpenSpeedcam rows treated as `ExternalObservation` candidates.

They are intended for small manual visual checks of representative points, especially along familiar routes such as Yaroslavl-Moscow.

They are not statistical validation, field verification, or product-ready driver-facing confirmation UX.

## Visual QA status

`unknown`

No visual judgement has been recorded.

`looks_correct`

The candidate object appears plausible during visual inspection. This can mean that the marker is near a remembered sign, camera, road bump, railway crossing-like hazard, or other expected road object.

This does not mean the object is verified.

`wrong`

The candidate object appears wrong during visual inspection. Examples: the type looks incorrect, the location is clearly off, or the object appears absent where the source claims it exists.

`needs_drive`

Visual inspection is insufficient. The point should be checked during a future drive or with better evidence.

`missing_here`

Reserved for a later manual marker workflow where the user records that a known object is missing from the source near this area.

For the current viewer slice, this value can exist as a status option, but it is not yet a full missing-point capture workflow.

## Direction-semantics status

`unknown`

No interpretation has been recorded.

`likely_vehicle_travel_direction`

The source `DIRECTION` value appears to represent the direction of vehicle travel for which the observation applies.

`likely_camera_or_sign_facing_direction`

The source `DIRECTION` value appears to represent the direction the camera or sign is facing, not necessarily the direction of applicable vehicle travel.

`opposite_of_vehicle_direction`

The source `DIRECTION` value appears to be opposite of the applicable vehicle travel direction.

`unclear_or_wrong`

The source direction is unclear, inconsistent, or appears wrong.

## Manual QA findings from inspected points

These findings are based on manual inspection of many Datakam candidate points along the Yaroslavl-Moscow corridor. They are source-level manual QA evidence, not globally proven Canon.

### Finding 1 — DIRECTION semantics

Across many inspected points, the source `DIRECTION` field strongly appears to represent the direction the sign or camera is facing — i.e. generally toward the approaching vehicle — and is therefore approximately opposite to the vehicle's travel direction.

Formula: if `DIRECTION` is the facing direction, the applicable vehicle travel direction is approximately `(DIRECTION + 180) mod 360`.

This pattern is now strongly suspected from inspected examples but remains unproven globally. Every point should still be individually evaluated using the direction-semantics status field. Do not automatically invert `DIRECTION` in code until this is more broadly confirmed.

### Finding 2 — TYPE=101 speed regime

`TYPE=101 / speed_limit` in inspected examples includes both ordinary speed-limit signs and settlement entry/exit signs that imply a default speed regime (e.g. 60 km/h). The source type should therefore be read as a **speed-regime candidate**, not as a guarantee of a literal standalone speed-limit-sign object.

### Finding 3 — Road bump overlapping markers

For `TYPE=102 / road_bump` points, bidirectional arrows (`DIRTYPE=2`) are visually expected and appear correct. Multiple rows may share the same coordinates, causing markers to visually overlap. This is a known viewer display limitation but is not required to fix in the current QA workflow. It is a possible future viewer improvement.

## Direction-semantics observation note

Based on manual inspection of many points along the Yaroslavl-Moscow route, the source `DIRECTION` field is strongly suspected to represent the direction the camera or sign faces, which is generally opposite to the applicable vehicle travel direction. See "Manual QA findings" above for details and formula.

This is **not a proven global rule** — it is QA evidence from a limited geographic sample. Every point should be evaluated individually using the direction-semantics status field. Do not assume this pattern holds globally without further validation.

The per-marker popup in the viewer includes a hint reflecting this observation.

## Direction-arrow display

The viewer visualizes raw source direction fields only:

- `DIRTYPE=1` displays one arrow using `DIRECTION`.
- `DIRTYPE=2` displays two opposite arrows using `DIRECTION` and `DIRECTION + 180°`.

The arrows represent raw `DIRECTION` values from the source file — they visualize the **sign/camera facing direction candidate**, not confirmed vehicle travel direction. Based on QA findings, vehicle travel direction is likely approximately `(DIRECTION + 180) mod 360`. The arrows are provided to help the user compare source direction against road geometry and known objects.

## Data posture

Manual QA records exported by the viewer should be read as:

```text
Datakam/OpenSpeedcam row
  -> ExternalObservation candidate
  -> manual visual QA note
  -> future field/manual review
  -> VerifiedRoadEvent only after explicit promotion in a later workflow
```

Do not use these statuses to automatically promote external rows to `VerifiedRoadEvent`.

## Persistence

For the current implementation, manual QA records are local to the browser:

- saved in `localStorage` under key `roadahead.datakamViewer.manualQa.v1`;
- exportable as JSON via the Export QA JSON button in the sidebar;
- records persist across page reloads; reopening the same marker after reload shows previously saved selections;
- not synced;
- not committed with raw source data.

Raw Datakam files remain local and ignored by git.

## Default view

The viewer defaults to showing only points inside the Moscow-Yaroslavl ellipse on load. The "Show all parsed points" option is available but not the default, to avoid rendering tens of thousands of points globally at startup.
